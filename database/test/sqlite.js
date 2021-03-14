import SQLite3 from "../sqlite.js";
import UUID from "./uuid.js";
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { deepStrictEqual, ok, strictEqual } from "assert";

const __dirname = dirname(fileURLToPath(import.meta.url));

const data = {
  "object": [
    {
      "article_reaction_counts": [
        {
            "category": "like",
            "count": 5
        },
        {
            "category": "readinglist",
            "count": Infinity
        },
        {
            "category": "unicorn",
            "count": 1212n
        }
      ]
    },
    // new WeakMap()
  ],
  "number": [
    123, -2323, 0, Infinity
  ],
  "string": [
    "[]", "{}", "[", "}}}"
  ],
  "boolean": [
    true, false
  ],
  "bigint": [
    1212n,
    2389359345466456n
  ],
  "null": [
    null
  ],
  // not supported ↓
  "function":[
    // () => void 0,
    // async () => void 0,
    // async function * () { console.info(arguments) },
  ],
  "undefined": [
    // undefined
  ],
  "symbol": [
    // Symbol("xxx")
  ]
};

describe("sqlite3", () => {
  const db = new SQLite3(join(__dirname, "./test.tmp.db"));
  // const db = new SQLite3(":memory:");
  const uuid = new UUID().toString;

  before(db.init.bind(db));
  after(db.teardown.bind(db));
  process.once("beforeExit", db.teardown.bind(db));

  it("create & retrieve", async () => {
    const map = await db.getMap("test", { cache: false });

    await Promise.all(
      Object
        .keys(data)
        .map(type => {
          if(!type.length)
            return xit(`${type}`);
          return (
            Promise.allSettled(
              data[type].map(async value => {
                const id = uuid();
                await map.set(id, value);
                const result = await map.get(id);
  
                try {
                  switch (typeof value) {
                    case "function": /* fall through */
                    case "object":
                      deepStrictEqual(result, value);
                      break;
                    default:
                      strictEqual(result, value);
                      break;
                  }
                } catch(err) {
                  err.type = type;
                  err.value = value;
                  throw err;
                }
  
                return {
                  type,
                  value
                };
              })
            )
          );
        })
    ).then(types => {
      const errors = []
      for (const results of types) {
        for (const result of results) {
          const logs = [];
          if(result.status === "rejected")  {
            errors.push(`${result.reason.type} - ${result.reason.value}`);
            errors.push("\x1b[31mfailed with\x1b[0m\n\t");
            errors.push(result.reason.stack.replace(/\n/g, "\n\t "));
          } else {
            logs.push(`    ${result.value.type} - ${result.value.value}`);
            logs.push("succeeded.");
          }
          console.info.apply(
            void 0,
            logs.length
            ? logs
            : [
              "\x1b[31m",
              `   ${result.reason.type} - ${result.reason.value}`,
              "failed.",
              "\x1b[0m"
            ]
          );
        }
      }
      if(errors.length)
        throw new Error(errors.join(" "));
    });
  });

  it("basic injection", async () => {
    const injection = await db.getMap("(DROP TABLE test)");
    await injection.set(uuid(), "(aa); DROP TABLE test;");

    ok((await db.getMap("test")).getSize());
  });

  it("on conflict update", async () => {
    const map = await db.getMap("test");
    const id = uuid();
    await map.set(id, "will be overridden");
    await map.set(id, "allied nations");
    strictEqual(await map.get(id), "allied nations");
  });

  it("iteration", async () => {
    const result = [[], []]
    for await (const [key, value] of (await db.getMap("test")).entries()) {
      result[0].push(`${key} ${value}`);
    }

    await (await db.getMap("test")).forEach((value, key) => result[1].push(`${key} ${value}`));

    deepStrictEqual(result[0], result[1]);
  });

  it("#has", async () => {
    const map = await db.getMap("test-prototype", { cache: false });
    const id = 1;
    const value = 1;
    await map.set(id, value);

    strictEqual(await map.has(id), true);
    strictEqual(await map.has(id + 1), false);
  });

  it("#delete", async () => {
    const map = await db.getMap("test-prototype", { cache: false });
    const id = 1;
    const value = 1;
    await map.set(id, value);

    strictEqual(await map.has(id), true);
    await map.delete(id);
    strictEqual(await map.has(id), false);
  });
});