import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { ProviderId } from "@/lib/types/provider-types";

export const chat = sqliteTable("chat", {
    id: int().primaryKey({ autoIncrement: true }),
    title: text(),
    messages: text({ mode: "json" }),
    providerId: text({ enum: ["apple", "openai", "openrouter", "ollama"] }).$type<ProviderId>(),
    modelId: text(),
    providerMetadata: text({ mode: "json" }),
    createdAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
    updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
});
