// Polyfills must be imported first for AI SDK streaming support
import "@/lib/polyfills";
import "@/global.css";

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
import { AppQueryProvider } from "@/components/providers/AppQueryProvider";
import { ThemeProvider, useTheme } from "@/components/ui/ThemeProvider";
import useDatabase, { dbname } from "@/hooks/useDatabase";

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
      <ThemeContext value={navigationTheme}>
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
            name="settings/opencode"
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
          <Stack.Screen
            name="settings/search"
            options={{
              presentation: "card",
            }}
          />
        </Stack>
      </ThemeContext>
    </KeyboardProvider>
  );
}

function DatabaseGate() {
  const db = useDatabase();
  const { error, success } = useMigrations(db, migrations);

  useDrizzleStudio(db.$client);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Text style={{ color: "#ff6b6b", fontSize: 16, textAlign: "center", padding: 20 }}>
          Migration error: {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Text style={{ color: "#fff", fontSize: 16 }}>Running migrations...</Text>
      </View>
    );
  }

  return <NavigationContent />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
        <ThemeProvider defaultTheme="dark">
          <AppQueryProvider>
            <Suspense fallback={<Text>Loading</Text>}>
              <SQLiteProvider
                databaseName={dbname}
                useSuspense={true}
                options={{ enableChangeListener: true }}
              >
                <DatabaseGate />
              </SQLiteProvider>
            </Suspense>
          </AppQueryProvider>
        </ThemeProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
