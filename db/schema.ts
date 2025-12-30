import { ModelMessage } from "ai";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const chat = sqliteTable("chat", {
    id: int().primaryKey({ autoIncrement: true }),
    title: text(),
    messages: text({ mode: "json" }),
});
