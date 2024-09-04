import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFullscreenAsFocusedPlayer, useMpvPlayer } from "@/hooks/use-mpv-player";
import { cn, isMediaFileByFileExtension, isVideoFileByFileExtension } from "@/lib/utils";
import MpvPlayer, { MpvEventId } from "@/services/MpvPlayer";
import { readDir } from "@tauri-apps/api/fs";
import { dirname, basename } from "@tauri-apps/api/path";
import { useEffect } from "react";
import { LoaderFunction, useLoaderData, useNavigate, useRevalidator } from "react-router-dom";

import { open } from "@tauri-apps/api/dialog";
import { useWindowFullscreen } from "@/hooks/use-tauri-window";
interface IPlaylistEntry {
    name: string;
    path: string;
}

export const loader = (async ({
    params,
}): Promise<{
    playlistEntries: IPlaylistEntry[];
}> => {
    const { id } = params;

    let playlistEntries: IPlaylistEntry[] = [];

    /**
     * Current folder playlist will show all media
     * files in the current folder as playlist entries.
     */
    if (id === "current-folder") {
        // TODO: move the generation of playlist data to the PLaylist service.
        //       The loader should only call `Playlist.getPlaylistEntries("some-id")`.
        //       IN the case of `current-folder` it should call the `Playlist.getPlaylistEntries("current-folder")`
        //       The playlist service shall listen to the `MpvPlayer.on(MpvEventId.FileLoaded)` event and
        //       update the playlist data when a new file is loaded. (aka always have the playlist ready to go)

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
    } else {
        throw new Error("Other playlists not implemented yet.");
    }

    return { playlistEntries };
}) satisfies LoaderFunction;

const Playlist: React.FC = () => {
    const { playlistEntries } = useLoaderData() as Awaited<ReturnType<typeof loader>>;
    const { info: playerInfo } = useMpvPlayer();
    const revalidator = useRevalidator();
    const navigate = useNavigate();

    useEffect(() => {
        MpvPlayer.on(MpvEventId.FileLoaded, revalidator.revalidate);

        return () => {
            MpvPlayer.off(MpvEventId.FileLoaded, revalidator.revalidate);
        };
    }, []);

    const handlePlayEntry = (entry: IPlaylistEntry) => {
        MpvPlayer.loadFile(entry.path);

        // Go to focused player if the file is a video
        if (isVideoFileByFileExtension(entry.path)) {
            navigate("/focused-player");
        }
    };

    const handleAddFileToPlaylist = async () => {
        const path = await open({
            multiple: false,
        });

        if (!path) return;
        if (Array.isArray(path)) throw new Error("Multiple files not implemented");

        MpvPlayer.loadFile(path); // TODO: actually add file to playlist other than just play then call `handlePlayEntry`
    };

    if (!playlistEntries.length) {
        return (
            <div className="h-full flex items-center justify-center flex-col">
                <p className="text-muted-foreground">No entries in playlist</p>

                <Button variant="link" onClick={handleAddFileToPlaylist}>
                    Add file
                </Button>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full space-y-1 px-1">
            {playlistEntries.map((entry) => {
                const isActive = playerInfo.path === entry.path;

                return (
                    <div
                        key={entry.path}
                        onDoubleClick={() => handlePlayEntry(entry)}
                        className={cn(
                            "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                        )}
                    >
                        {entry.name}
                    </div>
                );
            })}
        </ScrollArea>
    );
};

export default Playlist;
