import { basename, dirname } from "@tauri-apps/api/path";
import MpvPlayer from "./MpvPlayer";
import { FileEntry, readDir } from "@tauri-apps/api/fs";
import { isMediaFileByFileExtension, isVideoFileByFileExtension } from "@/lib/utils";
import { db } from "@/db/database";
import {
    mediaInfo as MediaInfoSchema,
    playlist as PlaylistSchema,
    type playlistEntry as PlaylistEntrySchema,
} from "@/db/schema";
import Metadata from "@/services/Metadata";
import { InferQueryModel } from "@/db/types";
import { count, eq } from "drizzle-orm";

export type PlaylistEntry =
    | (typeof PlaylistEntrySchema.$inferInsert & {
          mediaInfo: typeof MediaInfoSchema.$inferInsert;
      })
    | InferQueryModel<
          "playlistEntry",
          {
              with: {
                  mediaInfo: true;
              };
          }
      >;

type DBPlaylist = typeof PlaylistSchema.$inferSelect;
export class Playlist implements DBPlaylist {
    private _entries: PlaylistEntry[];

    public id: number;
    public name: string;
    public index: number;

    private constructor(
        entries: PlaylistEntry[],
        playlist: DBPlaylist = { id: -1, name: "Unknown Playlist", index: -1 }
    ) {
        this._entries = entries;
        this.id = playlist.id;
        this.name = playlist.name;
        this.index = playlist.index;
    }

    private static async createMediaInfoFromFile(
        f: FileEntry
    ): Promise<typeof MediaInfoSchema.$inferInsert> {
        const isVideo = isVideoFileByFileExtension(f.path);
        const metadata = await Metadata.get(f.path).catch(() => undefined);
        const altName = f.name ?? (await basename(f.path));

        // Video files should use file name instead of media info title.
        const title = isVideo ? altName : metadata?.title ?? altName;

        const mediaInfo = {
            ...metadata,
            title,
            path: f.path,
            isVideo,
        };

        return mediaInfo;
    }

    /**
     * Current folder playlist will show all media files in the current folder as playlist entries.
     *
     * **IMPORTANT**: Playlist entries for `current-folder` will **NOT** be stored in the database. But, `MediaInfo` of the files will.
     *
     */
    private static async getCurrentFolderPlaylistEntries(): Promise<PlaylistEntry[]> {
        let playlistEntries: PlaylistEntry[] = [];

        const currentFilepath = await MpvPlayer.getPath().catch(() => undefined);

        if (currentFilepath) {
            const dirPath = await dirname(currentFilepath);
            const files = await readDir(dirPath);
            const mediaFiles = files.filter((f) => isMediaFileByFileExtension(f.path));

            for (const f of mediaFiles) {
                // Try to get media info from the database.
                let mediaInfo:
                    | undefined
                    | typeof MediaInfoSchema.$inferInsert
                    | typeof MediaInfoSchema.$inferSelect = await db.query.mediaInfo.findFirst({
                    where: (mediaInfo, { eq }) => eq(mediaInfo.path, f.path),
                });

                if (!mediaInfo) {
                    mediaInfo = await Playlist.createMediaInfoFromFile(f);

                    // Add media info to the database.
                    await db
                        .insert(MediaInfoSchema)
                        .values(mediaInfo)
                        .onConflictDoNothing()
                        .catch(() => {
                            /* ignore */
                        });
                }

                const entry: PlaylistEntry = {
                    path: f.path,
                    id: -1,
                    playlistId: -1,
                    index: playlistEntries.length,
                    mediaInfo,
                };
                playlistEntries.push(entry);
            } // for
        }

        return playlistEntries;
    }

    public static async create(name?: string): Promise<Playlist> {
        if (!name) {
            name = "New Playlist";
        }

        // New playlist will be added at the end of the playlist list.
        const currentNumberOfPlaylists = await db
            .select({ count: count() })
            .from(PlaylistSchema)
            .then((r) => r[0].count);

        const playlists = await db
            .insert(PlaylistSchema)
            .values({ name, index: currentNumberOfPlaylists })
            .returning();
        const playlist = playlists[0];

        if (!playlist) {
            console.log(playlists, playlist);
            throw new Error("Failed to create playlist");
        }

        return new Playlist([], playlist);
    }

    public static async get(
        id: string | "current-folder",
        { createIfNotExists = true }: { createIfNotExists?: boolean } = {}
    ): Promise<Playlist> {
        if (id === "current-folder") {
            return new Playlist(await Playlist.getCurrentFolderPlaylistEntries());
        } else {
            let dbPlaylist = await db.query.playlist.findFirst({
                where: (playlist, { eq }) => eq(playlist.id, parseInt(id)),
            });

            if (dbPlaylist) {
                return new Playlist([], dbPlaylist);
            } else if (createIfNotExists) {
                return Playlist.create();
            } else {
                throw new Error("Playlist not found");
            }
        }
    }

    public static async getAll(): Promise<Playlist[]> {
        const playlists = await db.query.playlist.findMany();
        return playlists.map((playlist) => new Playlist([], playlist));
    }

    public async update(playlist: Partial<Omit<this, "id" | "entries">>) {
        // Update playlist name in the database.
        const updatedPlaylist = await db
            .update(PlaylistSchema)
            .set({ ...playlist })
            .where(eq(PlaylistSchema.id, this.id))
            .returning()
            .then((r) => r[0]);

        if (!updatedPlaylist) {
            throw new Error("Failed to edit playlist");
        }

        this.name = updatedPlaylist.name;
        this.index = updatedPlaylist.index;

        return this;
    }

    public async delete() {
        await db.delete(PlaylistSchema).where(eq(PlaylistSchema.id, this.id));
    }

    get entries() {
        return this._entries;
    }
}
