import SQLite3 from "../sqlite.js";
import UUID from "./uuid.js";
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { deepStrictEqual } from "assert";

const __dirname = dirname(fileURLToPath(import.meta.url));

const db = new SQLite3(join(__dirname, "./test.tmp.db"))
const data = {
  "current_user": new UUID().toString(),
  "reactions": [],
  "article_reaction_counts": [
      {
          "category": "like",
          "count": 5
      },
      {
          "category": "readinglist",
          "count": 2
      },
      {
          "category": "unicorn",
          "count": 3
      }
  ]
};

(async () => {
  await db.init();
  const map = await db.getMap("test");
  map.set(data.current_user, data);
  deepStrictEqual(data, await map.get(data.current_user))
  
  const injection = await db.getMap("(DROP TABLE test)");
  injection.set(data.current_user, "(aa); DROP TABLE test;");

  

  console.log(map.name);
  for await (const [key, value] of map.entries()) {
    console.log(key, value);
  }

  console.log(injection.name);
  for await (const [key, value] of injection.entries()) {
    console.log(key, value);
  }
  
  const gracefulShutdown = async () => 
      db.teardown()
          .catch(() => {})
          .then(() => process.exit())
  ;

  process.on('SIGINT', gracefulShutdown);
  await gracefulShutdown();
})().catch(err => console.error(err))