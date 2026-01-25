// Polyfills must be imported first for AI SDK streaming support
import "@/lib/polyfills";
import "@/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  DarkTheme,
  DefaultTheme,
  ThemeContext,
} from "@react-navigation/native";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import { Suspense } from "react";
import { Text, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { HeroUINativeProvider } from "heroui-native";

import migrations from "../drizzle/migrations";
import { ThemeProvider, useTheme } from "@/components";
import { HeroUIThemeProvider } from "@/components/ui/HeroUIThemeProvider";
import useDatabase, { dbname } from "@/hooks/useDatabase";
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

  // Theme configuration: Determine if currently using light or dark theme
  const isLightTheme = themeType === "light";
  // Select base theme from React Navigation based on current theme type
  const baseTheme = isLightTheme ? DefaultTheme : DarkTheme;

  // Navigation theme object: Maps application theme colors to React Navigation theme structure
  const navigationTheme = {
    ...baseTheme,
    dark: !isLightTheme,
    // Colors mapping: Apply app theme colors to navigation components (primary, background, text, etc.)
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
    <KeyboardProvider>
      {/* ThemeContext: Supplies navigation theme to React Navigation components */}
      <ThemeContext value={navigationTheme}>
        {/* QueryClientProvider: React Query cache provider for API state management */}
        <QueryClientProvider client={queryClient}>
          {/* Stack Navigator: Root navigation stack containing all app screens */}
          <Stack>
            {/* Home Screen: Main chat interface (freezeOnBlur preserves state when switching apps) */}
            <Stack.Screen
              name="index"
              options={{
                freezeOnBlur: true,
              }}
            />
            {/* Settings Section: Provider configuration and general settings screens (card presentation for modal appearance) */}
            {/* Settings - Main: Primary settings interface hub */}
            <Stack.Screen
              name="settings/index"
              options={{
                presentation: "card",
              }}
            />
            {/* Settings - OpenAI: OpenAI provider API key and model configuration */}
            <Stack.Screen
              name="settings/openai"
              options={{
                presentation: "card",
              }}
            />
            {/* Settings - OpenRouter: OpenRouter provider API key and model configuration */}
            <Stack.Screen
              name="settings/openrouter"
              options={{
                presentation: "card",
              }}
            />
            {/* Settings - Ollama: Ollama local provider connection and model settings */}
            <Stack.Screen
              name="settings/ollama"
              options={{
                presentation: "card",
              }}
            />
            {/* Settings - Apple: Apple Intelligence provider configuration and permissions */}
            <Stack.Screen
              name="settings/apple"
              options={{
                presentation: "card",
              }}
            />
            {/* Settings - Appearance: Theme and visual preferences (light/dark mode, accent colors) */}
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
  );
}

function DatabaseGate() {
  const db = useDatabase();
  const { error, success } = useMigrations(db, migrations);

  useDrizzleStudio(db.$client);

  // Error state: Display migration error message if database migrations fail
  if (error) {
    return (
      <View>
        {/* Error message label: Shows detailed migration error information to user */}
        <Text>Migration error: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View>
        <Text>Running migrations...</Text>
      </View>
    );
  }

  return <NavigationContent />;
}

export default function RootLayout() {
  // Main layout UI hierarchy with nested providers and theme configuration
  return (
    // GestureHandlerRootView: Root container for gesture handling (flex: 1 makes it fill available space)
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* HeroUI Native provider: Configures HeroUI component library and styling (devInfo disabled for production) */}
      <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
        {/* ThemeProvider: Application-wide theme context with default dark theme */}
        <ThemeProvider defaultTheme="dark">
          {/* HeroUIThemeProvider: Integrates HeroUI components with custom theme */}
          <HeroUIThemeProvider>
            {/* Suspense boundary: Loading fallback while database provider initializes */}
            <Suspense fallback={<Text>Loading</Text>}>
              {/* SQLiteProvider: Database connection provider with change listener enabled for reactive updates */}
              <SQLiteProvider
                databaseName={dbname}
                useSuspense={true}
                options={{ enableChangeListener: true }}
              >
                {/* DatabaseGate: Runs migrations before rendering navigation content */}
                <DatabaseGate />
              </SQLiteProvider>
            </Suspense>
          </HeroUIThemeProvider>
        </ThemeProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
