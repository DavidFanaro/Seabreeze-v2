# Ralph Wiggum Loop - AI Provider Integration Plan

## Project Overview
Transform the current Apple Intelligence-only chat system into a multi-provider AI platform with seamless switching between OpenAI, OpenRouter, Ollama, and Apple Intelligence. The system will automatically detect API key/URL changes and update providers accordingly.

## Current State Analysis

### ✅ What's Working
- Apple Intelligence fully implemented as default provider
- Secure storage for API keys (OpenAI, OpenRouter) and Ollama URL
- Settings UI with input fields for all providers
- React Query for settings state management
- `useChat` hook with streaming capabilities
- All required dependencies installed and up-to-date
- Database schema ready for chat storage

### ❌ What's Missing
- OpenAI, OpenRouter, Ollama providers not connected to chat system
- No provider selection mechanism
- No model selection per provider
- No automatic provider updates when API keys change
- Zustand not implemented for global state
- No default model/provider persistence
- No model fetching for dynamic model lists
- TypeScript compatibility issues with Apple Intelligence provider

## Technical Architecture

### Dependencies Analysis
```
AI Providers: All installed and ready
├── @react-native-ai/apple ^0.11.0 ✅ (working, but type issues)
├── @ai-sdk/openai ^3.0.4 ✅ (needs connection)
├── @openrouter/ai-sdk-provider ^1.5.4 ✅ (needs connection)
├── ollama-ai-provider-v2 ^2.0.0 ✅ (needs connection)
└── ai ^6.0.9 ✅ (Vercel AI SDK core)

State Management:
├── zustand ^5.0.9 ✅ (installed, not implemented)
└── @tanstack/react-query 4 ✅ (current settings state)

Storage:
└── expo-secure-store ~15.0.8 ✅ (API keys working)
```

### Critical Integration Points Identified

**Primary Integration Points:**
1. **`hooks/useChat.ts:54-57`** - Model selection logic (currently `providedModel ?? apple()`)
2. **`hooks/useChat.ts:68-87`** - Title generation (hardcoded to `apple()`)
3. **`hooks/useChat.ts:121-124`** - AI provider calls via `streamText()`

**Database Schema:** 
- Current: Basic chat storage with messages as JSON
- Needed: `providerId`, `modelId`, `providerMetadata` columns

## Implementation Roadmap

### Phase 1: Foundation (Priority: High)

#### 1.1 Fix Apple Intelligence Compatibility
**Files:** `lib/providers/apple-provider.ts` (new), `hooks/useChat.ts`
- Create wrapper/adapter to bridge `AppleLLMChatLanguageModel` to `LanguageModelV2`
- Resolve TypeScript errors while maintaining functionality
- Ensure backward compatibility with existing Apple implementation

#### 1.2 Extend Database Schema  
**Files:** `db/schema.ts`, `drizzle/0002_add_provider_metadata.sql` (new)
- Add `providerId`, `modelId`, `providerMetadata` columns to chat table
- Create migration script for existing data
- Maintain backward compatibility with existing chats

#### 1.3 Create Provider State Management
**Files:** `stores/useAIStore.ts` (new), `util/kvtags.tsx`
- Implement Zustand store for provider selection and configuration
- Add storage keys for default provider/model preferences
- Create provider types and interfaces

### Phase 2: Non-Apple Provider Integration (Priority: High)

#### 2.1 Create Provider Factory
**Files:** `lib/providers/provider-factory.ts` (new)
- Initialize OpenAI, OpenRouter, Ollama with stored credentials
- Handle credential validation and error states
- Provide consistent interface across all providers

#### 2.2 Implement Individual Providers
**Files:** `lib/providers/openai-provider.ts`, `lib/providers/openrouter-provider.ts`, `lib/providers/ollama-provider.ts` (all new)
- Connect each provider to stored API keys/URLs
- Implement model fetching and validation
- Add provider-specific error handling

#### 2.3 Refactor Chat Hook
**File:** `hooks/useChat.ts`
- Replace hardcoded `apple()` with dynamic provider selection
- Update title generation to use selected provider
- Add provider-specific error handling
- Maintain existing streaming and message flow

### Phase 3: Settings UI Enhancement (Priority: Medium)

#### 3.1 Add Provider Selection to Settings
**File:** `app/settings/index.tsx`
- Add simple dropdown for provider selection (Option A approach)
- Integrate model selection dropdown for active provider
- Replace React Query with Zustand integration
- Add "Test Connection" functionality

#### 3.2 Create Model Selector Component
**File:** `components/ModelSelector.tsx` (new)
- Reusable dropdown for model selection
- Handle loading states and errors
- Filter models by provider availability

### Phase 4: Advanced Features (Priority: Low)

#### 4.1 Automatic Credential Watching
**File:** `hooks/useCredentialWatcher.ts` (new)
- Monitor SecureStore for API key changes
- Auto-reinitialize providers when credentials update
- Debounce to prevent excessive reinitialization

#### 4.2 Enhanced Error Handling
**Files:** Multiple chat components
- Add provider-specific error messages
- Implement error boundaries for graceful failure
- Add retry logic for transient failures

## Detailed Task Breakdown

### Phase 1 Tasks (Foundation)
1. **Create Apple compatibility wrapper** 
   - Analyze `AppleLLMChatLanguageModel` interface differences
   - Implement adapter pattern to bridge to `LanguageModelV2`
   - Test with existing useChat functionality

2. **Extend database schema**
   - Add provider metadata columns to chat table
   - Create Drizzle migration script
   - Update TypeScript interfaces for new schema

3. **Build Zustand store for AI state**
   - Define interfaces for provider state
   - Implement store with TypeScript types
   - Add persistence layer with SecureStore

### Phase 2 Tasks (Integration)
4. **Implement AI provider factory**
   - Create provider initialization functions
   - Implement provider switching logic
   - Add comprehensive error handling

5. **Implement OpenAI integration**
   - Configure OpenAI provider with API key
   - Add model fetching functionality
   - Test with real API calls

6. **Implement OpenRouter integration**
   - Configure OpenRouter provider
   - Handle OpenRouter-specific model formats
   - Test API connectivity

7. **Implement Ollama integration**
   - Configure Ollama provider with URL
   - Add connection testing
   - Handle network errors gracefully

8. **Refactor useChat hook**
   - Integrate provider factory
   - Add dynamic model selection
   - Maintain existing functionality

### Phase 3 Tasks (UI)
9. **Build model selector component**
   - Create reusable model selector UI
   - Add search/filter functionality
   - Show model details and capabilities

10. **Enhance settings page**
    - Add provider selection UI
    - Integrate model selector
    - Add connection status indicators
    - Replace React Query with Zustand

### Phase 4 Tasks (Advanced)
11. **Implement credential watching**
    - Monitor SecureStore changes
    - Auto-update providers on changes
    - Add debouncing and notifications

12. **Build enhanced error handling**
    - Implement provider-specific error messages
    - Add error boundaries
    - Add retry logic for transient failures

## File Structure After Implementation

```
lib/
├── providers/
│   ├── provider-factory.ts      # Main provider management
│   ├── apple-provider.ts        # Apple compatibility wrapper
│   ├── openai-provider.ts       # OpenAI integration
│   ├── openrouter-provider.ts   # OpenRouter integration
│   └── ollama-provider.ts       # Ollama integration
├── types/
│   └── provider-types.ts        # Provider interfaces
└── utils/
    └── provider-utils.ts         # Helper functions

stores/
└── useAIStore.ts                # Zustand provider state

components/
└── ModelSelector.tsx            # Model selection UI

drizzle/
└── 0002_add_provider_metadata.sql # Database migration
```

## Success Criteria

### Core Functionality
✅ Users can switch between Apple, OpenAI, OpenRouter, and Ollama
✅ API keys and URLs are securely stored and automatically applied
✅ Model selection works for each provider
✅ Apple Intelligence remains default provider when available
✅ Settings UI shows simple dropdown (Option A approach)

### User Experience
✅ Smooth provider switching without app restart
✅ Clear error messages for configuration issues
✅ Intuitive model selection interface
✅ Automatic detection when providers become available

### Technical Requirements
✅ All changes maintain backward compatibility
✅ No hardcoded credentials or configurations
✅ Proper error handling and fallback mechanisms
✅ Efficient caching and performance optimization
✅ TypeScript errors resolved with Apple wrapper

## Implementation Notes

### Critical Path
1. **Apple compatibility wrapper** - Must resolve TypeScript interface issues
2. **Provider factory implementation** - Enables all other provider integrations
3. **Settings integration** - User-facing validation and testing

### Risk Mitigation
- Apple wrapper creation is highest risk due to complex type compatibility
- Maintain existing functionality throughout development
- Test each provider individually before integration
- Use feature flags for gradual rollout

### Security Considerations
- Never log API keys or sensitive configuration
- Use SecureStore for all credential storage
- Implement proper error handling without exposing sensitive data
- Add credential validation before saving

### Performance Considerations
- Lazy load provider models to improve startup time
- Cache model lists with reasonable TTL
- Debounce credential change detection
- Optimize for offline usage where possible

### Future Extensibility
- Design provider interface to easily add new providers
- Model selection system should handle future model types
- Configuration system should support advanced provider options
- Architecture should support provider-specific features

---

*This plan provides a comprehensive roadmap for implementing multi-provider AI support while maintaining the excellent user experience and code quality already established in the Seabreeze project. The approach prioritizes adding non-Apple providers first while keeping Apple Intelligence as the default, with a clean dropdown UI for provider selection.*

Output <promise>COMPLETE</promise> when all phases done.
