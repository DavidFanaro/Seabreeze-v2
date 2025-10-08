import { Stack } from "expo-router";
import { Text } from "react-native";

import { DarkTheme, ThemeContext } from "@react-navigation/native";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync, SQLiteProvider } from "expo-sqlite";
import { Suspense } from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";
import migrations from "../drizzle/migrations";

const dbname = "seabreeze";
const expoDb = openDatabaseSync(dbname);
const db = drizzle(expoDb);

export default function RootLayout() {
  useMigrations(db, migrations);

  return (
    <Suspense fallback={<Text>Loading</Text>}>
      <SQLiteProvider
        databaseName={dbname}
        useSuspense={true}
        options={{ enableChangeListener: true }}
      >
        <KeyboardProvider>
          <ThemeContext value={DarkTheme}>
            <Stack />
          </ThemeContext>
        </KeyboardProvider>
      </SQLiteProvider>
    </Suspense>
  );
}
