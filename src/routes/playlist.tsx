/**
 * Playlist Component (Route/Page)
 *
 * This component acts as a route/page in the React Router for managing the playlist functionality.
 * It handles loading data, playing media entries, and managing playlist entries.
 * It renders a list of PlaylistItem components and uses a PlaylistContainerContextMenu to encapsulate the
 * context menu for adding files.
 */

import { open } from "@tauri-apps/api/dialog";
import React, { useEffect } from "react";
import { useLoaderData, useNavigate, useNavigation, useRevalidator } from "react-router-dom";

import EnhancedPlaylistTable from "@/components/EnhancedPlaylistTable";
import PlaylistContainerContextMenu from "@/components/PlaylistContainerContextMenu";
import SimpleDndPlaylist from "@/components/SimpleDndPlaylist";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useMpvPlayer } from "@/hooks/use-mpv-player";
import { isMediaFileByFileExtension, isVideoFileByFileExtension } from "@/lib/utils";
import { getMediaInfo } from "@/services/MediaInfo";
import MpvPlayer, { MpvEventId } from "@/services/MpvPlayer";
import {
    createPlaylistEntry,
    deletePlaylistEntryById,
    updatePlaylistEntrySortIndex,
} from "@/services/PlaylistEntrySvc";
import { type IPlaylist, getPlaylistById } from "@/services/PlaylistSvc";
import { readDir } from "@tauri-apps/api/fs";
import { dirname } from "@tauri-apps/api/path";

type IPlaylistEntry = IPlaylist["entries"][number];

/**
 * Loader data type for the playlist.
 */
interface LoaderData {
    readonly: boolean;
    playlist: { id: "current-folder" | number } & Omit<IPlaylist, "id">;
}

/**
 * Loads data for the current folder or a specific playlist.
 * @returns The loader data containing playlist entries and read-only status.
 * @throws Error if no playlist ID is provided or if the playlist is not found.
 */
const loadCurrentFolderData = async (): Promise<LoaderData> => {
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

        loaderData.playlist.entries = mediaInfos
            .map((mediaInfo, index) =>
                mediaInfo
                    ? {
                          id: -index,
                          index,
                          sortIndex: index,
                          mediaInfo,
                          path: mediaInfo.path,
                          playlistId: -1,
                      }
                    : null
            )
            .filter(Boolean) as IPlaylistEntry[];
    }

    return loaderData;
};

/**
 * Loader function for the playlist route.
 * @param params - The route parameters.
 * @returns The loader data for the playlist.
 * @throws Error if no playlist ID is provided or if the playlist is not found.
 */
export const loader = async ({ params }: { params: { id?: string } }): Promise<LoaderData> => {
    const { id } = params;
    if (!id) throw new Error("No playlist id provided");

    console.log("[PlaylistLoader] Loading playlist", id);

    return id === "current-folder"
        ? loadCurrentFolderData()
        : getPlaylistById(parseInt(id)).then((playlist) => {
              if (!playlist) throw new Error("Playlist not found");
              return { playlist, readonly: false };
          });
};

/**
 * Playlist component that displays and manages the playlist.
 */
const Playlist: React.FC = () => {
    const { playlist, readonly } = useLoaderData() as LoaderData;
    const { info: playerInfo } = useMpvPlayer();
    const revalidator = useRevalidator();
    const navigate = useNavigate();
    const navigation = useNavigation();

    useEffect(() => {
        if (playlist.id !== "current-folder") return;

        const handlePotentialRevalidate = async () => {
            const path = await MpvPlayer.getPath();
            if (!playlist.entries.some((e) => e.path === path)) {
                revalidator.revalidate();
            }
        };

        MpvPlayer.on(MpvEventId.FileLoaded, handlePotentialRevalidate);
        MpvPlayer.on(MpvEventId.StartFile, handlePotentialRevalidate);

        return () => {
            MpvPlayer.off(MpvEventId.FileLoaded, handlePotentialRevalidate);
            MpvPlayer.off(MpvEventId.StartFile, handlePotentialRevalidate);
        };
    }, [playlist, revalidator]);

    /**
     * Handles playing an entry from the playlist.
     * @param entry - The playlist entry to play.
     */
    const handlePlayEntry = async (entry: IPlaylistEntry) => {
        await MpvPlayer.setPlaylist(playlist);
        await MpvPlayer.setPlaylistPos(entry.sortIndex);

        if (isVideoFileByFileExtension(entry.path)) {
            navigate("/focused-player");
        }
    };

    /**
     * Handles adding files to the playlist.
     */
    const handleAddFileToPlaylist = async () => {
        const paths = await open({ multiple: true });
        if (!paths) return;

        if (playlist.id === "current-folder") {
            console.warn("Cannot add to current folder... TODO: show error");
            return;
        } else {
            const addPaths = Array.isArray(paths) ? paths : [paths];
            for (const path of addPaths) {
                // DO NOT RUN THIS CONCURRENTLY to avoid invalid index/pos.
                await createPlaylistEntry(path, playlist.id as number);
            }
            revalidator.revalidate();
        }
    };

    /**
     * Handles deleting an entry from the playlist.
     * @param entry - The playlist entry to delete.
     */
    const handleDeletePlaylistEntry = async (entry: IPlaylistEntry) => {
        console.log("[handleDeletePlaylistEntry]", entry);
        await deletePlaylistEntryById(entry.id);
        revalidator.revalidate();
    };

    const handleUpdateEntires = async (entries: IPlaylistEntry[]) => {
        await Promise.all(entries.map((e) => updatePlaylistEntrySortIndex(e.id, e.sortIndex)));
        await MpvPlayer.updatePlaylist({ ...playlist, entries });
        revalidator.revalidate();
    };

    // const handleDragEnd = async (event: DragEndEvent) => {
    //     const { active, over } = event;
    //     if (over && active.id !== over.id) {
    //         const srcEntryIndex = playlist.entries.findIndex((e) => e.id === active.id);
    //         const destEntryIndex = playlist.entries.findIndex((e) => e.id === over.id);
    //         const srcEntry = playlist.entries[srcEntryIndex];
    //         const destEntry = playlist.entries[destEntryIndex];

    //         if (!srcEntry || !destEntry) return;

    //         // optimistic update
    //         const tmp = srcEntry.sortIndex;
    //         srcEntry.sortIndex = destEntry.sortIndex;
    //         destEntry.sortIndex = tmp;
    //         playlist.entries = arrayMove(playlist.entries, srcEntryIndex, destEntryIndex);
    //         console.log(
    //             "[handleDragEnd] NEW playlist.entries",
    //             playlist.entries.toSorted((a, b) => a.sortIndex - b.sortIndex)
    //         );
    //         MpvPlayer.updatePlaylist(playlist);

    //         await updatePlaylistEntrySortIndex(srcEntry.id, srcEntry.sortIndex);
    //         await updatePlaylistEntrySortIndex(destEntry.id, destEntry.sortIndex);
    //         revalidator.revalidate();
    //     }
    // };

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
                {!readonly && (
                    <Button variant="link" onClick={handleAddFileToPlaylist}>
                        Add files
                    </Button>
                )}
            </div>
        );
    }

    return (
        <PlaylistContainerContextMenu handleAddFile={handleAddFileToPlaylist}>
            <ScrollArea className="h-full px-1">
                <SimpleDndPlaylist
                    entries={playlist.entries}
                    activeEntry={playlist.entries.find(
                        (e) => e.id === playerInfo.currentPlaylistEntry?.id
                    )}
                    onPlay={handlePlayEntry}
                    onDelete={handleDeletePlaylistEntry}
                    readonly={readonly}
                    onEntriesSorted={handleUpdateEntires}
                />

                <EnhancedPlaylistTable
                    entries={playlist.entries}
                    activeEntry={playlist.entries.find(
                        (e) => e.id === playerInfo.currentPlaylistEntry?.id
                    )}
                    onPlay={handlePlayEntry}
                    onDelete={handleDeletePlaylistEntry}
                    readonly={readonly}
                    onEntriesSorted={handleUpdateEntires}
                />

                {/* Bottom spacer to allow more room for the context menu */}
                <div className="h-[20vh]"></div>
            </ScrollArea>
        </PlaylistContainerContextMenu>
    );
};

export default Playlist;
