import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("setting", {
    id: int().primaryKey({ autoIncrement: true }),
});

export const chats = sqliteTable("chat", {
    id: int().primaryKey({ autoIncrement: true }),
    title: text(),
    messages: text({ mode: "json" }),
});
