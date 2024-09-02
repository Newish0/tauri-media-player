import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/db/schema.ts",
    dialect: "sqlite",
    dbCredentials: {
        url: ":memory:",
    },
    verbose: false,
    strict: true,
    out: "./src-tauri/migrations",
});
