import { QueryClient } from "@tanstack/react-query";

export const chatQueryKeys = {
  hydration: (chatIdParam: string) => ["chat", "hydration", chatIdParam] as const,
};

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
      },
    },
  });
}
