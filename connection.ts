import knex from "knex";
import { SQLITE_DB_PATH } from "./challenge-1/resources";

export const db = knex({
  client: 'sqlite3',
  connection: {
    filename: SQLITE_DB_PATH,
  },
  useNullAsDefault: true,
});
