import { open } from "@tauri-apps/api/dialog";
import React, { useCallback, useEffect } from "react";
import { useLoaderData, useNavigate, useNavigation, useRevalidator } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useMpvPlayer } from "@/hooks/use-mpv-player";
import { cn, isVideoFileByFileExtension } from "@/lib/utils";
import MpvPlayer, { MpvEventId } from "@/services/MpvPlayer";
import { type IPlaylist, getPlaylistById } from "@/services/PlaylistSvc";

type IPlaylistEntry = IPlaylist["entries"][number];

type LoaderData = {
    playlist: IPlaylist;
};

export const loader = async ({ params }: { params: { id?: string } }): Promise<LoaderData> => {
    const { id } = params;
    if (!id) throw new Error("No playlist id provided");

    if (id == "current-folder")
        return {
            playlist: { entries: [], id: "current-folder", index: -1, name: "Current Folder" },
        };

    const playlist = await getPlaylistById(parseInt(id));

    if (!playlist) throw new Error("Playlist not found");

    // const playlist = await PlaylistSvc.get(id);
    // await MpvPlayer.setPlaylistFromPaths(playlist.entries.map((entry) => entry.path));

    // if (playlist.entries.length > 0) {
    //     // Get the currently playing file and find its index in the playlist
    //     const currentlyPlaying = await MpvPlayer.getPath().catch(() => null);
    //     const indexOfCurrentFile = playlist.entries.findIndex(
    //         (entry) => entry.path === currentlyPlaying
    //     );

    //     // If the currently playing file is found in the playlist, set the playlist position to it
    //     if (indexOfCurrentFile !== -1) {
    //         MpvPlayer.setPlaylistPos(indexOfCurrentFile + 1); // +1 because the playlist position is one-indexed
    //     }
    // }

    return { playlist };
};

const Playlist: React.FC = () => {
    const { playlist } = useLoaderData() as LoaderData;
    const { info: playerInfo } = useMpvPlayer();
    const revalidator = useRevalidator();
    const navigate = useNavigate();
    const navigation = useNavigation();

    useEffect(() => {
        // Revalidate on file load if the currently playing file is not in the playlist
        const handleFileLoaded = async () => {
            const currentlyPlaying = await MpvPlayer.getPath();
            const isPlayingFileInPlaylist = playlist.entries.some(
                (entry) => entry.path === currentlyPlaying
            );

            if (!isPlayingFileInPlaylist) {
                revalidator.revalidate();
            }
        };

        MpvPlayer.on(MpvEventId.FileLoaded, handleFileLoaded);
        return () => MpvPlayer.off(MpvEventId.FileLoaded, handleFileLoaded);
    }, [playlist, revalidator]);

    const handlePlayEntry = useCallback(
        (entry: IPlaylistEntry) => {
            const index = playlist.entries.findIndex((e) => e.path === entry.path);
            console.log("[Playlist Page] handlePlayEntry", index + 1);
            MpvPlayer.setPlaylistPos(index + 1);

            if (isVideoFileByFileExtension(entry.path)) {
                navigate("/focused-player");
            }
        },
        [playlist.entries, navigate]
    );

    const handleAddFileToPlaylist = useCallback(async () => {
        const path = await open({ multiple: false });
        if (!path || Array.isArray(path)) return;

        MpvPlayer.loadFile(path);
        // TODO: Implement proper playlist addition logic
    }, []);

    if (navigation.state === "loading") {
        return (
            <div className="h-full space-y-1 p-1">
                {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton className="h-8 w-full rounded-md" key={i} />
                ))}
            </div>
        );
    }

    if (!playlist.entries.length) {
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
            {playlist.entries.map((entry) => (
                <PlaylistItem
                    key={entry.path}
                    entry={entry}
                    isActive={playerInfo.path === entry.path}
                    onPlay={handlePlayEntry}
                />
            ))}
        </ScrollArea>
    );
};

interface PlaylistItemProps {
    entry: IPlaylistEntry;
    isActive: boolean;
    onPlay: (entry: IPlaylistEntry) => void;
}

const PlaylistItem: React.FC<PlaylistItemProps> = React.memo(({ entry, isActive, onPlay }) => (
    <div
        onDoubleClick={() => onPlay(entry)}
        className={cn(
            "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        )}
    >
        {entry.mediaInfo.title}
    </div>
));

PlaylistItem.displayName = "PlaylistItem";

export default Playlist;
