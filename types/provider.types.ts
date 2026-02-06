/**
 * @file provider.types.ts
 * @purpose Provider-related type definitions
 * @connects-to Providers, stores
 */

export const OPENAI_MODELS: string[] = [
  "gpt-5.2",
  "gpt-5.1",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
];

export const OPENROUTER_MODELS: string[] = [
  "openai/gpt-5.2",
  "openai/gpt-5.1",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/gpt-4-turbo",
  "anthropic/claude-sonnet-4-20250514",
  "anthropic/claude-opus-4-20250514",
  "anthropic/claude-haiku-3-20250514",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-1.5-pro",
  "google/gemini-1.5-flash",
  "meta/llama-4-scout",
  "meta/llama-4-maverick",
  "mistralai/mistral-small-3.1-24-06-11",
  "mistralai/mistral-medium-3",
];

export const OLLAMA_MODELS: string[] = [
  "llama4",
  "llama3.3",
  "llama3.2",
  "llama3.1",
  "llama3",
  "llama2-uncensored",
  "mistral",
  "mistral-small",
  "mixtral",
  "qwen2.5",
  "qwen2.5-coder",
  "codellama",
  "deepseek-r1",
  "deepseek-coder-v2",
  "gemma3",
  "gemma2",
  "phi4",
  "command-r7b-0314",
  "starcoder2",
];

export type ProviderId = "apple" | "openai" | "openrouter" | "ollama";

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  description: string;
  requiresApiKey: boolean;
  requiresUrl: boolean;
  defaultModels: string[];
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  apple: {
    id: "apple",
    name: "Apple Intelligence",
    description: "On-device AI powered by Apple Silicon",
    requiresApiKey: false,
    requiresUrl: false,
    defaultModels: ["apple-generic"],
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4 and other OpenAI models",
    requiresApiKey: true,
    requiresUrl: false,
    defaultModels: OPENAI_MODELS.slice(0, 8),
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    description: "Access to multiple AI providers through OpenRouter",
    requiresApiKey: true,
    requiresUrl: false,
    defaultModels: OPENROUTER_MODELS.slice(0, 8),
  },
  ollama: {
    id: "ollama",
    name: "Ollama",
    description: "Local AI models via Ollama",
    requiresApiKey: false,
    requiresUrl: true,
    defaultModels: OLLAMA_MODELS.slice(0, 8),
  },
};

export interface ProviderState {
  selectedProvider: ProviderId;
  selectedModel: string;
  availableModels: Record<ProviderId, string[]>;
  providerMetadata: Record<ProviderId, Record<string, string>>;
}

export interface ProviderCapability {
  supportsStreaming: boolean;
  supportsSystemMessages: boolean;
  maxContextTokens?: number;
}

export const PROVIDER_CAPABILITIES: Record<ProviderId, ProviderCapability> = {
  apple: {
    supportsStreaming: true,
    supportsSystemMessages: true,
  },
  openai: {
    supportsStreaming: true,
    supportsSystemMessages: true,
    maxContextTokens: 128000,
  },
  openrouter: {
    supportsStreaming: true,
    supportsSystemMessages: true,
  },
  ollama: {
    supportsStreaming: true,
    supportsSystemMessages: true,
  },
};

const OPENAI_REASONING_MODEL_PREFIXES: string[] = [
  "o1",
  "o3",
  "o4-mini",
  "codex-mini",
  "computer-use-preview",
  "gpt-5",
];

const OPENAI_NON_REASONING_MODEL_PREFIXES: string[] = ["gpt-5-chat"];

const OPENROUTER_REASONING_MODEL_PREFIXES: string[] = [
  "openai/o1",
  "openai/o3",
  "openai/o4-mini",
  "openai/codex-mini",
  "openai/computer-use-preview",
  "openai/gpt-5",
  "deepseek/deepseek-r1",
];

const OPENROUTER_NON_REASONING_MODEL_PREFIXES: string[] = ["openai/gpt-5-chat"];

const OLLAMA_REASONING_HINT_PREFIXES: string[] = [
  "gpt-oss",
  "deepseek-r1",
  "qwen3",
  "qwq",
];

const startsWithAny = (value: string, prefixes: string[]): boolean => {
  return prefixes.some((prefix) => value.startsWith(prefix));
};

export const isOllamaThinkingHintModel = (modelId: string): boolean => {
  if (!modelId) {
    return false;
  }

  const normalizedModelId = modelId.toLowerCase();
  return startsWithAny(normalizedModelId, OLLAMA_REASONING_HINT_PREFIXES);
};

export const isThinkingCapableModel = (
  providerId: ProviderId,
  modelId: string,
): boolean => {
  if (!modelId) {
    return false;
  }

  const normalizedModelId = modelId.toLowerCase();

  switch (providerId) {
    case "openai": {
      if (startsWithAny(normalizedModelId, OPENAI_NON_REASONING_MODEL_PREFIXES)) {
        return false;
      }
      return startsWithAny(normalizedModelId, OPENAI_REASONING_MODEL_PREFIXES);
    }
    case "openrouter": {
      if (normalizedModelId.includes(":thinking")) {
        return true;
      }
      if (startsWithAny(normalizedModelId, OPENROUTER_NON_REASONING_MODEL_PREFIXES)) {
        return false;
      }
      return startsWithAny(normalizedModelId, OPENROUTER_REASONING_MODEL_PREFIXES);
    }
    default:
      return false;
  }
};
