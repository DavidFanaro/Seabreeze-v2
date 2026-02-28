# Developer Setup and Contribution Workflow

This guide covers setting up the development environment and day-to-day workflows for contributing to Seabreeze.

## Prerequisites

- Node.js 20.x or later
- Xcode (for iOS development)
- Android Studio (for Android development)
- Watchman (`brew install watchman` on macOS)
- SQLite (for local database)

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Seabreeze-v2
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the project root with required API keys:

```env
# Apple Intelligence (useChat with Apple provider)
APPLE_API_KEY=your_apple_api_key

# OpenAI (fallback provider)
OPENAI_API_KEY=your_openai_api_key

# OpenRouter (fallback provider)
OPENROUTER_API_KEY=your_openrouter_api_key

# Ollama (local fallback)
OLLAMA_BASE_URL=http://localhost:11434
```

### 4. Database Setup

Generate and push the database schema:

```bash
npm run db:generate
npm run db:push
```

For local database management:

```bash
npm run db:studio
```

### 5. Install iOS Pods

```bash
cd ios && pod install && cd ..
```

## Running the Application

### Development Server

```bash
npm run start
```

For a clean start (clears cache):

```bash
npm run start -- --clear
```

### iOS Simulator

```bash
npm run ios
```

### Android Emulator

```bash
npm run android
```

### Web

```bash
npm run web
```

## Day-to-Day Contribution Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Changes

Follow the codebase conventions:
- Use existing patterns found in `hooks/`, `providers/`, `stores/`
- Follow the directory structure: `app/` (routing), `components/` (UI), `hooks/` (logic), `stores/` (state), `providers/` (AI), `lib/` (utilities), `db/` (persistence), `types/` (definitions)

### 3. Run Quality Checks

Before committing, always run:

```bash
# Linting
npm run lint

# TypeScript typecheck
npx tsc --noEmit

# Tests
npm test
```

See [lint-typecheck-test-guide.md](./lint-typecheck-test-guide.md) for detailed testing strategies.

### 4. Commit Changes

Follow conventional commit format:

```bash
git add .
git commit -m "feat: add new feature"
```

### 5. Submit Pull Request

Push your branch and create a PR through GitHub.

## Project Structure Overview

```
Seabreeze-v2/
├── app/                 # Expo Router screens and navigation
├── components/         # Reusable UI components
├── hooks/              # Custom React hooks (useChat, useChatState, etc.)
├── stores/             # Zustand state management
├── providers/          # AI provider implementations (Apple, OpenAI, etc.)
├── lib/                # Utilities and helpers
├── db/                 # Drizzle ORM schema and migrations
├── types/              # TypeScript type definitions
└── docs/               # Documentation
```

## Key Conventions

### Provider Hierarchy

The app uses this provider order:
```
GestureHandler → HeroUI → Theme → SQLite → Navigation → Query
```

### Stream Lifecycle States

State machine: `idle → streaming → completing → completed/error/cancelled`

### Provider Fallback Chain

Apple → OpenAI → OpenRouter → Ollama

## Common Tasks

### Adding a New Screen

1. Create file in `app/` directory following Expo Router conventions
2. Add navigation entry in appropriate navigator
3. Include inline comments for complex logic

### Adding a New Hook

1. Create file in `hooks/` directory
2. Follow existing hook patterns (refs for async state, sequence guards, etc.)
3. Add JSDoc comments explaining purpose, inputs, outputs, side effects

### Modifying Database Schema

1. Edit `db/schema.ts`
2. Run `npm run db:generate` to create migration
3. Run `npm run db:push` to apply changes

## Related

- [Lint, Typecheck, and Test Guide](./lint-typecheck-test-guide.md)
- [Architecture Overview](../architecture/README.md)
- [UI Documentation](../ui/README.md)
