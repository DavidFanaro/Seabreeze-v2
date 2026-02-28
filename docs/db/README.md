# Database Documentation

This section covers database architecture, schema, and persistence patterns in Seabreeze.

## Overview

Seabreeze uses Drizzle ORM with SQLite (via expo-sqlite) for local chat persistence. The database stores complete chat conversations including messages, metadata, and provider configuration.

## Contents

- [Database Architecture](./database-architecture.md) - Schema design, migration strategy, and persistence patterns

## Related

- [Architecture Overview](../architecture/README.md)
- [State Management](../state/README.md)
- [Hooks - useDatabase](../hooks/README.md)
