# Provider Architecture

This document covers the internal architecture of Seabreeze's AI provider system and the extension boundaries for adding new providers.

## Purpose

Seabreeze supports multiple AI providers (Apple Intelligence, OpenAI, OpenRouter, Ollama) through a unified provider abstraction. This architecture enables:

- **Unified Interface**: Single API for all AI providers via AI SDK
- **Provider Fallback**: Automatic failover when a provider fails
- **Model Caching**: Performance optimization through model instance reuse
- **Credential Management**: Secure storage of API keys and endpoints

## Concepts

### Provider Types

| Provider | Type | Credentials | Characteristics |
|----------|------|-------------|-----------------|
| `apple` | Local | None required | On-device, requires compatible Apple hardware |
| `openai` | Remote | API key | Cloud-based, requires OpenAI account |
| `openrouter` | Remote | API key | Aggregator for multiple providers |
| `ollama` | Local/Remote | Server URL | Self-hosted models |

### Core Interfaces

**LanguageModel**: The AI SDK interface that all providers implement. Used for `generateText` and `streamText` operations.

**ProviderResult**: Return type from factory functions containing the model instance, configuration status, and optional error.

```typescript
interface ProviderResult {
  model: LanguageModel | null;
  isConfigured: boolean;
  error?: string;
}
```

**ConnectionTestResult**: Detailed result from connectivity testing.

```typescript
interface ConnectionTestResult {
  success: boolean;
  latencyMs?: number;
  error?: string;
  errorCategory?: "auth" | "network" | "model" | "unknown";
}
```

### Extension Boundaries

The provider system has clear boundaries where extensions occur:

1. **Type Definitions** (`types/provider.types.ts`)
   - Add new `ProviderId` to the union type
   - Add provider info to `PROVIDERS` constant
   - Add capabilities to `PROVIDER_CAPABILITIES` constant

2. **Provider Implementation** (`providers/*.ts`)
   - Create new provider module file
   - Implement model creation function
   - Implement connection testing function

3. **Credential Storage** (`stores/useAuthStore.ts`)
   - Add credential field to `AuthState` interface
   - Add setter function to `AuthActions` interface
   - Add credential retrieval to `getProviderAuth()`
   - Add configuration check to `isProviderConfigured()`

4. **Provider Factory** (`providers/provider-factory.ts`)
   - Add case to `getProviderModel()` switch statement
   - Add availability check to `isProviderAvailable()`
   - Add test case to connection testing functions
   - Add to `getConfiguredProviders()` and `getAllProviders()`

## File Map

### Core Provider Files

| File | Purpose |
|------|---------|
| `types/provider.types.ts` | Type definitions, provider metadata, model lists |
| `providers/provider-factory.ts` | Central factory, model creation, connection testing |
| `providers/provider-cache.ts` | Model caching with LRU eviction, TTL management |
| `providers/apple-provider.ts` | Apple Intelligence implementation |
| `providers/openai-provider.ts` | OpenAI implementation |
| `providers/openrouter-provider.ts` | OpenRouter implementation |
| `providers/ollama-provider.ts` | Ollama implementation |
| `stores/useAuthStore.ts` | Secure credential storage |

### Supporting Files

| File | Purpose |
|------|---------|
| `stores/useProviderStore.ts` | Provider/model selection state |
| `hooks/useChatState.ts` | Chat-specific provider overrides |
| `stores/useSettingsStore.ts` | Settings that affect provider behavior |

## Flow

### Model Creation Flow

```
Component/Hook
    │
    ▼
getProviderModel(providerId, modelId?)
    │
    ├───▶ Provider Factory
    │         │
    │         ▼
    │    Check cache (provider-cache.ts)
    │         │
    │         ├──▶ Cache hit ──▶ Return cached model
    │         │
    │         └──▶ Cache miss
    │                    │
    │                    ▼
    │              Provider-specific creation
    │              (apple/openai/openrouter/ollama)
    │                    │
    │                    ▼
    │              Cache new model instance
    │                    │
    │                    ▼
    └─────────────▶ Return ProviderResult
```

### Connection Testing Flow

```
UI Component
    │
    ▼
testProviderConnectionReal(providerId, credentials?)
    │
    ▼
Create test model (lightweight model)
    │
    ▼
Make test API call with timeout (15s default)
    │
    ├───▶ Success ──▶ Return { success: true, latencyMs }
    │
    └───▶ Failure ──▶ Categorize error (auth/network/model/unknown)
                         │
                         ▼
                    Return { success: false, error, errorCategory }
```

### Fallback Chain

The system implements automatic fallback when a provider fails:

```
Apple → OpenAI → OpenRouter → Ollama
```

After each message, the fallback state is reset to allow trying the full chain again.

## Examples

### Getting a Provider Model

```typescript
import { getProviderModel } from "@/providers/provider-factory";

const result = getProviderModel("openai", "gpt-4o");

if (result.isConfigured && result.model) {
  // Use result.model for AI operations
} else {
  // Handle configuration error: result.error
}
```

### Testing Provider Connectivity

```typescript
import { testProviderConnectionReal } from "@/providers/provider-factory";

const result = await testProviderConnectionReal("ollama", {
  url: "http://localhost:11434"
}, 10000);

if (result.success) {
  console.log(`Connection OK, latency: ${result.latencyMs}ms`);
} else {
  console.error(`Failed: ${result.error} (${result.errorCategory})`);
}
```

### Checking Provider Availability

```typescript
import { isProviderAvailable, getConfiguredProviders } from "@/providers/provider-factory";

if (isProviderAvailable("ollama")) {
  // Ollama is configured and ready
}

const available = getConfiguredProviders();
// Returns ["apple", "openai", ...] - only configured providers
```

## Gotchas

1. **Apple Provider is Special**: Apple Intelligence doesn't require credentials but requires compatible hardware. The `isProviderConfigured("apple")` always returns `true`.

2. **Cache Invalidation**: When credentials change, call `invalidateProvider(providerId)` to clear cached models with old credentials.

3. **URL Normalization**: Ollama requires URL normalization (adding `/api` suffix). Always use the `normalizeOllamaUrl()` utility.

4. **Expo Fetch Required**: In React Native, use `expo/fetch` instead of global `fetch` for network operations.

5. **Model Caching**: The cache uses LRU eviction with 5-minute TTL. Long-running chats may need to handle stale models.

6. **AbortSignal Propagation**: Use standard `AbortSignal` for cancellations across async boundaries.

## Change Guide

### Modifying Existing Provider

1. **Update model list**: Edit `OPENAI_MODELS`, `OPENROUTER_MODELS`, or `OLLAMA_MODELS` in `types/provider.types.ts`
2. **Update capabilities**: Modify `PROVIDER_CAPABILITIES` entry if feature support changes
3. **Test changes**: Run existing provider tests in `providers/__tests__/`

### Adding New Provider

See [Adding a Provider](./adding-a-provider.md) for step-by-step instructions.

### Troubleshooting

See [Provider Validation and Troubleshooting](./provider-validation-and-troubleshooting.md) for debugging guide.
