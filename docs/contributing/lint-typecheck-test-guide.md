# Lint, Typecheck, and Test Guide

This guide covers running quality checks and test execution strategies for Seabreeze contributions.

## Running Quality Checks

### Linting

```bash
npm run lint
```

Runs ESLint with Expo's flat config (`eslint.config.js`). Checks for code quality issues and enforces the Expo configuration standards.

**Common Issues:**
- Ensure all imports are properly ordered
- Avoid unused variables
- Follow React Native best practices

### TypeScript Typecheck

```bash
npx tsc --noEmit
```

Runs TypeScript compiler in check-only mode without emitting files. Ensures type safety across the entire codebase.

**Common Issues:**
- Missing type annotations
- Incorrect interface implementations
- Import path resolution errors

### Tests

```bash
# Run all tests in watch mode
npm test

# Run a specific test file
npx jest path/to/test.tsx

# Run tests matching a name pattern
npx jest -t "test name"

# Run single file with name match
npm test -- path/to/test.tsx -t "name"
```

Uses Jest with `jest-expo` preset for Expo/React Native compatibility.

## Targeted Test Execution

When making changes, run tests relevant to the affected area:

### Provider Changes

```bash
npx jest providers --testPathPattern=providers
```

### Hook Changes

```bash
npx jest hooks --testPathPattern=hooks
```

### UI/Component Changes

```bash
npx jest components --testPathPattern=components
```

### Database Changes

```bash
npx jest db --testPathPattern=db
```

### Store Changes

```bash
npx jest stores --testPathPattern=stores
```

### Integration Tests

```bash
npx jest --testPathPattern=integration
```

## Test File Naming

- Test files should be named: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`
- Co-locate test files with the code they test
- Example: `useChat.ts` → `useChat.test.ts`

## Review Expectations

### Before Submitting PR

1. **Lint must pass** - No ESLint errors or warnings (pre-existing warnings are acceptable)
2. **Typecheck must pass** - `npx tsc --noEmit` exits with code 0
3. **Tests must pass** - Relevant tests pass; document any pre-existing failures

### Code Review Checklist

- [ ] Changes follow existing code patterns
- [ ] New code includes inline comments for complex logic
- [ ] JSDoc headers added for new hooks/functions
- [ ] Types are properly defined and used
- [ ] Error handling is appropriate
- [ ] No hardcoded secrets or API keys
- [ ] Tests added or updated for new functionality

### Documentation Review

When documentation is updated:

- [ ] Cross-links to related docs are working
- [ ] Examples are accurate and tested
- [ ] Terminology is consistent with rest of docs
- [ ] No broken images or links

## Phase Labels and Reviewer Checks

### PR Phase Labels

- `needs-review` - Awaiting reviewer assignment
- `in-review` - Active review in progress
- `needs-changes` - Review completed; author changes required
- `approved` - Ready to merge

### Reviewer Responsibilities

**For Code Changes:**
- Verify correctness of implementation
- Check for edge cases and error handling
- Ensure type safety
- Validate test coverage

**For Documentation Changes:**
- Verify accuracy of technical details
- Check cross-link validity
- Ensure consistent terminology
- Validate code examples work

**For Comment Quality:**
- Verify comments explain "why", not "what"
- Ensure comments are not redundant with code
- Check for outdated comments
- Validate JSDoc completeness

## Coverage Matrix Process

When reviewing or updating code, track:

### Files Reviewed
| File | Review Date | Reviewer | Notes |
|------|-------------|----------|-------|
| (track each file) | | | |

### Documentation Updated
| Doc File | Update Date | Author | Changes |
|----------|-------------|--------|---------|
| (track each doc) | | | |

### Comments Added/Updated
| File | Lines | Purpose |
|------|-------|---------|
| (track each comment) | | |

## Pre-existing Test Failures

Some tests may have pre-existing failures unrelated to your changes. Document any failures you encounter:

- Document the test name and file
- Note if it's a known issue
- Explain why it fails (if known)
- This helps future contributors understand the test state

## Continuous Integration

All PRs must pass:
1. ESLint (`npm run lint`)
2. TypeScript check (`npx tsc --noEmit`)
3. Jest tests

## Related

- [Developer Setup and Workflow](./dev-setup-and-workflow.md)
- [Architecture Overview](../architecture/README.md)
- [Hooks Catalog](../hooks/README.md)
