import { drizzle } from "drizzle-orm/sqlite-proxy";
import Database from "tauri-plugin-sql-api";
import * as schema from "@/db/schema";
import { migrate } from "./migrate";

/**
 * Represents the result of a SELECT query.
 */
export type SelectQueryResult = {
    [key: string]: any;
};

/**
 * Loads the sqlite database via the Tauri Proxy.
 */
export const sqlite = await Database.load("sqlite:app.db");

/**
 * The drizzle database instance.
 */
export const db = drizzle<typeof schema>(
    async (sql, params, method) => {
        let rows: any = [];
        let results = [];

        // If the query is a SELECT, use the select method
        if (isSelectQuery(sql)) {
            rows = await sqlite.select(sql, params).catch((e) => {
                console.error("SQL Error:", e);
                return [];
            });
        } else {
            // Otherwise, use the execute method
            rows = await sqlite.execute(sql, params).catch((e) => {
                console.error("SQL Error:", e);
                return [];
            });
            return { rows: [] };
        }

        const columnsRegex = /SELECT\s+(.+)\s+FROM/i;
        const columnsMatch = sql.match(columnsRegex);
        let columns: string[] = [];
        if (columnsMatch) {
            columns = columnsMatch[1].split(",");
            columns = columns.map((column) => column.trim().replace(/"/g, ""));
        }

        // Workaround to get object back to what Drizzle expects
        // Source: OliveiraCleidson - https://github.com/tdwesten/tauri-drizzle-sqlite-proxy-demo/issues/1#issuecomment-2304630172
        rows = rows.map((row: any) => {
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

        // If the method is "all", return all rows
        results = method === "all" ? rows : rows[0];

        return { rows: results };
    },
    // Pass the schema to the drizzle instance
    { schema: schema, logger: true }
);

/**
 * Checks if the given SQL query is a SELECT query.
 * @param sql The SQL query to check.
 * @returns True if the query is a SELECT query, false otherwise.
 */
function isSelectQuery(sql: string): boolean {
    const selectRegex = /^\s*SELECT\b/i;
    return selectRegex.test(sql);
}

await migrate(); // migrate each time we try to use db
