import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { LanguageModel } from "ai";
import { getProviderAuth } from "@/stores";
import { fetch as expoFetch } from "expo/fetch";

export function getOpenAIModel(
  modelId: string = "gpt-5",
): LanguageModel | null {
  const { apiKey } = getProviderAuth("openai");
  if (!apiKey) {
    return null;
  }
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
    const response = await expoFetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}
