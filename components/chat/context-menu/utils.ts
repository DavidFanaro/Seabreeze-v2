import {
  OLLAMA_MODELS,
  OPENCODE_MODELS,
  OPENAI_CODEX_MODELS,
  OPENAI_MODELS,
  OPENROUTER_MODELS,
  PROVIDERS,
  type ProviderId,
} from "@/types/provider.types";

export const PROVIDER_IDS: ProviderId[] = ["apple", "openai", "openai-codex", "openrouter", "opencode", "ollama"];

const getDefaultModelsForProvider = (providerId: ProviderId): string[] => {
  switch (providerId) {
    case "apple":
      return ["Apple Intelligence"];
    case "openai":
      return OPENAI_MODELS;
    case "openai-codex":
      return OPENAI_CODEX_MODELS;
    case "openrouter":
      return OPENROUTER_MODELS;
    case "opencode":
      return OPENCODE_MODELS;
    case "ollama":
      return OLLAMA_MODELS;
    default:
      return [];
  }
};

export const getStoredModelValue = (
  providerId: ProviderId,
  displayModel: string,
): string => {
  if (providerId === "apple") return "system-default";
  return displayModel;
};

export const getModelLabel = (provider: ProviderId, model: string | null): string => {
  if (provider === "apple") return "Apple Intelligence";
  if (!model || model === "system-default") return PROVIDERS[provider].name;
  const maxLength = 22;
  return model.length > maxLength
    ? `${model.slice(0, maxLength - 3)}...`
    : model;
};

export const getProviderSheetLabel = (provider: ProviderId): string => {
  if (provider === "apple") return "Apple";
  return PROVIDERS[provider].name;
};

export const toTestIdFragment = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export { getDefaultModelsForProvider };
