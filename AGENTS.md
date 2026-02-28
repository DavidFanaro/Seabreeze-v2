# Seabreeze Agent Guide

Expo + React Native AI chat application supporting Apple Intelligence, OpenAI,
OpenRouter, and Ollama providers.

## Repo Rules
- No Cursor or Copilot rule files were found.
- Do not start `expo start` without explicit user request.
- When using the in-app chat feature, use the Apple provider/model only unless
  explicitly instructed otherwise.

## Important notes
- check if there is a currently opened dev server and ios simulator. if not then start one. BUT ONLY IF ONE IS NOT ALREADY RUNNING
- when building any UI use the `frontend-design` skill and use `agent-device` skill the verify your work
- when interacting with ai sdk use the `ai-sdk` skill

## Commands

### Development
- `npm run start` - Expo dev server (ask before running).
- `npm run ios` - Build + run on iOS simulator/device.
- `npm run android` - Build + run on Android emulator/device.
- `npm run web` - Run web build in browser.

### Linting / Typecheck
- `npm run lint` - ESLint (Expo config, flat `eslint.config.js`).
- `npx tsc --noEmit` - TypeScript typecheck (strict mode).

### Tests (Jest)
- `npm test` - Jest in watch-all mode.
- `npx jest path/to/test.tsx` - Run a single test file.
- `npx jest -t "test name"` - Run tests matching a name pattern.
- `npm test -- path/to/test.tsx -t "name"` - Single file + name match.

### Database (Drizzle)
- `npm run db:generate` - Generate migrations from `db/schema.ts`.
- `npm run db:push` - Push schema changes to SQLite.
- `npm run db:studio` - Drizzle Studio UI.

## Tooling Tips
- Docs lookup: use Context7 tools when needed.
- Web info: use SearXNG tools.
- GitHub search: use `gh_grep` tools.
- iOS simulator: use `agent-device` skill.

## AWAYS TEST YOUR CHANGES IN THE SIMULATOR
- Use the `agent-device` skill to control the simulator
- Aways use the `expo start --clear` command to start the dev server
- Use the r - reload app command in the expo dev server to reload the app
- DO NOT USE npm run ios!!!!!!!!!!
