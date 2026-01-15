# Seabreeze - Agent Guidelines

## Commands
- **Build**: `npm run start` (Expo dev server) - DO NOT start without explicit user request
- **Android**: `npm run android` (Run on Android device/emulator)
- **iOS**: `npm run ios` (Run on iOS device/simulator)
- **Web**: `npm run web` (Run in web browser)
- **Lint**: `npm run lint` (ESLint with expo config)
- **Type Check**: `npm run typecheck` (TypeScript strict mode)
- **Database**: `npm run db:generate` (Generate database schema), `npm run db:push` (Push schema changes), `npm run db:studio` (Open Drizzle Studio)

## Code Style
- **Framework**: React Native 0.81.4 with Expo Router ~6.0.7
- **Language**: TypeScript 5.9.2 with strict mode enabled
- **React**: 19.1.0 with functional components and hooks
- **Imports**: Use `@/*` path aliases (configured in tsconfig.json), group external imports first, then internal
- **Components**: Functional components with TypeScript interfaces for props
- **State**: React hooks (useState, useCallback, useMemo, useRef), Zustand ^5.0.9 for global state
- **Database**: Drizzle ORM ^0.44.5 with SQLite (expo-sqlite ~16.0.10)
- **Storage**: expo-secure-store ~15.0.8 for secure data storage
- **AI Integration**: 
  - Vercel AI SDK ^5.0.0-beta.34
  - Apple Intelligence via @react-native-ai/apple ^0.5.0
  - OpenRouter via @openrouter/ai-sdk-provider ^1.2.0
  - Ollama via ollama-ai-provider-v2 ^1.3.1
- **Navigation**: React Navigation ^7.1.6 with bottom tabs ^7.3.10
- **Lists**: @shopify/flash-list 2.0.2 for performant lists, @legendapp/list ^2.0.8 for advanced features
- **Animation**: @legendapp/motion ^2.3.0 for animations, react-native-reanimated ~4.1.0 for complex animations
- **Markdown**: react-native-marked ^7.0.2 and react-native-remark ^1.0.5 for markdown rendering
- **UI Components**: @expo/ui ~0.2.0-beta.3, expo-glass-effect ~0.1.4 for glassmorphism
- **Web**: react-native-web ^0.21.0 and react-native-webview 13.15.0 for web content
- **Styling**: React Native StyleSheet objects, inline styles for simple cases
- **Error Handling**: Try-catch blocks with user-friendly error messages
- **Naming**: camelCase for variables/functions, PascalCase for components/types

## Key Dependencies & Versions
- **Expo SDK**: ^54.0.0
- **React Native**: 0.81.4
- **TypeScript**: 5.9.2 (strict mode)
- **Drizzle Kit**: ^0.31.4 (for database migrations)

## Architecture
- App routing via Expo Router in `app/` directory
- Custom hooks in `hooks/` for reusable logic
- Database schema in `db/schema.ts` with migrations in `drizzle/`
- Utility types and test data in `util/`
- iOS native code in `ios/` with Xcode project
- Glassmorphism effects via expo-glass-effect

## Directory Structure
- `app/` - Expo Router pages and layouts (chat/, settings/)
- `hooks/` - Custom React hooks (useChat.ts, useDatabase.ts)
- `db/` - Database schema and configuration
- `drizzle/` - Database migrations and metadata
- `util/` - Utility functions and types (testdata.ts, types.ts)
- `assets/` - Images, fonts, and static assets (fonts/, images/)
- `ios/` - iOS-specific configuration and Xcode project
- `.vscode/` - VS Code settings and configuration

When you need to search docs, use `context7` tools.
