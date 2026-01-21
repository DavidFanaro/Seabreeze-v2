// Polyfills must be imported first for AI SDK streaming support
import "@/lib/polyfills";

import { Stack } from "expo-router";
import { Text, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, ThemeContext } from "@react-navigation/native";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync, SQLiteProvider } from "expo-sqlite";
import { Suspense } from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import migrations from "../drizzle/migrations";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import { ThemeProvider } from "@/components";
const dbname = "seabreeze";
import "@/global.css";

const expoDb = openDatabaseSync(dbname);
const db = drizzle(expoDb);
const queryClient = new QueryClient();

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  useDrizzleStudio(db.$client);

  if (error) {
    return (
      <View>
        <Text>Migration error: {error.message}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider defaultTheme="dark">
          <Suspense fallback={<Text>Loading</Text>}>
            <SQLiteProvider
              databaseName={dbname}
              useSuspense={true}
              options={{ enableChangeListener: true }}
            >
              <KeyboardProvider>
                <ThemeContext value={DarkTheme}>
                  <QueryClientProvider client={queryClient}>
                    <Stack>
                      <Stack.Screen
                        name="settings/index"
                        options={{
                          presentation: "fullScreenModal",
                        }}
                      />
                      <Stack.Screen
                        name="settings/general"
                        options={{
                          presentation: "fullScreenModal",
                        }}
                      />
                      <Stack.Screen
                        name="settings/openai"
                        options={{
                          presentation: "fullScreenModal",
                        }}
                      />
                      <Stack.Screen
                        name="settings/openrouter"
                        options={{
                          presentation: "fullScreenModal",
                        }}
                      />
                      <Stack.Screen
                        name="settings/ollama"
                        options={{
                          presentation: "fullScreenModal",
                        }}
                      />
                      <Stack.Screen
                        name="settings/apple"
                        options={{
                          presentation: "fullScreenModal",
                        }}
                      />
                    </Stack>
                  </QueryClientProvider>
                </ThemeContext>
              </KeyboardProvider>
            </SQLiteProvider>
          </Suspense>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
