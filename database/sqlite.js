import sqlite3 from 'sqlite3';
import { dirname, resolve } from "path";
import { existsSync, mkdir } from 'fs';

const weakDBMap = new WeakMap();
sqlite3.verbose();

class SQLMap {
  constructor(sql, db, tableName) {
    weakDBMap.set(this, db);
    this.sql = sql;
    this.name = tableName;

    this.cacheMap = new Map(); // not persisted

    setInterval(() => {
      const dateNow = Date.now();
      const oneHour = 1000 * 60 * 60;
      this.cacheMap.entries(({key, value: result}) => {
        const accessPerHour = result.count * oneHour / (dateNow - result.created)
        if(accessPerHour < 3) {
          this.cacheMap.delete(key);
        }
      })
    }, 1000 * 60 * 60 * 6); // every 6 hours
  }

  close () {
    this.cacheMap = null;
    this.sql = null;
    weakDBMap.delete(this);
  }

  async getSize () {
    const db = weakDBMap.get(this);

    return new Promise((resolve, reject) => 
      db.get(
        `SELECT COUNT(id) FROM ${this.name}`,
        (err, size) => err ? reject(err) : resolve(size)
      )
    )
  }

  async has(id) {
    if(this.cacheMap.has(id))
      return true;

    const db = weakDBMap.get(this);

    return new Promise((resolve, reject) => {
      db.get(
        `SELECT EXISTS(SELECT 1 FROM ${this.name} WHERE id = ? LIMIT 1);`,
        [ id ],
        (err, exists) => err ? reject(err) : resolve(Boolean(exists))
      );
    });
  }
  
  async get(id) {
    if(this.cacheMap.has(id)) {
      const result = this.cacheMap.get(id);
      result.count++;
      return result.value;
    }

    const db = weakDBMap.get(this);

    return new Promise((resolve, reject) => {
      db.get(
        `SELECT value FROM ${this.name} WHERE id = ?`,
        [ id ],
        async (err, { value }) => {
          if(err)
            return reject(err)

          try {
            resolve(JSON.parse(value))
          } catch (err) {
            const error = new Error(
              `Error while parsing value ${(await import("util")).inspect(value)} for id ${id}`
            );
            error.original = err;
            error.stack = [
              error.stack.split('\n').slice(0, 2).join('\n'),
              err.stack
            ].join("\n");
            throw error;
          }
        }
      );
    });
  }

  async set(id, value) {
    this.cacheMap.set(id, {
      value,
      count: 0,
      created: Date.now()
    });

    const db = weakDBMap.get(this);

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO ${this.name} (id, value) VALUES (?, json(?))`
        +' ON CONFLICT(id) DO UPDATE SET value=excluded.value;',
        [ id, JSON.stringify(value) || null ],
        err => err ? reject(err) : resolve()
      );
    });
  }
  
  async delete(id) {
    this.cacheMap.delete(id, {
      value,
      count: 0,
      created: Date.now()
    });

    const db = weakDBMap.get(this);

    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM ${this.name} WHERE id = ?`,
        [ id ],
        err => err ? reject(err) : resolve()
      );
    });
  }

  async clear() {
    const db = weakDBMap.get(this);
    this.cacheMap.clear();
    //TODO
  }

  [Symbol.iterator] () {
    return this.entries;
  }

  async * keys () {
    const db = weakDBMap.get(this);

    const statement = (
      db.prepare(
        `SELECT id FROM ${this.name}`,
        err => { if(err) throw err; }
      )
    );

    while(true) {
      const result = await new Promise((resolve, reject) => 
        statement.get((err, result) => err ? reject(err) : resolve(result))
      );

      if(!result) { // ended
        await new Promise((resolve, reject) => {
          statement.finalize(resolve);
        });
        break;
      } else {
        yield result.id;
      }
    };
  }

  async * values () {
    const db = weakDBMap.get(this);

    const statement = (
      db.prepare(
        `SELECT value FROM ${this.name}`,
        err => { if(err) throw err; }
      )
    );

    while(true) {
      const result = await new Promise((resolve, reject) => 
        statement.get((err, result) => err ? reject(err) : resolve(result))
      );

      if(!result) { // ended
        await new Promise((resolve, reject) => {
          statement.finalize(resolve);
        });
        break;
      } else {
        yield result.value;
      }
    };
  }

  async * entries () {
    const db = weakDBMap.get(this);

    const statement = (
      db.prepare(
        `SELECT * FROM ${this.name}`,
        err => { if(err) throw err; }
      )
    );

    while(true) {
      const result = await new Promise((resolve, reject) => 
        statement.get((err, row) => err ? reject(err) : resolve(row))
      );

      if(!result) { // ended
        await new Promise((resolve, reject) => {
          statement.finalize(resolve);
        });
        break;
      } else {
        yield [
          result.id,
          result.value
        ];
      }
    };
  }

  async forEach (callback, thisArg) {
    const db = weakDBMap.get(this);

    return new Promise((resolve, reject) => {
      db.each(
        `SELECT * FROM ${this.name}`,
        (err, row) => err ? reject(err) : callback.apply(thisArg, [row.value, row.id, this]),
        (err, rowsNumber) => err ? reject(err) : resolve(rowsNumber)
      );
    })
  }
}

/**
 * 
 */

class SQLite {
  tables = [];
  constructor(location) {
    this.location = {
      path: location,
      dir: dirname(location)
    };
  }

  async init() {
    if (!existsSync(this.location.dir)) {
      await new Promise((resolve, reject) => {
        mkdir(
          this.location.dir,
          { recursive: true },
          err => err ? reject(err) : resolve()
        )
      });
    }

    let db = null;

    await new Promise((resolve, reject) => {
      db = new sqlite3.cached.Database(
        this.location.path,
        err => err ? reject(err) : resolve()
      );
    });

    weakDBMap.set(this, {
      constructor: sqlite3,
      db: db,
      database: db
    });

    return this;
  }

  async teardown() {
    return new Promise((resolve, reject) => {
      weakDBMap.get(this).db.close(err => err ? reject(err) : resolve());
      weakDBMap.delete(this);
      this.tables.forEach(t => t.close());
    });
  }

  // https://github.com/mapbox/node-sqlite3/issues/40
  async getMap(mapName) {
    const db = weakDBMap.get(this).db;

    mapName = mapName.replace(
      /\s|[;'"\|\(\)\{\}\[\]\\\/:<>\*\^\%\$\#\=\-\`\~]/gi,
      "_"
    ); // dumb

    await new Promise((resolve, reject) => {
      db.run(
        `CREATE TABLE IF NOT EXISTS ${mapName} `
        + "(id varchar(36) PRIMARY KEY UNIQUE, value TEXT)"
        + " WITHOUT ROWID",
        (err, result) => err ? reject(err) : resolve(result)
      );
    });

    const map = new SQLMap(this, db, mapName);

    this.tables.push(map);

    return map;
  }
}

export default SQLite;


function promisify (func, thisArg, ...argv) {
  return new Promise((resolve, reject) => {
    argv.push(err => err ? reject(err) : resolve())
    func.apply(thisArg, argv)
  })
}