import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const playlist = sqliteTable("playlist", {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    index: integer("index").notNull(),
});

export const playlistEntry = sqliteTable("playlist_entry", {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    path: text("path").notNull(),

    /*
     * The position in the playlist; used for targeting which entry to play
     * WARNING: this field should be immutable.
     */
    index: integer("index").notNull(),

    /* The position of entry to be displayed in the playlist depending on the sorting */
    sortIndex: integer("sort_index").notNull(),

    playlistId: integer("playlist_id")
        .references(() => playlist.id, {
            onDelete: "cascade",
        })
        .notNull(),
});

export const mediaInfo = sqliteTable("media_info", {
    path: text("path").notNull().primaryKey(), // TODO: use file hash as key. For now, we store a media info per file (ignore dup file for simplicity)
    title: text("title").notNull(),
    artist: text("artist"),
    album: text("album"),
    year: integer("year"),
    track: integer("track"),
    totalTracks: integer("total_tracks"),
    disc: integer("disc"),
    totalDiscs: integer("total_discs"),
    genre: text("genre"),
    // pictures: text("pictures"), // TODO: handle pictures later
    duration: integer("duration"),
    bitrate: integer("bitrate"),
    sampleRate: integer("sample_rate"),
    channels: integer("channels"),
    bitDepth: integer("bit_depth"),
    isVideo: integer("is_video", { mode: "boolean" }).default(false),
});

export const playlistEntryRelations = relations(playlistEntry, ({ one }) => ({
    mediaInfo: one(mediaInfo, {
        fields: [playlistEntry.path],
        references: [mediaInfo.path],
    }),
    playlist: one(playlist, {
        fields: [playlistEntry.playlistId],
        references: [playlist.id],
    }),
}));

export const playlistRelations = relations(playlist, ({ many }) => ({
    entries: many(playlistEntry),
}));
