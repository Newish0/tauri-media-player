import { basename, dirname } from "@tauri-apps/api/path";
import MpvPlayer from "./MpvPlayer";
import { FileEntry, readDir } from "@tauri-apps/api/fs";
import { isMediaFileByFileExtension, isVideoFileByFileExtension } from "@/lib/utils";
import { db } from "@/db/database";
import {
    mediaInfo as MediaInfoSchema,
    type playlist as PlaylistSchema,
    type playlistEntry as PlaylistEntrySchema,
} from "@/db/schema";
import Metadata from "@/services/Metadata";
import { InferQueryModel } from "@/db/types";

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

export class Playlist {
    private _entries: PlaylistEntry[];

    private constructor(entries: PlaylistEntry[]) {
        this._entries = entries;
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

            playlistEntries = await Promise.all(
                mediaFiles.map(async (f, index) => {
                    let mediaInfo:
                        | undefined
                        | typeof MediaInfoSchema.$inferInsert
                        | typeof MediaInfoSchema.$inferSelect = await db.query.mediaInfo.findFirst({
                        where: (mediaInfo, { eq }) => eq(mediaInfo.path, f.path),
                    });

                    console.log(mediaInfo);

                    if (!mediaInfo) {
                        mediaInfo = await Playlist.createMediaInfoFromFile(f);

                        // This shall not be awaited.
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
                        index,
                        mediaInfo,
                    };
                    return entry;
                })
            );
        }

        return playlistEntries;
    }

    public static async get(
        id: string | "current-folder",
        { createIfNotExists = true }: { createIfNotExists?: boolean } = {}
    ): Promise<Playlist> {
        if (id === "current-folder") {
            return new Playlist(await Playlist.getCurrentFolderPlaylistEntries());
        } else {
            // TODO: implement other playlists with `createIfNotExists`

            throw new Error("Other playlists not implemented yet.");
        }
    }

    get entries() {
        return this._entries;
    }
}
