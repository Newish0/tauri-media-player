import { drizzle } from "drizzle-orm/sqlite-proxy";
import Database from "tauri-plugin-sql-api";
import * as schema from "@/db/schema";
import { migrate } from "./migrate";

type QueryResult = Record<string, unknown>;

class TauriSQLiteAdapter {
    private sqlite: Database;

    private constructor(sqlite: Database) {
        this.sqlite = sqlite;
    }

    public static async create(dbPath: string, autoRunMigrations = true) {
        const adapter = new TauriSQLiteAdapter(await Database.load(`sqlite:${dbPath}`));
        if (autoRunMigrations) await migrate(adapter.sqlite);
        return adapter;
    }

    async query(
        sql: string,
        params: unknown[],
        method: string
    ): Promise<{ rows: any[][] | any[] }> {
        const isSelect = sql.trim().toLowerCase().startsWith("select");
        let result: any;

        try {
            // HACK: Use `sqlite.select` for eeverything including `insert` and `update`
            //       so `returning` works properly. See below for the expected code.
            result = await this.sqlite.select(sql, params);

            // Expected code for the above HACK:
            // if (isSelect) {
            //     result = await this.sqlite.select(sql, params);
            // } else {
            //     result = await this.sqlite.execute(sql, params);
            // }
        } catch (error) {
            console.error("SQL Error:", error);
            throw error;
        }

        const columns = this.extractColumns(sql);
        const orderedRows = this.orderRows(result, columns);

        // If the method is "all", return all rows
        const finalResult = method === "all" ? orderedRows : orderedRows[0];

        return { rows: finalResult };
    }

    private extractColumns(sql: string): string[] {
        const columnsRegex = /SELECT\s+(.+?)\s+FROM/i;
        const match = sql.match(columnsRegex);
        if (!match) return [];
        return match[1].split(",").map((col) => col.trim().replace(/"/g, ""));
    }

    private orderRows(rows: QueryResult[], columns: string[]): string[][] {
        // HACK: Workaround to get object back to what Drizzle expects
        // Source: OliveiraCleidson - https://github.com/tdwesten/tauri-drizzle-sqlite-proxy-demo/issues/1#issuecomment-2304630172
        const orderedRows = rows.map((row: any) => {
            // Order the values in the row based on the order of the columns
            // This is necessary because the order of the values in the row is not guaranteed
            // when using the select method
            const orderedRow: Record<string, any> = {};
            columns.forEach((column) => {
                orderedRow[column] = row[column];
            });

            // The logic can be replaced for not use Object Values, but I worked in this 4 a.m.
            // I will refactor
            return Object.values(orderedRow);
        });

        return orderedRows;
    }
}

const dbPath = "app.db";
const adapter = await TauriSQLiteAdapter.create(dbPath);

export const db = drizzle(
    (sql: string, params: unknown[], method: string) => adapter.query(sql, params, method),
    { schema, logger: true }
);
