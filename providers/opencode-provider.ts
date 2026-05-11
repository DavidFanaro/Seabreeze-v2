import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { LanguageModel } from "ai";
import { fetch as expoFetch } from "expo/fetch";

import { getProviderAuth } from "@/stores";

const OPENCODE_BASE_URL = "https://opencode.ai/zen/go/v1";

export function getOpencodeModel(modelId: string = "glm-5.1"): LanguageModel | null {
  const { apiKey } = getProviderAuth("opencode");
  if (!apiKey) {
    return null;
  }

  return createOpencodeProvider(apiKey).chat(modelId);
}

export function createOpencodeProvider(apiKey: string): OpenAIProvider {
  return createOpenAI({
    name: "opencode",
    apiKey,
    baseURL: OPENCODE_BASE_URL,
    fetch: expoFetch as unknown as typeof globalThis.fetch,
  });
}

export function isOpencodeConfigured(): boolean {
  const { apiKey } = getProviderAuth("opencode");
  return !!apiKey;
}

export async function testOpencodeConnection(apiKey: string): Promise<boolean> {
  try {
    const response = await expoFetch(`${OPENCODE_BASE_URL}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
