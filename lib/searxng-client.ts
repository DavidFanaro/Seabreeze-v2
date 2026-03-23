import { fetch as expoFetch } from "expo/fetch";

import type { ChatWebSearchSource } from "@/types/chat.types";

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_RESULTS = 5;

type SearxngErrorCode =
  | "not_configured"
  | "invalid_url"
  | "timeout"
  | "network"
  | "http"
  | "invalid_response"
  | "json_disabled";

export class SearxngClientError extends Error {
  readonly code: SearxngErrorCode;
  readonly status?: number;

  constructor(message: string, code: SearxngErrorCode, status?: number) {
    super(message);
    this.name = "SearxngClientError";
    this.code = code;
    this.status = status;
  }
}

export interface SearxngSearchResult {
  query: string;
  sources: ChatWebSearchSource[];
}

interface SearxngClientOptions {
  url: string | null | undefined;
  timeoutMs?: number;
  maxResults?: number;
}

interface SearxngResultCandidate {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  engine?: unknown;
  publishedDate?: unknown;
  published_date?: unknown;
}

const isAbortError = (error: unknown): boolean => {
  return error instanceof Error && error.name === "AbortError";
};

export const normalizeSearxngUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new SearxngClientError("Enter your SearXNG instance URL first.", "not_configured");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    throw new SearxngClientError("Enter a valid SearXNG URL.", "invalid_url");
  }

  if (!(parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:")) {
    throw new SearxngClientError("SearXNG URLs must use http or https.", "invalid_url");
  }

  parsedUrl.hash = "";
  parsedUrl.search = "";
  parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, "");

  if (!parsedUrl.pathname.endsWith("/search")) {
    parsedUrl.pathname = `${parsedUrl.pathname}/search`.replace(/\/\/+/g, "/");
  }

  return parsedUrl.toString();
};

const coerceSource = (candidate: SearxngResultCandidate): ChatWebSearchSource | null => {
  if (typeof candidate.url !== "string" || candidate.url.trim().length === 0) {
    return null;
  }

  const title = typeof candidate.title === "string" && candidate.title.trim().length > 0
    ? candidate.title.trim()
    : candidate.url;
  const snippet = typeof candidate.content === "string" ? candidate.content.trim() : undefined;
  const engine = typeof candidate.engine === "string" && candidate.engine.trim().length > 0
    ? candidate.engine.trim()
    : undefined;
  const publishedDateRaw = typeof candidate.publishedDate === "string"
    ? candidate.publishedDate
    : typeof candidate.published_date === "string"
      ? candidate.published_date
      : undefined;

  return {
    title,
    url: candidate.url,
    snippet: snippet && snippet.length > 0 ? snippet : undefined,
    engine,
    publishedDate: publishedDateRaw?.trim() || undefined,
  };
};

const dedupeSources = (sources: ChatWebSearchSource[]): ChatWebSearchSource[] => {
  const seen = new Set<string>();

  return sources.filter((source) => {
    const key = source.url.trim().toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const buildSearchUrl = (baseUrl: string, query: string): string => {
  const parsedUrl = new URL(baseUrl);
  parsedUrl.searchParams.set("q", query);
  parsedUrl.searchParams.set("format", "json");
  parsedUrl.searchParams.set("categories", "general");
  parsedUrl.searchParams.set("safesearch", "0");
  parsedUrl.searchParams.set("pageno", "1");
  return parsedUrl.toString();
};

export const mapSearxngErrorToMessage = (error: unknown): string => {
  if (!(error instanceof SearxngClientError)) {
    return "Web search failed.";
  }

  switch (error.code) {
    case "not_configured":
      return "Configure your SearXNG instance in Settings before using web search.";
    case "invalid_url":
      return error.message;
    case "timeout":
      return "SearXNG took too long to respond. Check your connection and try again.";
    case "json_disabled":
      return "This SearXNG instance did not return JSON. Enable the JSON format/API on the instance.";
    case "network":
      return "Could not reach your SearXNG instance.";
    case "http":
      return `SearXNG returned HTTP ${error.status ?? "error"}.`;
    case "invalid_response":
    default:
      return "SearXNG returned an unexpected response.";
  }
};

export const searchSearxng = async (
  query: string,
  options: SearxngClientOptions,
): Promise<SearxngSearchResult> => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return {
      query: "",
      sources: [],
    };
  }

  const baseUrl = normalizeSearxngUrl(options.url ?? "");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await expoFetch(buildSearchUrl(baseUrl, normalizedQuery), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new SearxngClientError(
          "This SearXNG instance blocked JSON responses.",
          "json_disabled",
          response.status,
        );
      }

      throw new SearxngClientError(
        `SearXNG returned HTTP ${response.status}.`,
        "http",
        response.status,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new SearxngClientError(
        "SearXNG did not return valid JSON.",
        "json_disabled",
      );
    }

    if (!payload || typeof payload !== "object") {
      throw new SearxngClientError(
        "SearXNG did not return a valid search payload.",
        "invalid_response",
      );
    }

    const resultCandidates = Array.isArray((payload as { results?: unknown }).results)
      ? (payload as { results: unknown[] }).results
      : null;

    if (!resultCandidates) {
      throw new SearxngClientError(
        "SearXNG did not return a results array.",
        "invalid_response",
      );
    }

    const normalizedSources = dedupeSources(
      resultCandidates
        .map((candidate) => coerceSource(candidate as SearxngResultCandidate))
        .filter((candidate): candidate is ChatWebSearchSource => candidate !== null),
    ).slice(0, options.maxResults ?? DEFAULT_MAX_RESULTS);

    return {
      query: normalizedQuery,
      sources: normalizedSources,
    };
  } catch (error) {
    if (isAbortError(error)) {
      throw new SearxngClientError(
        "SearXNG timed out.",
        "timeout",
      );
    }

    if (error instanceof SearxngClientError) {
      throw error;
    }

    throw new SearxngClientError(
      error instanceof Error ? error.message : "Could not reach SearXNG.",
      "network",
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

export const testSearxngConnection = async (url: string): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    await searchSearxng("seabreeze connectivity check", {
      url,
      timeoutMs: 8000,
      maxResults: 1,
    });

    return {
      success: true,
      message: "Connected successfully! JSON search responses are available.",
    };
  } catch (error) {
    return {
      success: false,
      message: mapSearxngErrorToMessage(error),
    };
  }
};
