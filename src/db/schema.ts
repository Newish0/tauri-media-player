import { integer, sqliteTable, text, } from "drizzle-orm/sqlite-core";

export const mediaEntires = sqliteTable("media_entries", {
    filePath: text("file_path").notNull(),
});
