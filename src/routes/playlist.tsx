/**
 * Playlist Component (Route/Page)
 *
 * This component acts as a route/page in the React Router for managing the playlist functionality.
 * It handles loading data, playing media entries, and managing playlist entries.
 * It renders a list of PlaylistItem components and uses a PlaylistContainerContextMenu to encapsulate the
 * context menu for adding files.
 */

import { open } from "@tauri-apps/api/dialog";
import React, { memo, useCallback, useEffect } from "react";
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
import PlaylistViewModeToggleGroup, { ViewMode } from "@/components/PlaylistViewModeToggleGroup";

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
    const revalidator = useRevalidator();
    const navigate = useNavigate();
    const navigation = useNavigation();
    const [viewMode, setViewMode] = React.useState<ViewMode>("simple");

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
    const handlePlayEntry = useCallback(
        async (entry: IPlaylistEntry) => {
            await MpvPlayer.setPlaylist(playlist);
            await MpvPlayer.setPlaylistPos(entry.sortIndex);

            if (isVideoFileByFileExtension(entry.path)) {
                navigate("/focused-player");
            }
        },
        [playlist, navigate]
    );

    /**
     * Handles adding files to the playlist.
     */
    const handleAddFileToPlaylist = useCallback(async () => {
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
    }, [playlist, revalidator]);

    /**
     * Handles deleting an entry from the playlist.
     * @param entry - The playlist entry to delete.
     */
    const handleDeletePlaylistEntry = useCallback(
        async (entry: IPlaylistEntry) => {
            console.log("[handleDeletePlaylistEntry]", entry);
            await deletePlaylistEntryById(entry.id);
            revalidator.revalidate();
        },
        [revalidator]
    );

    const handleUpdateEntires = useCallback(
        async (entries: IPlaylistEntry[]) => {
            await Promise.all(entries.map((e) => updatePlaylistEntrySortIndex(e.id, e.sortIndex)));
            await MpvPlayer.updatePlaylist({ ...playlist, entries });
            revalidator.revalidate();
        },
        [revalidator, playlist]
    );

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
                <div className="sticky top-0 flex justify-end bg-gradient-to-b from-muted/50">
                    <PlaylistViewModeToggleGroup
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                    />
                </div>

                <PlaylistByMode
                    mode={viewMode}
                    entries={playlist.entries}
                    readonly={readonly}
                    onPlay={handlePlayEntry}
                    onDelete={handleDeletePlaylistEntry}
                    onEntriesSorted={handleUpdateEntires}
                    // currentPlaylistEntry={playerInfo.currentPlaylistEntry}
                />

                {/* Bottom spacer to allow more room for the context menu */}
                <div className="h-[20vh]"></div>
            </ScrollArea>
        </PlaylistContainerContextMenu>
    );
};

const PlaylistByMode: React.FC<{
    mode: ViewMode;
    entries: IPlaylistEntry[];
    readonly: boolean;
    onPlay: (entry: IPlaylistEntry) => void;
    onDelete: (entry: IPlaylistEntry) => void;
    onEntriesSorted?: (entries: IPlaylistEntry[]) => void;
    currentPlaylistEntry?: IPlaylistEntry | null;
}> = memo(
    ({ mode, entries, readonly, onPlay, onDelete, onEntriesSorted, currentPlaylistEntry }) => {
        const activeEntry = entries.find((e) => e.id === currentPlaylistEntry?.id);

        if (mode === "simple") {
            return (
                <SimpleDndPlaylist
                    entries={entries}
                    activeEntry={activeEntry}
                    onPlay={onPlay}
                    onDelete={onDelete}
                    readonly={readonly}
                    onEntriesSorted={onEntriesSorted}
                />
            );
        }

        if (mode === "table") {
            return (
                <EnhancedPlaylistTable
                    entries={entries}
                    activeEntry={activeEntry}
                    onPlay={onPlay}
                    onDelete={onDelete}
                    readonly={readonly}
                    onEntriesSorted={onEntriesSorted}
                />
            );
        }

        if (import.meta.env.DEV) {
            return <div>Unsupported view mode: {mode}</div>;
        }

        return null;
    }
);

export default Playlist;
