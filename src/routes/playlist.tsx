import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMpvPlayer } from "@/hooks/use-mpv-player";
import { cn, isVideoFileByFileExtension } from "@/lib/utils";
import MpvPlayer, { MpvEventId } from "@/services/MpvPlayer";
import { useEffect } from "react";
import { LoaderFunction, useLoaderData, useNavigate, useRevalidator } from "react-router-dom";

import { PlaylistEntry, PlaylistSvc } from "@/services/PlaylistManager";
import { open } from "@tauri-apps/api/dialog";

export const loader = (async ({
    params,
}): Promise<{
    playlistEntries: PlaylistEntry[];
}> => {
    const { id } = params;

    if (!id) throw new Error("No playlist id provided");

    let playlistEntries: PlaylistEntry[] = await PlaylistSvc.getPlaylistEntries(id);
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

    const handlePlayEntry = (entry: PlaylistEntry) => {
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
