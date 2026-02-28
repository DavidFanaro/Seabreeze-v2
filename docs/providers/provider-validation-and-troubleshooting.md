# Provider Validation and Troubleshooting

This guide covers validation procedures, smoke testing, fallback behavior, and common failure modes for AI providers.

## Validation Checklist

Before a provider is considered ready for production use, verify:

### Configuration Validation

- [ ] Provider ID is added to `ProviderId` type in `types/provider.types.ts`
- [ ] Provider info is in `PROVIDERS` constant with correct metadata
- [ ] Provider capabilities are in `PROVIDER_CAPABILITIES` constant
- [ ] Credentials are stored in `useAuthStore` with proper secure storage
- [ ] `getProviderAuth()` returns correct credentials structure
- [ ] `isProviderConfigured()` returns correct boolean

### Factory Registration

- [ ] Provider case added to `getProviderModel()` switch statement
- [ ] Provider added to `isProviderAvailable()` logic
- [ ] Provider added to `getConfiguredProviders()` array
- [ ] Provider added to `getAllProviders()` array
- [ ] Provider added to `testProviderConnection()` function
- [ ] Provider added to `testProviderConnectionReal()` function
- [ ] Provider added to `testAllProviders()` result object

### Provider Module

- [ ] Model creation function returns `LanguageModel | null`
- [ ] Connection test function handles timeouts (5 second default)
- [ ] URL normalization handles edge cases (trailing slashes, missing `/api`)
- [ ] Error handling returns null rather than throwing

### Testing

- [ ] Unit tests pass for provider module
- [ ] Integration tests pass for provider factory
- [ ] Manual smoke test succeeds (see below)

## Smoke Test Path

### Automated Smoke Test

Run the built-in connection test:

```typescript
import { testProviderConnectionReal } from "@/providers/provider-factory";

async function smokeTest() {
  const providers = ["apple", "openai", "openrouter", "ollama"];
  
  for (const providerId of providers) {
    const result = await testProviderConnectionReal(providerId);
    console.log(`${providerId}: ${result.success ? "OK" : result.error}`);
  }
}
```

### Manual Testing Steps

1. **Configure Provider**
   - Navigate to settings
   - Enter API key or server URL
   - Save configuration

2. **Test Connection**
   - Use "Test Connection" button in settings
   - Verify latency displays (should be < 5s for remote, < 1s for local)

3. **Send Test Message**
   - Start new chat
   - Send simple message: "Hello"
   - Verify response arrives within reasonable time

4. **Test Streaming**
   - Send message requiring longer response
   - Verify streaming works (tokens appear incrementally)

5. **Test Fallback** (if applicable)
   - Temporarily invalidate credentials
   - Send message
   - Verify fallback to next provider works

## Fallback Behavior

### Fallback Chain

```
Apple → OpenAI → OpenRouter → Ollama
```

### When Fallback Triggers

Fallback occurs when:

1. **Model creation fails**: Provider returns null model
2. **API call fails**: Network error, auth error, or timeout
3. **Stream errors**: Streaming fails mid-response

### Fallback Reset

After each message (completed or failed), the fallback state resets. This allows the system to retry from the beginning of the chain on subsequent messages.

### Customizing Fallback Order

The fallback order is determined by `getConfiguredProviders()`. To customize:

```typescript
// In provider-factory.ts, modify getConfiguredProviders()
export function getConfiguredProviders(): ProviderId[] {
  const configured: ProviderId[] = [];
  
  // Add providers in desired priority order
  if (isProviderAvailable("apple")) configured.push("apple");
  if (isProviderAvailable("ollama")) configured.push("ollama");  // Prefer local
  if (isProviderAvailable("openai")) configured.push("openai");
  if (isProviderAvailable("openrouter")) configured.push("openrouter");
  
  return configured;
}
```

## Common Failure Modes

### Authentication Failures

| Symptom | Cause | Solution |
|---------|-------|----------|
| "API key not configured" | Credentials not saved | Check SecureStore persistence |
| "Invalid API key" | Wrong key format | Verify key matches provider format |
| "Unauthorized" (401) | Key expired or revoked | Generate new API key |
| "Forbidden" (403) | Insufficient permissions | Check API key permissions |

**Debugging**: Enable verbose logging for auth errors:

```typescript
const result = await testProviderConnectionReal("openai");
if (result.errorCategory === "auth") {
  console.log("Auth issue:", result.error);
}
```

### Network Failures

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Connection refused" | Server not running | Start Ollama or check URL |
| "Network request failed" | No internet | Check connectivity |
| "Timeout" | Server slow to respond | Increase timeout in test |
| "SSL certificate error" | HTTPS issues | Check certificate validity |

**Debugging**: For local providers like Ollama:

```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# Check specific model
curl http://localhost:11434/api/show -d '{"name": "llama3.2"}'
```

### Configuration Failures

| Symptom | Cause | Solution |
|---------|-------|----------|
| Model returns null | URL not normalized | Use URL normalization utility |
| Wrong model used | Model ID mismatch | Verify model ID format |
| Stale credentials | Cache not invalidated | Call `invalidateProvider()` |

**Debugging**: Check cache state:

```typescript
import { getProviderCache } from "./provider-cache";

const stats = getProviderCache().getStats();
console.log("Cache:", stats);
```

### Provider-Specific Issues

#### Apple Intelligence

| Issue | Solution |
|-------|----------|
| Not available | Ensure iPhone 15 Pro/Pro Max or iPhone 16 series |
| Not enabled | Enable in Settings → Apple Intelligence |
| iOS version | Update to iOS 18.0+ |

#### OpenAI

| Issue | Solution |
|-------|----------|
| Rate limiting | Implement backoff, check quotas |
| Model deprecated | Update to supported model |

#### OpenRouter

| Issue | Solution |
|-------|----------|
| Credit balance | Check OpenRouter account |
| Model not available | Verify model ID format (e.g., `openai/gpt-4o`) |

#### Ollama

| Issue | Solution |
|-------|----------|
| Model not pulled | Run `ollama pull <model>` |
| Wrong port | Default is 11434 |
| Network isolation | Check firewall settings |

## Error Categories

The provider system categorizes errors for appropriate UI handling:

```typescript
type ErrorCategory = "auth" | "network" | "model" | "unknown";
```

### Auth Errors

- **Indicators**: 401, 403 status codes; "unauthorized", "forbidden", "api key" in message
- **User Action**: Update credentials in settings
- **UI Treatment**: Show "Credentials invalid" with settings link

### Network Errors

- **Indicators**: "network", "fetch", "connection", "timeout", "econnrefused"
- **User Action**: Check internet, verify server running (for local)
- **UI Treatment**: Show "Connection failed" with retry button

### Model Errors

- **Indicators**: 404 status; "model not found", "does not exist"
- **User Action**: Select different model
- **UI Treatment**: Show "Model unavailable" with model picker

### Unknown Errors

- **Indicators**: Any other error
- **User Action**: Report issue
- **UI Treatment**: Show generic error with support link

## Recovery Procedures

### Cache Invalidation

If credentials changed but model still fails:

```typescript
import { invalidateProvider } from "@/providers/provider-factory";

// After updating credentials
invalidateProvider("openai");

// Then retry model creation
const result = getProviderModel("openai", "gpt-4o");
```

### Full Reset

To completely reset provider state:

```typescript
import { invalidateProvider } from "@/providers/provider-factory";
import { resetProviderCache } from "@/providers/provider-cache";

// Invalidate each provider
["apple", "openai", "openrouter", "ollama"].forEach(invalidateProvider);

// Or full cache reset
resetProviderCache();
```

### Re-authentication Flow

1. Clear stored credentials: `clearAllCredentials()` in auth store
2. Invalidate provider cache: `invalidateProvider(providerId)`
3. Navigate to settings
4. Re-enter credentials
5. Test connection
6. Verify new model creation works

## Testing Utilities

### Quick Health Check

```typescript
import { testAllProviders } from "@/providers/provider-factory";

const results = await testAllProviders();
// Returns connection status for all configured providers
```

### Get Best Available Provider

```typescript
import { getBestAvailableProvider } from "@/providers/provider-factory";

const best = await getBestAvailableProvider(5000);
// Returns ProviderId of fastest responding provider
```

## Cross-Reference

- [Provider Architecture](./provider-architecture.md) - System overview
- [Adding a Provider](./adding-a-provider.md) - Extension guide
