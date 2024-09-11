import { open } from "@tauri-apps/api/dialog";
import React, { useEffect } from "react";
import { useLoaderData, useNavigate, useNavigation, useRevalidator } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useMpvPlayer } from "@/hooks/use-mpv-player";
import { cn, isMediaFileByFileExtension, isVideoFileByFileExtension } from "@/lib/utils";
import { getMediaInfo } from "@/services/MediaInfo";
import MpvPlayer, { MpvEventId } from "@/services/MpvPlayer";
import { createPlaylistEntry, deletePlaylistEntryById } from "@/services/PlaylistEntrySvc";
import { type IPlaylist, getPlaylistById } from "@/services/PlaylistSvc";
import { readDir } from "@tauri-apps/api/fs";
import { dirname } from "@tauri-apps/api/path";

type IPlaylistEntry = IPlaylist["entries"][number];

type LoaderData = {
    readonly: boolean;
    playlist: { id: "current-folder" | number } & Omit<IPlaylist, "id">; // basically `IPlaylist` but `id` can be "current-folder" or number
};

export const loader = async ({ params }: { params: { id?: string } }): Promise<LoaderData> => {
    const { id } = params;
    if (!id) throw new Error("No playlist id provided");

    if (id == "current-folder") {
        const loaderData: LoaderData = {
            readonly: true,
            playlist: { entries: [], id: "current-folder", index: -1, name: "Current Folder" },
        };

        const currentlyPlaying = await MpvPlayer.getPath().catch(() => null);
        if (currentlyPlaying) {
            const dirPath = await dirname(currentlyPlaying);
            const files = await readDir(dirPath);
            const mediaFiles = files.filter((f) => isMediaFileByFileExtension(f.path));
            const mediaInfos = await Promise.all(mediaFiles.map((f) => getMediaInfo(f.path)));
            const entries = mediaInfos.map(
                (mediaInfo, index) =>
                    mediaInfo && {
                        id: -1,
                        index,
                        mediaInfo,
                        path: mediaInfo?.path,
                        playlistId: -1,
                    }
            );

            loaderData.playlist.entries = entries.filter((e) => e) as IPlaylistEntry[];
        }

        return loaderData;
    }

    const playlist = await getPlaylistById(parseInt(id));

    if (!playlist) throw new Error("Playlist not found");

    return { playlist, readonly: false };
};

const Playlist: React.FC = () => {
    const { playlist, readonly } = useLoaderData() as LoaderData;
    const { info: playerInfo } = useMpvPlayer();
    const revalidator = useRevalidator();
    const navigate = useNavigate();
    const navigation = useNavigation();

    useEffect(() => {
        if (playlist.id !== "current-folder") return;

        // Only revalidate if the current playing file is NOT in the current current folder (playlist)
        const handlePotentialRevalidate = () => {
            MpvPlayer.getPath().then((path) => {
                if (playlist.entries.some((e) => e.path === path)) return;
                revalidator.revalidate();
            });
        };

        MpvPlayer.on(MpvEventId.FileLoaded, handlePotentialRevalidate);
        MpvPlayer.on(MpvEventId.StartFile, handlePotentialRevalidate);

        return () => {
            MpvPlayer.off(MpvEventId.FileLoaded, handlePotentialRevalidate);
            MpvPlayer.off(MpvEventId.StartFile, handlePotentialRevalidate);
        };
    }, [playlist, revalidator]);

    const handlePlayEntry = async (entry: IPlaylistEntry) => {
        const index = playlist.entries.findIndex((e) => e.path === entry.path);

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

    const handleDeletePlaylistEntry = async (entry: IPlaylistEntry) => {
        await deletePlaylistEntryById(entry.id).then(() => revalidator.revalidate());
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

    if (!playlist.entries.length && !readonly) {
        return (
            <div className="h-full flex items-center justify-center flex-col">
                <p className="text-muted-foreground">No entries in playlist</p>
                <Button variant="link" onClick={handleAddFileToPlaylist}>
                    Add files
                </Button>
            </div>
        );
    } else if (!playlist.entries.length) {
        return (
            <div className="h-full flex items-center justify-center flex-col">
                <p className="text-muted-foreground">No entries in playlist</p>
            </div>
        );
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <ScrollArea className="h-full space-y-1 px-1">
                    {playlist.entries.map((entry) => (
                        <ContextMenu key={entry.path}>
                            <ContextMenuTrigger>
                                <PlaylistItem
                                    entry={entry}
                                    isActive={playerInfo.path === entry.path}
                                    onPlay={handlePlayEntry}
                                />
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-32">
                                <ContextMenuItem onClick={() => handlePlayEntry(entry)}>
                                    Play
                                </ContextMenuItem>
                                <ContextMenuItem
                                    onClick={() => handleDeletePlaylistEntry(entry)}
                                    disabled={readonly}
                                >
                                    Delete
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    ))}

                    <div className="h-[20vh]"></div>
                </ScrollArea>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-32">
                <ContextMenuItem onClick={handleAddFileToPlaylist} disabled={readonly}>
                    Add file
                </ContextMenuItem>
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
