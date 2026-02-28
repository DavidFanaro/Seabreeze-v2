# Adding a Provider

This guide provides step-by-step instructions for adding a new AI provider to Seabreeze.

## Overview

Adding a new provider involves modifications across four key areas:

1. **Type Definitions** - Register provider ID and metadata
2. **Provider Implementation** - Create the provider module
3. **Credential Storage** - Add secure credential handling
4. **Provider Factory** - Register in the factory switch statements

## Interface Contracts

### Required Functions

Each provider module must export these functions:

```typescript
// Required: Creates and returns a LanguageModel instance
export function getXxxModel(modelId?: string): LanguageModel | null;

// Optional: Tests connectivity to the provider service
export async function testXxxConnection(credentials: Credentials): Promise<boolean>;

// Optional: Fetches available models from the provider
export async function fetchXxxModels(credentials: Credentials): Promise<string[]>;
```

### LanguageModel Compatibility

All providers must return an object compatible with the AI SDK's `LanguageModel` interface. The AI SDK provides adapters for most providers:

- `@ai-sdk/openai` - OpenAI compatible
- `@ai-sdk/openrouter` - OpenRouter compatible  
- `@openrouter/ai-sdk-provider` - OpenRouter provider
- `ollama-ai-provider-v2` - Ollama compatible
- `@react-native-ai/apple` - Apple Intelligence

## Step-by-Step: Local Provider (No API Key)

Local providers like Ollama run on-device or self-hosted. They require a server URL instead of an API key.

### Step 1: Add Type Definitions

Edit `types/provider.types.ts`:

```typescript
// Add to ProviderId union
export type ProviderId = "apple" | "openai" | "openrouter" | "ollama" | "yourprovider";

// Add to PROVIDERS constant
yourprovider: {
  id: "yourprovider",
  name: "Your Provider Name",
  description: "Description of what this provider offers",
  requiresApiKey: false,  // Local provider
  requiresUrl: true,      // Needs server URL
  defaultModels: ["model-1", "model-2"],
},

// Add to PROVIDER_CAPABILITIES
yourprovider: {
  supportsStreaming: true,
  supportsSystemMessages: true,
  maxContextTokens: 128000, // Optional
},
```

### Step 2: Create Provider Module

Create `providers/yourprovider-provider.ts`:

```typescript
import { createXxx } from "xxx-provider-sdk";
import { LanguageModel } from "ai";
import { getProviderAuth } from "@/stores";
import { fetch as expoFetch } from "expo/fetch";

/**
 * Normalizes the provider URL to ensure proper API format
 */
function normalizeUrl(url: string): string {
  const normalized = url.replace(/\/+$/, "");
  if (normalized.endsWith("/api")) {
    return normalized;
  }
  return `${normalized}/api`;
}

/**
 * Creates a provider language model instance
 */
export function getYourProviderModel(modelId: string = "default-model"): LanguageModel | null {
  try {
    const { url } = getProviderAuth("yourprovider");
    if (!url) {
      return null;
    }
    
    const baseURL = normalizeUrl(url);
    
    const provider = createXxx({ 
      baseURL,
      fetch: expoFetch as unknown as typeof globalThis.fetch,
    });
    const model = provider(modelId);
    return model as unknown as LanguageModel;
  } catch (error) {
    return null;
  }
}

/**
 * Tests connectivity to the provider server
 */
export async function testYourProviderConnection(url: string): Promise<boolean> {
  try {
    const baseURL = normalizeUrl(url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await expoFetch(`${baseURL}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches available models from the provider
 */
export async function fetchYourProviderModels(baseUrl: string): Promise<string[]> {
  try {
    const normalizedUrl = normalizeUrl(baseUrl);
    const response = await expoFetch(`${normalizedUrl}/models`, {
      method: "GET",
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    // Adapt to your provider's response format
    return data.models?.map((m: { name: string }) => m.name) ?? [];
  } catch {
    return [];
  }
}
```

### Step 3: Add Credential Storage

Edit `stores/useAuthStore.ts`:

```typescript
// Add to AuthState interface
yourproviderUrl: string | null;

// Add to AuthActions interface
setYourProviderUrl: (url: string | null) => void;

// Add to state initializer
yourproviderUrl: null,

// Add setter
setYourProviderUrl: (url) =>
  set((state) =>
    applyRuntimeWriteVersion(state, { yourproviderUrl: url }),
  ),

// Add to partialize (for persistence)
yourproviderUrl: state.yourproviderUrl,

// Update getProviderAuth()
case "yourprovider":
  return { url: authStore.yourproviderUrl || undefined };

// Update isProviderConfigured()
case "yourprovider":
  return !!authStore.yourproviderUrl;
```

### Step 4: Register in Provider Factory

Edit `providers/provider-factory.ts`:

```typescript
// Import your provider module
import { getYourProviderModel } from "./yourprovider-provider";

// Add case to getProviderModel() switch
case "yourprovider":
  const yourproviderModel = getCachedModel(
    providerId, 
    model, 
    () => getYourProviderModel(model)
  );
  return {
    model: yourproviderModel,
    isConfigured: isProviderConfigured("yourprovider"),
    error: yourproviderModel ? undefined : "Your Provider URL not configured",
  };

// Add to isProviderAvailable()
return isProviderConfigured(providerId);

// Add to getConfiguredProviders()
if (isProviderAvailable("yourprovider")) {
  configured.push("yourprovider");
}

// Add to getAllProviders()
return ["apple", "openai", "openrouter", "ollama", "yourprovider"];

// Add to testProviderConnection()
case "yourprovider":
  if (!credentials.url) return false;
  const { testYourProviderConnection } = await import("./yourprovider-provider");
  return testYourProviderConnection(credentials.url);

// Add to testProviderConnectionReal()
case "yourprovider":
  if (credentials?.url) {
    const { createXxx } = await import("xxx-provider-sdk");
    const provider = createXxx({ baseURL: credentials.url });
    model = provider("test-model") as unknown as LanguageModel;
  } else {
    model = getYourProviderModel("test-model");
  }
  break;

// Add to testAllProviders()
yourprovider: { success: false, error: "Not tested" },
```

### Step 5: Add Model List (Optional)

In `types/provider.types.ts`:

```typescript
export const YOURPROVIDER_MODELS = [
  "model-1",
  "model-2",
  // ... available models
];
```

## Step-by-Step: Remote Provider (API Key)

Remote providers like OpenAI use API keys for authentication.

### Step 1: Add Type Definitions

Same as local provider, but set:

```typescript
requiresApiKey: true,
requiresUrl: false,
```

### Step 2: Create Provider Module

Create `providers/yourprovider-provider.ts`:

```typescript
import { createXxx } from "@ai-sdk/xxx";
import { LanguageModel } from "ai";
import { getProviderAuth } from "@/stores";

export function getYourProviderModel(modelId: string = "default-model"): LanguageModel | null {
  try {
    const { apiKey } = getProviderAuth("yourprovider");
    if (!apiKey) {
      return null;
    }
    
    const provider = createXxx({ apiKey });
    return provider(modelId) as unknown as LanguageModel;
  } catch (error) {
    return null;
  }
}

export async function testYourProviderConnection(apiKey: string): Promise<boolean> {
  try {
    const provider = createXxx({ apiKey });
    const model = provider("smallest-model");
    
    // Make a minimal test call
    const { generateText } = await import("ai");
    const result = await generateText({
      model,
      prompt: "Hi",
      maxTokens: 1,
    });
    
    return !!result.text;
  } catch {
    return false;
  }
}
```

### Step 3: Add Credential Storage

```typescript
// AuthState
yourproviderApiKey: string | null;

// AuthActions  
setYourProviderApiKey: (key: string | null) => void;

// State
yourproviderApiKey: null,

// Setter
setYourProviderApiKey: (key) =>
  set((state) =>
    applyRuntimeWriteVersion(state, { yourproviderApiKey: key }),
  ),

// getProviderAuth()
case "yourprovider":
  return { apiKey: authStore.yourproviderApiKey || undefined };

// isProviderConfigured()
case "yourprovider":
  return !!authStore.yourproviderApiKey;
```

### Step 4: Register in Provider Factory

Same pattern as local provider, but use `apiKey` instead of `url`.

## Configuration Requirements

### Environment Variables

For remote providers, you may need to document required environment variables:

```bash
# .env.example
YOURPROVIDER_API_KEY=sk-xxx
```

### Secure Storage

All credentials are stored using Expo's SecureStore:

- **iOS**: Keychain
- **Android**: EncryptedSharedPreferences

Never log or expose credentials in error messages.

## Testing Requirements

### Unit Tests

Create `providers/__tests__/yourprovider-provider.test.ts`:

```typescript
import { getYourProviderModel } from "../yourprovider-provider";

describe("yourprovider-provider", () => {
  describe("getYourProviderModel", () => {
    it("returns null when URL not configured", () => {
      // Mock getProviderAuth to return empty
      const result = getYourProviderModel();
      expect(result).toBeNull();
    });
    
    it("returns model when URL is configured", () => {
      // Mock getProviderAuth to return URL
      const result = getYourProviderModel("test-model");
      // Expect model instance
    });
  });
});
```

### Integration Tests

Test actual API connectivity in `providers/__tests__/provider-factory.test.ts`:

```typescript
describe("provider factory", () => {
  describe("yourprovider", () => {
    it("handles unconfigured provider", () => {
      const result = getProviderModel("yourprovider");
      expect(result.isConfigured).toBe(false);
    });
  });
});
```

## Safety Constraints

1. **Credential Validation**: Always validate credentials exist before creating models
2. **Error Handling**: Return null on errors, never throw
3. **Timeout Protection**: Always use AbortController timeouts for network calls
4. **URL Normalization**: Sanitize URLs to prevent injection attacks
5. **Cache Invalidation**: Call `invalidateProvider()` when credentials change
6. **Type Safety**: Use TypeScript strict mode for all provider code

## Cross-Reference

- [Provider Architecture](./provider-architecture.md) - System overview
- [Provider Validation](./provider-validation-and-troubleshooting.md) - Debugging guide
