import { basename, dirname } from "@tauri-apps/api/path";
import MpvPlayer from "./MpvPlayer";
import { readDir } from "@tauri-apps/api/fs";
import { isMediaFileByFileExtension } from "@/lib/utils";

export type PlaylistEntry = {
    path: string;
    name: string;
};

export class PlaylistSvc {
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

    public static async getPlaylistEntries(id: "current-folder" | string): Promise<PlaylistEntry[]> {
        if (id === "current-folder") {
            return PlaylistSvc.getCurrentFolderPlaylistEntries();
        } else {
            throw new Error("Other playlists not implemented yet.");
        }
    }
}
