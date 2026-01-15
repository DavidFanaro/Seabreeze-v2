import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { LanguageModel } from "ai";
import { getProviderAuth } from "@/stores/useAIStore";
import { fetch as expoFetch } from "expo/fetch";

export function getOpenAIModel(
  modelId: string = "gpt-5",
): LanguageModel | null {
  const { apiKey } = getProviderAuth("openai");
  if (!apiKey) {
    console.error("OpenAI: API key is missing");
    return null;
  }
  console.log("OpenAI: Creating provider with API key, model:", modelId);
  const provider = createOpenAI({ 
    apiKey,
    fetch: expoFetch as unknown as typeof globalThis.fetch,
  });
  return provider(modelId);
}

export function createOpenAIProvider(apiKey: string): OpenAIProvider {
  return createOpenAI({ 
    apiKey,
    fetch: expoFetch as unknown as typeof globalThis.fetch,
  });
}

export function isOpenAIConfigured(): boolean {
  const { apiKey } = getProviderAuth("openai");
  return !!apiKey;
}

export async function testOpenAIConnection(apiKey: string): Promise<boolean> {
  try {
    const provider = createOpenAI({ 
      apiKey,
      fetch: expoFetch as unknown as typeof globalThis.fetch,
    });
    const model = provider("gpt-5-mini");
    return true;
  } catch (error) {
    console.error("OpenAI connection test failed:", error);
    return false;
  }
}
