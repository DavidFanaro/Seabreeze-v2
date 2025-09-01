import { Stack } from "expo-router";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import { Suspense } from "react";
import { openDatabaseSync, SQLiteProvider } from "expo-sqlite";
import { Spinner } from "@/components/ui/spinner";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { drizzle } from "drizzle-orm/expo-sqlite";
import migrations from "../drizzle/migrations";

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
        <GluestackUIProvider>
          <Stack />
        </GluestackUIProvider>
      </SQLiteProvider>
    </Suspense>
  );
}
