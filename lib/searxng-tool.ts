import { jsonSchema, tool, type Tool } from "ai";

import {
  mapSearxngErrorToMessage,
  searchSearxng,
  type SearxngSearchResult,
} from "@/lib/searxng-client";
import type {
  ChatWebSearchAnnotation,
  ChatWebSearchQueryRun,
} from "@/types/chat.types";
import type { ProviderId } from "@/types/provider.types";

interface SearchToolInput {
  query: string;
}

interface SearchToolOutput {
  query: string;
  resultCount: number;
  sources: SearxngSearchResult["sources"];
  error?: string;
}

interface CreateSearxngToolRuntimeOptions {
  searxngUrl: string;
  enabled: boolean;
  onAnnotationChange?: (annotation: ChatWebSearchAnnotation | null) => void;
}

type SearchToolSet = {
  searchWeb: Tool<SearchToolInput, SearchToolOutput>;
};

const SEARCH_TOOL_SCHEMA = jsonSchema<SearchToolInput>(
  {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "A concise web search query for fresh or internet-based information.",
        minLength: 1,
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  {
    validate: (value) => {
      if (!value || typeof value !== "object") {
        return { success: false, error: new Error("Tool input must be an object.") };
      }

      const query = (value as { query?: unknown }).query;
      if (typeof query !== "string" || query.trim().length === 0) {
        return { success: false, error: new Error("Search query is required.") };
      }

      return {
        success: true,
        value: { query: query.trim() },
      };
    },
  },
);

const normalizeQueryKey = (query: string): string => query.trim().toLowerCase();

const cloneQueries = (queries: ChatWebSearchQueryRun[]): ChatWebSearchQueryRun[] => {
  return queries.map((query) => ({
    ...query,
    sources: query.sources.map((source) => ({ ...source })),
  }));
};

export const WEB_SEARCH_SYSTEM_PROMPT = [
  "Web search is available via the searchWeb tool.",
  "Use it when the user asks for recent, factual, or internet-dependent information.",
  "Do not invent citations. Only cite URLs that come back from searchWeb.",
  "When you use web results in the answer, include a short Sources section with markdown links.",
].join(" ");

export interface SearxngToolRuntime {
  readonly enabled: boolean;
  createTools: (provider: ProviderId) => SearchToolSet | undefined;
  getAnnotationSnapshot: () => ChatWebSearchAnnotation | null;
}

export const createSearxngToolRuntime = (
  options: CreateSearxngToolRuntimeOptions,
): SearxngToolRuntime => {
  const queries: ChatWebSearchQueryRun[] = [];
  const cache = new Map<string, Promise<SearxngSearchResult>>();

  const emitAnnotationChange = (): void => {
    options.onAnnotationChange?.(buildAnnotationSnapshot());
  };

  const buildAnnotationSnapshot = (): ChatWebSearchAnnotation | null => {
    if (queries.length === 0) {
      return null;
    }

    const hasError = queries.some((query) => query.status === "error");
    const isSearching = queries.some((query) => query.status === "searching");
    const status = isSearching ? "searching" : hasError ? "error" : "success";
    const totalSources = queries.reduce((total, query) => total + query.sources.length, 0);

    return {
      type: "web-search",
      status,
      queries: cloneQueries(queries),
      totalSources,
    };
  };

  const runSearch = async (provider: ProviderId, rawQuery: string): Promise<SearchToolOutput> => {
    const query = rawQuery.trim();
    const queryKey = normalizeQueryKey(query);

    const cachedSearch = cache.get(queryKey);
    if (cachedSearch) {
      try {
        const cachedResult = await cachedSearch;
        return {
          query: cachedResult.query,
          resultCount: cachedResult.sources.length,
          sources: cachedResult.sources,
        };
      } catch (error) {
        return {
          query,
          resultCount: 0,
          sources: [],
          error: mapSearxngErrorToMessage(error),
        };
      }
    }

    const queryRun: ChatWebSearchQueryRun = {
      query,
      provider,
      status: "searching",
      resultCount: 0,
      sources: [],
      startedAt: Date.now(),
    };
    queries.push(queryRun);
    emitAnnotationChange();

    const searchPromise = searchSearxng(query, {
      url: options.searxngUrl,
    });
    cache.set(queryKey, searchPromise);

    try {
      const result = await searchPromise;
      queryRun.status = "success";
      queryRun.resultCount = result.sources.length;
      queryRun.sources = result.sources;
      queryRun.completedAt = Date.now();
      emitAnnotationChange();

      return {
        query: result.query,
        resultCount: result.sources.length,
        sources: result.sources,
      };
    } catch (error) {
      queryRun.status = "error";
      queryRun.error = mapSearxngErrorToMessage(error);
      queryRun.completedAt = Date.now();
      emitAnnotationChange();
      return {
        query,
        resultCount: 0,
        sources: [],
        error: queryRun.error,
      };
    }
  };

  const createTools = (provider: ProviderId): SearchToolSet | undefined => {
    if (!options.enabled) {
      return undefined;
    }

    return {
      searchWeb: tool<SearchToolInput, SearchToolOutput>({
        description: "Search the public web for current or source-backed information.",
        inputSchema: SEARCH_TOOL_SCHEMA,
        execute: async ({ query }) => runSearch(provider, query),
      }),
    };
  };

  return {
    enabled: options.enabled,
    createTools,
    getAnnotationSnapshot: buildAnnotationSnapshot,
  };
};
