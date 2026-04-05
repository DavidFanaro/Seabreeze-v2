import { focusManager, QueryClientProvider } from "@tanstack/react-query";
import React, { useEffect, useState, type ReactNode } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";

import { createAppQueryClient } from "@/lib/query-client";

interface AppQueryProviderProps {
  children: ReactNode;
}

function handleAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== "web") {
    focusManager.setFocused(status === "active");
  }
}

export function AppQueryProvider({ children }: AppQueryProviderProps) {
  const [queryClient] = useState(() => createAppQueryClient());

  useEffect(() => {
    handleAppStateChange(AppState.currentState);

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
