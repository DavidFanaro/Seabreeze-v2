# Database Architecture

## Purpose

The database layer provides persistent storage for chat conversations using Drizzle ORM with SQLite. It ensures chat data survives app restarts and supports offline functionality.

## Concepts

### Schema Design

- **Single table approach**: The `chat` table stores all conversation data
- **JSON columns**: Messages, thinking output, and provider metadata stored as JSON for flexibility
- **Unix timestamps**: All dates use Unix epoch format for SQLite compatibility
- **Enum constraints**: Provider ID uses TypeScript enum for compile-time validation

### Migration Strategy

- Drizzle migrations stored in `drizzle/migrations.js`
- Migration metadata in `drizzle/meta/` with snapshot JSON files
- Schema version tracking via journal entries
- Migrations must run before any screen renders (Database Gate pattern)

### Persistence Patterns

- **Checkpoint saves**: Every 15 seconds during active streams, then every 10s
- **Delete locks**: Prevents race conditions when deleting chats during saves
- **Queue coordination**: Ensures ordering of concurrent persistence operations

## File Map

| File | Purpose |
|------|---------|
| `db/schema.ts` | Drizzle table definitions for chat storage |
| `db/schema.test.ts` | Schema validation and compatibility tests |
| `drizzle.config.ts` | Drizzle CLI configuration |
| `drizzle/migrations.js` | Generated migration files |
| `drizzle/meta/*.json` | Migration metadata and snapshots |
| `drizzle/*.sql` | Raw SQL migrations |

## Flow

### Chat Save Flow

1. User sends message → streaming begins
2. Stream lifecycle triggers checkpoint timer (15s)
3. On checkpoint: `runChatOperation()` queues the save
4. Queue ensures ordering: only one save per chat at a time
5. On stream completion: final save with all messages

### Chat Load Flow

1. App starts → Database Gate runs migrations
2. `useDatabase` hook initializes connection
3. Chat list queries ordered by `updatedAt` descending
4. On chat selection: full message history loaded

### Delete Flow

1. User deletes chat → `acquireChatDeleteLock()` called
2. Lock prevents new saves to that chat
3. Wait for in-flight saves to complete
4. Delete from SQLite → release lock

## Examples

### Querying Chats

```typescript
import { db } from "@/hooks/useDatabase";
import { chat } from "@/db/schema";

const chats = await db.select().from(chat).orderBy(desc(chat.updatedAt));
```

### Creating a Chat

```typescript
import { db } from "@/hooks/useDatabase";
import { chat } from "@/db/schema";

await db.insert(chat).values({
  title: "New Chat",
  messages: [],
  thinkingOutput: [],
  providerId: "apple",
  modelId: "apple-default",
  providerMetadata: {},
});
```

## Gotchas

- **Migration failures**: Schema changes require regeneration and re-push
- **JSON column limits**: Large message histories may impact performance
- **Delete race conditions**: Always acquire delete lock before removing
- **Hydration timing**: Database must be ready before Zustand stores hydrate

## Change Guide

### Adding a New Column

1. Update `db/schema.ts` with new column definition
2. Run `npm run db:generate` to create migration
3. Run `npm run db:push` to apply to SQLite
4. Update types if needed in `types/`

### Adding a New Table

1. Define table in `db/schema.ts`
2. Create migration: `npm run db:generate`
3. Push schema: `npm run db:push`
4. Add query helpers in appropriate hook (e.g., `useDatabase`)
5. Update documentation

### Performance Optimization

- Add indexes for frequently queried columns (see `db/schema.ts:80-83`)
- Consider pagination for large chat lists
- Monitor JSON column size for very long conversations
