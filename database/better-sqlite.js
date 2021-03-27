import Database from 'better-sqlite3';
import { dirname } from "path";
import { existsSync, mkdir } from 'fs';

const weakDBMap = new WeakMap();

//TODO: cluster for sync read operation

class SQLMap {
  constructor(sqliteInstance, tableName, options = {}) {
    this.sqlDatabase = sqliteInstance;
    this.name = tableName;

    const cacheEnabled = "cache" in options ? Boolean(options.cache) : true;

    this.cacheMap = (
      cacheEnabled
      ? new Map()
      : new class extends Map {
        has () { return false; }
        set () { return void 0; }
        delete () { return void 0; }
      }
    );

    setInterval(() => {
      const dateNow = Date.now();
      const oneHour = 1000 * 60 * 60;
      this.cacheMap.entries(({key, value: result}) => {
        const accessPerHour = result.count * oneHour / (dateNow - result.created)
        if(accessPerHour < 3) {
          this.cacheMap.delete(key);
        }
      })
    }, 1000 * 60 * 60 * 6).unref(); // every 6 hours
  }

  close () {
    this.cacheMap = null;
    this.sqlDatabase = null;
  }

  getSize () {
    const db = weakDBMap.get(this.sqlDatabase);

    return db.prepare(`SELECT COUNT(id) FROM ${this.name}`).get();
  }

  has(id) {
    if(this.cacheMap.has(id))
      return true;

    const db = weakDBMap.get(this.sqlDatabase);

    const exists = db.prepare(
        `SELECT EXISTS(SELECT 1 FROM ${this.name} WHERE id = ? LIMIT 1);`
    ).get(id)

    return Boolean(
      exists[Object.keys(exists)[0]]
    );
  }
  
  get(id) {
    if(this.cacheMap.has(id)) {
      const result = this.cacheMap.get(id);
      result.count++;
      return result.value;
    }

    const db = weakDBMap.get(this.sqlDatabase);

    const { value } = db.prepare(`SELECT value FROM ${this.name} WHERE id = ?`).get(id);

    try {
      const bigintPattern = /^[0-9]+n$/
      return (
        JSON.parse(
          value, 
          (key, value) => {
            if(typeof(value) === "string") {
              if(bigintPattern.test(value))
                return BigInt(value.slice(0, value.length - 1));
              if(value === "Infinity")
                return Infinity;
            }
            return value;
          }
        )
      );
    } catch (err) {
      const error = new Error(
        `Error while parsing value ${value} for id ${id}`
      );
      error.original = err;
      error.stack = [
        error.stack.split('\n').slice(0, 2).join('\n'),
        err.stack
      ].join("\n");
      throw error;
    }
  }

  set(id, value) {
    this.cacheMap.set(id, {
      value,
      count: 0,
      created: Date.now()
    });

    const db = weakDBMap.get(this.sqlDatabase);

    db.prepare(
      `INSERT INTO ${this.name} (id, value) VALUES (?, json(?))`
        +' ON CONFLICT(id) DO UPDATE SET value=excluded.value;'
    ).run(
      id,
      JSON.stringify(
        value,
        (key, value) => {
          if(typeof value === 'bigint')
            return value.toString().concat("n");
          else if (typeof value === 'number' && !isFinite(value))
            return "Infinity";
          else return value;
        }
      ) || null 
    )

    return ;
  }
  
  delete(id) {
    this.cacheMap.delete(id);

    const db = weakDBMap.get(this.sqlDatabase);

    db.prepare(
      `DELETE FROM ${this.name} WHERE id = ?`
    ).run(id);

    return ;
  }

  clear() {
    const db = weakDBMap.get(this.sqlDatabase);
    this.cacheMap.clear();
    //TODO
  }

  [Symbol.iterator] () {
    return this.entries();
  }

  * keys () {
    const db = weakDBMap.get(this.sqlDatabase);

    const statement = db.prepare(`SELECT id FROM ${this.name}`);

    for (const { id } of statement.iterator()) {
      yield id;
    }
  }

  * values () {
    const db = weakDBMap.get(this.sqlDatabase);

    const statement = db.prepare(`SELECT value FROM ${this.name}`);

    for (const { value } of statement.iterator()) {
      yield value;
    }
  }

  * entries () {
    const db = weakDBMap.get(this.sqlDatabase);

    const statement = db.prepare(`SELECT * FROM ${this.name}`);

    for (const { id, value } of statement.iterate()) {
      yield [id, value];
    }
  }

  forEach (callback, thisArg) {
    for (const [key, value] of this[Symbol.iterator]()) {
      callback.apply(thisArg, [value, key, this]);
    };
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
    if (!this.location.path.startsWith(":") && !existsSync(this.location.dir)) {
      await new Promise((resolve, reject) => {
        mkdir(
          this.location.dir,
          { recursive: true },
          err => err ? reject(err) : resolve()
        )
      });
    }

    let db = new Database(this.location.path);

    weakDBMap.set(this, db);

    return this;
  }

  async teardown() {
    weakDBMap.get(this).close();
    weakDBMap.delete(this);
    this.tables.forEach(t => t.close());
  }

  // https://github.com/mapbox/node-sqlite3/issues/40
  async getMap(mapName, options) {
    const db = weakDBMap.get(this);

    mapName = mapName.replace(
      /\s|[;'"\|\(\)\{\}\[\]\\\/:<>\*\^\%\$\#\=\-\`\~]/gi,
      "_"
    ); // dumb

    db.prepare(
      `CREATE TABLE IF NOT EXISTS ${mapName} `
      + "(id varchar(36) PRIMARY KEY UNIQUE, value TEXT)"
      + " WITHOUT ROWID"
    ).run();

    const map = new SQLMap(this, mapName, options);

    this.tables.push(map);

    return map;
  }

  async backup (destination) {
    return weakDBMap.get(this).backup(destination);
  }
}

export default SQLite;