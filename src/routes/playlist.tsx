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
import { createPlaylistEntry } from "@/services/PlaylistEntrySvc";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

type IPlaylistEntry = IPlaylist["entries"][number];

type LoaderData = {
    playlist: { id: "current-folder" | number } & Omit<IPlaylist, "id">; // basically `IPlaylist` but `id` can be "current-folder" or number
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

    return { playlist };
};

const Playlist: React.FC = () => {
    const { playlist } = useLoaderData() as LoaderData;
    const { info: playerInfo } = useMpvPlayer();
    const revalidator = useRevalidator();
    const navigate = useNavigate();
    const navigation = useNavigation();

    const handlePlayEntry = async (entry: IPlaylistEntry) => {
        const index = playlist.entries.findIndex((e) => e.path === entry.path);

        console.log("PLAY ENTRY", entry, index);

        await MpvPlayer.setPlaylistFromPaths(playlist.entries.map((e) => e.path));

        await MpvPlayer.setPlaylistPos(index + 1); // TODO: investigate regarding the 1's indexing

        if (isVideoFileByFileExtension(entry.path)) {
            navigate("/focused-player");
        }
    };

    const handleAddFileToPlaylist = async () => {
        const paths = await open({ multiple: true });
        if (!paths) return;

        if (playlist.id === "current-folder")
            return console.warn("Cannot add to current folder... TODO: show error");

        if (Array.isArray(paths)) {
            for (const path of paths) {
                await createPlaylistEntry(path, playlist.id).then(() => revalidator.revalidate());
            }
        } else {
            await createPlaylistEntry(paths, playlist.id).then(() => revalidator.revalidate());
        }
    };

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
                    Add files
                </Button>
            </div>
        );
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
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
            </ContextMenuTrigger>
            <ContextMenuContent className="w-32">
                <ContextMenuItem onClick={handleAddFileToPlaylist}>Add file</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
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
