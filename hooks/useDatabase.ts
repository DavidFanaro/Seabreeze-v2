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
 * - Initialize SQLite database connection with proper configuration
 * - Set up Drizzle ORM with schema definitions
 * - Run database migrations on startup
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
 * 2. Synchronous Migration: Migrations run synchronously on import to ensure
 *    the database schema is always up-to-date before any operations occur.
 * 
 * 3. Change Listeners: Enabled for future reactive UI updates when chat
 *    data changes (potential integration with React Query or state management).
 * 
 * 4. Type Safety: Full TypeScript integration with Drizzle schema for
 *    compile-time type checking and IntelliSense support.
 */

// =============================================================================
// IMPORTS & DEPENDENCIES
// =============================================================================

import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "../drizzle/migrations";
import * as schema from "../db/schema";

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Database name used for SQLite file storage */
export const dbname = "seabreeze";

// =============================================================================
// DATABASE INITIALIZATION
// =============================================================================

/**
 * SQLite Database Connection
 * 
 * Creates a synchronous connection to the SQLite database using expo-sqlite.
 * The database file will be stored in the app's documents directory.
 * 
 * Configuration:
 * - enableChangeListener: true - Allows subscription to database change events
 *   for reactive UI updates and cache invalidation
 * 
 * Performance Notes:
 * - Synchronous connection ensures database is ready before any operations
 * - Single connection reused across the application for efficiency
 * - SQLite handles concurrent operations through internal locking
 */
const expoDb = openDatabaseSync(dbname, {
  enableChangeListener: true,
});

/**
 * Drizzle ORM Instance
 * 
 * Wraps the SQLite connection with Drizzle ORM providing:
 * - Type-safe query building with auto-completion
 * - Schema validation and constraints
 * - Migration management
 * - Query optimization and prepared statements
 * 
 * The schema object imports all table definitions from db/schema.ts,
 * enabling full type safety for all database operations.
 */
const db = drizzle(expoDb, { schema });

/**
 * Database Migration
 * 
 * Automatically runs pending migrations on application startup to ensure
 * the database schema matches the current code expectations.
 * 
 * Migration Process:
 * 1. Scans drizzle/migrations directory for migration files
 * 2. Tracks applied migrations in __drizzle_migrations table
 * 3. Executes only pending migrations in order
 * 4. Updates migration tracking table on success
 * 
 * Error Handling:
 * - Migration failures will throw and prevent app startup
 * - This ensures database consistency before any data operations
 * - Manual intervention required for migration conflicts
 */
migrate(db, migrations);

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
export default function useDatabase() {
  return db;
}
