import { Database } from "sqlite3";

interface MapConstructOptions {
  cache: boolean
}

class SQLMap {
  private constructor(sql: SQLite, db: Database, tableName: string, options: MapConstructOptions);
  close(): void;
  async getSize(): number;
  async has(id: string): boolean;
  async get(id: string): boolean;
  async set(id: string): boolean;
  async delete(id: string): boolean;
  async clear(id: string): boolean;

  [Symbol.iterator](): AsyncIterator;
  async * keys (): AsyncIterator;
  async * values (): AsyncIterator;
  async * entries (): AsyncIterator;
  async forEach (
    callback: ((value: any, key: string, map: SQLMap) => void),
    thisArg?: {}
  ) : void;
}

export declare class SQLite {
  constructor(location: string);
  async init(): SQLite;
  async teardown(): void;
  async getMap(name: string, options: MapConstructOptions): SQLMap
}