import * as schema from "@/db/schema";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { migrate } from "./migrate";
import { invoke } from "@tauri-apps/api";
import { appDataDir, join } from "@tauri-apps/api/path";

export interface Database {
    execute(sql: string, params?: string[]): Promise<string[][]>;
}

class TauriSQLiteAdapter {
    private sqlite: Database;

    private constructor(sqlite: Database) {
        this.sqlite = sqlite;
    }

    public static async create(dbPath: string, autoRunMigrations = true) {
        console.log("dbPath", dbPath);
        const adapter = new TauriSQLiteAdapter({
            execute(sql: string, params?: unknown[]) {
                return invoke("db_execute", { dbPath, sql, params: params || [] });
            },
        });
        if (autoRunMigrations) await migrate(adapter.sqlite);
        return adapter;
    }

    async query(
        sql: string,
        params: unknown[],
        method: string
    ): Promise<{ rows: string[][] | string[] }> {
        let result: string[][] | string[];

        try {
            result = await this.sqlite.execute(
                sql,
                params.map((param: any) => `${param}`)
            );
        } catch (error) {
            console.error("SQL Error:", error);
            throw error;
        }

        console.log("sql", sql);

        console.log("query result", result);

        // When the method is get, you should return a value as {rows: string[]}.
        // Otherwise, you should return {rows: string[][]}.
        const finalResult = method === "get" ? result[0] : result;

        console.log("finalResult", finalResult);

        return { rows: finalResult };
    }
}

const dbPath = await join(await appDataDir(), "app.db");
const adapter = await TauriSQLiteAdapter.create(dbPath);

export const db = drizzle(
    (sql: string, params: unknown[], method: string) => adapter.query(sql, params, method),
    { schema, logger: true }
);
