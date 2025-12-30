import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "../db/schema";

export default function useDatabase() {
    const expoDb = openDatabaseSync("seabreeze", {
        enableChangeListener: true,
    });
    const db = drizzle(expoDb, { schema });
    return db;
}
