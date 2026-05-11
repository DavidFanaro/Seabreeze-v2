import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { LanguageModel } from "ai";
import { fetch as expoFetch } from "expo/fetch";

import {
  getStoredOpenAICodexCredentials,
  getValidOpenAICodexCredentials,
  refreshOpenAICodexCredentials,
} from "./openai-codex-auth";

const CODEX_BASE_URL = "https://chatgpt.com/backend-api/codex";
const ORIGINATOR = "codex_cli_rs";
const DUMMY_API_KEY = "seabreeze-codex-oauth";

type JsonRecord = Record<string, unknown>;

const createSessionId = (): string => {
  const random = Math.random().toString(36).slice(2);
  return `seabreeze-${Date.now().toString(36)}-${random}`;
};

const CODEX_SESSION_ID = createSessionId();
const CODEX_INSTALLATION_ID = createSessionId();

const buildCodexHeaders = async (): Promise<Record<string, string>> => {
  const credentials = await getValidOpenAICodexCredentials();
  if (!credentials) {
    throw new Error("OpenAI Codex is not configured. Sign in with OpenAI first.");
  }
  if (!credentials.accountId) {
    throw new Error("OpenAI Codex session is missing an account ID. Refresh the session or sign in again.");
  }

  return {
    Authorization: `Bearer ${credentials.accessToken}`,
    originator: ORIGINATOR,
    "User-Agent": "codex-cli-rs",
    "ChatGPT-Account-ID": credentials.accountId,
    session_id: CODEX_SESSION_ID,
  };
};

const mergeHeaders = (headers: HeadersInit | undefined, codexHeaders: Record<string, string>): Headers => {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("Authorization", codexHeaders.Authorization);
  nextHeaders.set("originator", codexHeaders.originator);
  nextHeaders.set("User-Agent", codexHeaders["User-Agent"]);
  nextHeaders.set("session_id", codexHeaders.session_id);
  if (codexHeaders["ChatGPT-Account-ID"]) {
    nextHeaders.set("ChatGPT-Account-ID", codexHeaders["ChatGPT-Account-ID"]);
  }
  return nextHeaders;
};

const getUrlForLog = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const redactForLog = (body: unknown): string | undefined => {
  if (typeof body !== "string") return undefined;

  try {
    const payload = JSON.parse(body) as JsonRecord;
    return JSON.stringify(payload).slice(0, 2000);
  } catch {
    return body.slice(0, 2000);
  }
};

const logCodexFailure = async (
  response: Response,
  input: RequestInfo | URL,
  body: unknown,
): Promise<Response> => {
  if (response.ok) return response;

  const url = getUrlForLog(input);
  const requestBody = redactForLog(body);

  try {
    const text = await response.text();
    throw new Error(
      `OpenAI Codex request failed: ${response.status} ${response.statusText}\nURL: ${url}\nRequest: ${requestBody ?? "<unavailable>"}\nResponse: ${text.slice(0, 2000)}`,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("OpenAI Codex request failed:")) {
      throw error;
    }
    throw new Error(
      `OpenAI Codex request failed: ${response.status} ${response.statusText}\nURL: ${url}\nRequest: ${requestBody ?? "<unavailable>"}`,
    );
  }
};

const normalizeCodexInput = (value: unknown): unknown => {
  if (!Array.isArray(value)) return value;
  let convertedToolOutput = false;

  const normalized = value.map((item) => {
    if (!item || typeof item !== "object") return item;
    const entry = item as JsonRecord;
    if (entry.type === "function_call_output") {
      convertedToolOutput = true;
      return {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Tool result for ${String(entry.call_id ?? "unknown call")}:
${String(entry.output ?? "")}`,
          },
        ],
      };
    }
    if (typeof entry.role === "string" && !entry.type) {
      return {
        ...entry,
        type: "message",
        role: entry.role === "system" ? "developer" : entry.role,
      };
    }
    if (entry.type === "message" && entry.role === "system") {
      return { ...entry, role: "developer" };
    }
    return item;
  }).filter((item) => {
    if (!item || typeof item !== "object") return true;
    return (item as JsonRecord).type !== "item_reference";
  });

  if (!convertedToolOutput) {
    return normalized;
  }

  return [
    ...normalized,
    {
      type: "message",
      role: "developer",
      content: "Use the tool result above to answer the user's request now. Do not call the same tool again unless the result is insufficient.",
    },
  ];
};

const normalizeCodexResponsesBody = (body: unknown): unknown => {
  if (typeof body !== "string") return body;

  try {
    const payload = JSON.parse(body) as JsonRecord;

    delete payload.temperature;
    delete payload.top_p;
    delete payload.truncation;
    delete payload.user;
    delete payload.service_tier;

    payload.store = false;
    payload.stream = true;
    payload.parallel_tool_calls = true;
    payload.instructions = typeof payload.instructions === "string" ? payload.instructions : "";
    if (!Array.isArray(payload.tools)) {
      payload.tools = [];
    }
    payload.tool_choice = payload.tool_choice ?? "auto";
    payload.prompt_cache_key = payload.prompt_cache_key ?? CODEX_SESSION_ID;
    payload.client_metadata = {
      ...(payload.client_metadata && typeof payload.client_metadata === "object"
        ? (payload.client_metadata as JsonRecord)
        : {}),
      "x-codex-installation-id": CODEX_INSTALLATION_ID,
    };
    payload.include = ["reasoning.encrypted_content"];
    payload.reasoning = {
      effort: "medium",
      summary: "auto",
    };
    payload.input = normalizeCodexInput(payload.input);

    return JSON.stringify(payload);
  } catch {
    return body;
  }
};

const codexFetch: typeof globalThis.fetch = async (input, init) => {
  let codexHeaders = await buildCodexHeaders();
  const body = normalizeCodexResponsesBody(init?.body);
  let response = await expoFetch(input as any, {
    ...(init as any),
    body,
    headers: mergeHeaders(init?.headers, codexHeaders),
  });

  if (response.status === 401 || response.status === 403) {
    const credentials = getStoredOpenAICodexCredentials();
    if (credentials) {
      await refreshOpenAICodexCredentials(credentials);
      codexHeaders = await buildCodexHeaders();
      response = await expoFetch(input as any, {
        ...(init as any),
        body,
        headers: mergeHeaders(init?.headers, codexHeaders),
      });
    }
  }

  return logCodexFailure(response as unknown as Response, input, body);
};

export function createOpenAICodexProvider(): OpenAIProvider {
  return createOpenAI({
    apiKey: DUMMY_API_KEY,
    baseURL: CODEX_BASE_URL,
    name: "openai-codex",
    fetch: codexFetch,
  });
}

export function getOpenAICodexModel(modelId: string = "gpt-5.5"): LanguageModel | null {
  if (!getStoredOpenAICodexCredentials()) {
    return null;
  }
  return createOpenAICodexProvider().responses(modelId);
}

export function isOpenAICodexConfigured(): boolean {
  return !!getStoredOpenAICodexCredentials();
}

export async function testOpenAICodexConnection(): Promise<boolean> {
  try {
    const credentials = await getValidOpenAICodexCredentials();
    return !!credentials;
  } catch {
    return false;
  }
}
