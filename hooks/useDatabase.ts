/**
 * @file hooks/useDatabase.ts
 * @purpose Database connection hook providing Drizzle ORM instance for SQLite operations.
 * 
 * =============================================================================
 * HOOK OVERVIEW
 * =============================================================================
 * 
 * This hook serves as the single entry point for all database operations in the
 * Seabreeze chat application. It encapsulates the Drizzle ORM setup with SQLite
 * through expo-sqlite, providing a type-safe database client for all data
 * operations.
 * 
 * Key Responsibilities:
 * - Access SQLite database connection from the SQLiteProvider
 * - Set up Drizzle ORM with schema definitions
 * - Provide consistent database instance across the application
 * - Enable real-time change notifications for reactive updates
 * 
 * =============================================================================
 * ARCHITECTURE DECISIONS
 * =============================================================================
 * 
 * 1. Singleton Pattern: The database instance is created once at module level
 *    and shared across all hook invocations, ensuring connection efficiency
 *    and preventing multiple database connections.
 * 
 * 2. Provider-backed Connection: The hook relies on SQLiteProvider context
 *    to ensure a single, configured connection is used throughout the app.
 * 
 * 3. Change Listeners: Enabled via SQLiteProvider configuration for reactive
 *    UI updates when chat data changes.
 * 
 * 4. Type Safety: Full TypeScript integration with Drizzle schema for
 *    compile-time type checking and IntelliSense support.
 */

// =============================================================================
// IMPORTS & DEPENDENCIES
// =============================================================================

import { drizzle } from "drizzle-orm/expo-sqlite";
import { useSQLiteContext } from "expo-sqlite";

import * as schema from "@/db/schema";

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Database name used for SQLite file storage */
export const dbname = "seabreeze-v2";

// =============================================================================
// DATABASE INITIALIZATION
// =============================================================================

type SQLiteClient = ReturnType<typeof useSQLiteContext>;

let cachedClient: SQLiteClient | null = null;
let cachedDb: ReturnType<typeof drizzle> | null = null;

// =============================================================================
// HOOK EXPORT
// =============================================================================

/**
 * useDatabase Hook
 * 
 * @returns {DrizzleD1Database<typeof schema>} Configured Drizzle database instance
 * 
 * Purpose:
 * Provides a React hook interface for accessing the database instance.
 * While the database is initialized at module level, this hook follows
 * React patterns and allows for future enhancements like:
 * - Connection state monitoring
 * - Error boundary integration
 * - Database health checks
 * - Performance metrics collection
 * 
 * Usage Pattern:
 * ```typescript
 * const db = useDatabase();
 * const chats = await db.select().from(schema.chat);
 * ```
 * 
 * Type Safety:
 * Returns fully typed database instance with IntelliSense support
 * for all tables, columns, and operations defined in the schema.
 * 
 * Performance:
 * Zero-overhead hook - returns the same database instance on every call
 * to maintain connection efficiency while following React patterns.
 */
export default function useDatabase(): ReturnType<typeof drizzle> {
  const expoDb = useSQLiteContext();

  if (!cachedDb || cachedClient !== expoDb) {
    cachedClient = expoDb;
    cachedDb = drizzle(expoDb, { schema });
  }

  if (!cachedDb) {
    throw new Error("Database initialization failed.");
  }

  return cachedDb;
}
