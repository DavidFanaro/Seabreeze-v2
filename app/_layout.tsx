// Polyfills must be imported first for AI SDK streaming support
import "@/lib/polyfills";
import "@/global.css";

import { Stack } from "expo-router";
import { Text, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  DarkTheme,
  DefaultTheme,
  ThemeContext,
} from "@react-navigation/native";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync, SQLiteProvider } from "expo-sqlite";
import { Suspense } from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { HeroUINativeProvider } from "heroui-native";

import migrations from "../drizzle/migrations";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import { ThemeProvider, useTheme } from "@/components";
import { HeroUIThemeProvider } from "@/components/ui/HeroUIThemeProvider";

const dbname = "seabreeze";

const expoDb = openDatabaseSync(dbname);
const db = drizzle(expoDb);
const queryClient = new QueryClient();

export const unstable_settings = {
  initialRouteName: "index",
};

/**
 * Inner layout component that has access to ThemeProvider context
 * and can provide the correct navigation theme based on current app theme
 */
function NavigationContent() {
  const { theme, themeType } = useTheme();

  // Create a custom navigation theme that uses our app's theme colors
  const isLightTheme = themeType === "light";
  const baseTheme = isLightTheme ? DefaultTheme : DarkTheme;

  const navigationTheme = {
    ...baseTheme,
    dark: !isLightTheme,
    colors: {
      ...baseTheme.colors,
      primary: theme.colors.accent,
      background: theme.colors.background,
      card: theme.colors.background,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.accent,
    },
  };

  return (
    <Suspense fallback={<Text>Loading</Text>}>
      <SQLiteProvider
        databaseName={dbname}
        useSuspense={true}
        options={{ enableChangeListener: true }}
      >
        <KeyboardProvider>
          <ThemeContext value={navigationTheme}>
            <QueryClientProvider client={queryClient}>
              <Stack>
                <Stack.Screen
                  name="index"
                  options={{
                    freezeOnBlur: true,
                  }}
                />
                <Stack.Screen
                  name="settings/index"
                  options={{
                    presentation: "card",
                  }}
                />
                <Stack.Screen
                  name="settings/openai"
                  options={{
                    presentation: "card",
                  }}
                />
                <Stack.Screen
                  name="settings/openrouter"
                  options={{
                    presentation: "card",
                  }}
                />
                <Stack.Screen
                  name="settings/ollama"
                  options={{
                    presentation: "card",
                  }}
                />
                <Stack.Screen
                  name="settings/apple"
                  options={{
                    presentation: "card",
                  }}
                />
                <Stack.Screen
                  name="settings/appearance"
                  options={{
                    presentation: "card",
                  }}
                />
              </Stack>
            </QueryClientProvider>
          </ThemeContext>
        </KeyboardProvider>
      </SQLiteProvider>
    </Suspense>
  );
}

export default function RootLayout() {
  const { error } = useMigrations(db, migrations);
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
      <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
        <ThemeProvider defaultTheme="dark">
          <HeroUIThemeProvider>
            <NavigationContent />
          </HeroUIThemeProvider>
        </ThemeProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
