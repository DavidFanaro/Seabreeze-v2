import { int, sqliteTable } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("setting", {
  id: int().primaryKey({ autoIncrement: true }),
});
