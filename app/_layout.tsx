import { Stack } from "expo-router";
import { Text } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
const queryClient = new QueryClient();

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
                        <QueryClientProvider client={queryClient}>
                            <Stack>
                                <Stack.Screen
                                    name="settings/index"
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
    );
}
