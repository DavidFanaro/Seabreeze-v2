import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "../drizzle/migrations";
import * as schema from "../db/schema";

export const dbname = "seabreeze";

const expoDb = openDatabaseSync(dbname, {
    enableChangeListener: true,
});
const db = drizzle(expoDb, { schema });

export default function useDatabase() {
    return db;
}
