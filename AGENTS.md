# Seabreeze - Agent Guidelines

## Commands
- **Build**: `npm run start` (Expo dev server) - DO NOT start without explicit user request
- **Lint**: `npm run lint` (ESLint with expo config)
- **Test**: No test framework configured - check with user before adding tests
- **Type Check**: `npx tsc --noEmit` (TypeScript strict mode)

## Code Style
- **Framework**: React Native with Expo Router
- **Language**: TypeScript with strict mode enabled
- **Imports**: Use `@/*` path aliases, group external imports first, then internal
- **Components**: Functional components with TypeScript interfaces for props
- **State**: React hooks (useState, useCallback, useMemo, useRef)
- **Database**: Drizzle ORM with SQLite
- **AI Integration**: Vercel AI SDK with Apple Intelligence and OpenRouter providers
- **Styling**: React Native StyleSheet objects, inline styles for simple cases
- **Error Handling**: Try-catch blocks with user-friendly error messages
- **Naming**: camelCase for variables/functions, PascalCase for components/types

## Architecture
- App routing via Expo Router in `app/` directory
- Custom hooks in `hooks/` for reusable logic
- Database schema in `db/schema.ts`
- Utility types in `util/types.ts`
- Use GlassView component for glassmorphism effects

## Directory Structure
- `app/` - Expo Router pages and layouts
- `hooks/` - Custom React hooks
- `db/` - Database schema and configuration
- `util/` - Utility functions and types
- `assets/` - Images, fonts, and static assets
- `ios/` - iOS-specific configuration and code
- `drizzle/` - Database migrations and metadata