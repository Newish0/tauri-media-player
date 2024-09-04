import { basename, dirname } from "@tauri-apps/api/path";
import MpvPlayer from "./MpvPlayer";
import { readDir } from "@tauri-apps/api/fs";
import { isMediaFileByFileExtension } from "@/lib/utils";

export type PlaylistEntry = {
    path: string;
    name: string;
};

export class Playlist {
    private _entries: PlaylistEntry[];

    private constructor(entries: PlaylistEntry[]) {
        this._entries = entries;
    }

    /**
     * Current folder playlist will show all media
     * files in the current folder as playlist entries.
     */
    private static async getCurrentFolderPlaylistEntries(): Promise<PlaylistEntry[]> {
        let playlistEntries: PlaylistEntry[] = [];

        const currentFilepath = await MpvPlayer.getPath().catch(() => undefined);

        if (currentFilepath) {
            const dirPath = await dirname(currentFilepath);
            const files = await readDir(dirPath);
            const mediaFiles = files.filter((f) => isMediaFileByFileExtension(f.path));

            for (const f of mediaFiles) {
                playlistEntries.push({
                    name: f.name ?? (await basename(f.path)),
                    path: f.path,
                });
            }
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
