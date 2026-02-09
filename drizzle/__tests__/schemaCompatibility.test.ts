import { describe, expect, it } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";

interface MigrationJournal {
  entries: Array<{
    tag: string;
  }>;
}

interface SchemaSnapshot {
  tables: {
    chat?: {
      columns: Record<
        string,
        {
          type: string;
          notNull: boolean;
        }
      >;
      indexes: Record<string, { columns: string[] }>;
    };
  };
}

const drizzleDir = path.resolve(__dirname, "..");
const metaDir = path.resolve(drizzleDir, "meta");

const destructivePatterns = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\s+chat\b/i,
  /\bALTER\s+TABLE\s+chat\s+RENAME\s+TO\b/i,
  /\bALTER\s+TABLE\s+chat\s+DROP\b/i,
];

const additivePatterns = [
  /^CREATE\s+TABLE\b/i,
  /^CREATE\s+(UNIQUE\s+)?INDEX\b/i,
  /^ALTER\s+TABLE\b.*\bADD\s+COLUMN\b/i,
  /^PRAGMA\b/i,
];

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

describe("schema compatibility migrations", () => {
  it("keeps all migration SQL additive-only", () => {
    const journalPath = path.resolve(metaDir, "_journal.json");
    const journal = readJsonFile<MigrationJournal>(journalPath);

    for (const entry of journal.entries) {
      const sqlPath = path.resolve(drizzleDir, `${entry.tag}.sql`);
      const sql = fs.readFileSync(sqlPath, "utf8");
      const statements = sql
        .split(/-->\s*statement-breakpoint/gi)
        .flatMap((chunk) => chunk.split(";"))
        .map((statement) => statement.trim())
        .filter(Boolean);

      for (const statement of statements) {
        const isDestructive = destructivePatterns.some((pattern) => pattern.test(statement));
        const isAdditive = additivePatterns.some((pattern) => pattern.test(statement));

        expect(isDestructive).toBe(false);
        expect(isAdditive).toBe(true);
      }
    }
  });

  it("preserves legacy chat columns and supports post-upgrade reads", () => {
    const legacySnapshotPath = path.resolve(metaDir, "0000_snapshot.json");
    const currentSnapshotPath = path.resolve(metaDir, "0001_snapshot.json");

    const legacySnapshot = readJsonFile<SchemaSnapshot>(legacySnapshotPath);
    const currentSnapshot = readJsonFile<SchemaSnapshot>(currentSnapshotPath);

    const legacyChat = legacySnapshot.tables.chat;
    const currentChat = currentSnapshot.tables.chat;

    expect(legacyChat).toBeDefined();
    expect(currentChat).toBeDefined();

    if (!legacyChat || !currentChat) {
      return;
    }

    const legacyColumns = Object.entries(legacyChat.columns);
    for (const [name, definition] of legacyColumns) {
      const currentDefinition = currentChat.columns[name];

      expect(currentDefinition).toBeDefined();
      expect(currentDefinition.type).toBe(definition.type);
      expect(currentDefinition.notNull).toBe(definition.notNull);
    }

    expect(currentChat.indexes.chat_updated_at_idx.columns).toEqual(["updatedAt"]);
    expect(currentChat.indexes.chat_provider_id_idx.columns).toEqual(["providerId"]);
  });
});
