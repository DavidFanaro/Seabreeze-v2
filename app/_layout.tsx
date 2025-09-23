import { Stack } from "expo-router";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import { Suspense } from "react";
import { openDatabaseSync, SQLiteProvider } from "expo-sqlite";
import { Spinner } from "@/components/ui/spinner";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { drizzle } from "drizzle-orm/expo-sqlite";
import migrations from "../drizzle/migrations";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ThemeContext, DarkTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const dbname = "seabreeze";
const expoDb = openDatabaseSync(dbname);
const db = drizzle(expoDb);

export default function RootLayout() {
  useMigrations(db, migrations);

  return (
    <Suspense fallback={<Spinner size="large" color="grey" />}>
      <SQLiteProvider
        databaseName={dbname}
        useSuspense={true}
        options={{ enableChangeListener: true }}
      >
        <KeyboardProvider>
          <GluestackUIProvider>
            <ThemeContext value={DarkTheme}>
              <SafeAreaProvider>
                <Stack />
              </SafeAreaProvider>
            </ThemeContext>
          </GluestackUIProvider>
        </KeyboardProvider>
      </SQLiteProvider>
    </Suspense>
  );
}
