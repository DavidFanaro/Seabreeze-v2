/**
 * @file db/schema.ts
 * @purpose Database schema definitions for Seabreeze chat application using Drizzle ORM and SQLite.
 */

import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { ProviderId } from "@/types/provider.types";

/**
 * =============================================================================
 * DATABASE LAYOUT OVERVIEW
 * =============================================================================
 * 
 * This schema defines the core data structure for the Seabreeze chat application.
 * 
 * Tables:
 * └── chat: Stores individual chat conversations and their metadata
 * 
 * Data Storage:
 * - SQLite as the primary database engine via expo-sqlite
 * - JSON columns for complex data structures (messages, metadata)
 * - Timestamps for audit trails and sorting
 * - Enum constraints for provider validation
 * 
 * Key Relationships:
 * - Each chat is associated with exactly one AI provider
 * - Messages are stored as a JSON array within each chat record
 * - Provider-specific metadata is stored as JSON for flexibility
 * =============================================================================
 */

/**
 * Chat table - Core storage for user conversations
 * 
 * Purpose: Stores complete chat sessions including messages, metadata, and provider information.
 * 
 * Index Strategy:
 * - Primary key on id for direct record access
 * - Consider adding indexes on createdAt for chronological sorting
 * - Consider adding indexes on providerId for provider-based queries
 * 
 * Data Notes:
 * - messages stored as JSON array of message objects with role/content structure
 * - providerMetadata stores provider-specific configuration (tokens, settings, etc.)
 * - Timestamps use Unix epoch format for SQLite compatibility
 */
export const chat = sqliteTable("chat", {
    /** Primary identifier - Auto-incrementing integer for unique chat records */
    id: int().primaryKey({ autoIncrement: true }),
    
    /** User-facing title - Displayed in chat list, can be null initially */
    title: text(),
    
    /** Message history - JSON array containing all messages in the conversation */
    messages: text({ mode: "json" }).notNull(),
    
    /** AI provider used - Enum constraint ensures valid provider selection */
    providerId: text({ enum: ["apple", "openai", "openrouter", "ollama"] }).$type<ProviderId>().notNull(),
    
    /** Model identifier - Specific model name/version used for the conversation */
    modelId: text().notNull(),
    
    /** Provider-specific data - JSON object with provider configuration and metadata */
    providerMetadata: text({ mode: "json" }).notNull(),
    
    /** Creation timestamp - When the chat was first created (Unix epoch) */
    createdAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    
    /** Last update timestamp - When the chat was last modified (Unix epoch) */
    updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
