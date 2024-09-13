import {
    createPlaylist,
    deletePlaylistById,
    updatePlaylistById,
    type IPlaylist,
} from "@/services/PlaylistSvc";
import React, { useCallback } from "react";
import PlaylistListItem from "./PlaylistListItem";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "./ui/context-menu";
import { ScrollArea } from "./ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/api/dialog";
import { getAllFilesInDirectory, isMediaFileByFileExtension } from "@/lib/utils";
import { basename, dirname } from "@tauri-apps/api/path";
import { createPlaylistEntry } from "@/services/PlaylistEntrySvc";

const PlaylistList: React.FC<{ playlists: IPlaylist[] }> = ({ playlists: defaultPlaylists }) => {
    const [playlists, setPlaylists] = React.useState(defaultPlaylists);
    const navigate = useNavigate();

    const handleNewPlaylist = useCallback(() => {
        createPlaylist().then((newPlaylist) => {
            if (!newPlaylist) return console.error("Failed to create new playlist"); // TODO: show error

            setPlaylists((playlists) => [...playlists, newPlaylist]); // assume new playlist is added at the end

            navigate(`/app/playlists/${newPlaylist.id}`); // navigate to new playlist
        });
    }, [playlists, setPlaylists]);

    const handlePlayingEdit = useCallback(
        async ({ id, name }: { id: string | number; name: string }) => {
            updatePlaylistById(parseInt(id.toString()), { name }).then((updatedPlaylist) => {
                if (!updatedPlaylist) return;

                setPlaylists((playlists) =>
                    playlists.map((p) => {
                        if (p.id === id) return updatedPlaylist;
                        return p;
                    })
                );
            });
        },
        [playlists, setPlaylists]
    );

    const handlePlaylistDelete = useCallback(
        ({ id }: { id: string | number }) => {
            deletePlaylistById(parseInt(id.toString()))
                .then(() => {
                    setPlaylists((playlists) => playlists.filter((p) => p.id !== id));

                    // TODO: if currently viewing this playlist, nav user out of it
                })
                .catch(console.error); // TODO: show error
        },
        [playlists, setPlaylists]
    );

    const handleImportFolder = useCallback(async () => {
        const folder = await open({
            multiple: false,
            directory: true,
        });

        if (!folder || Array.isArray(folder)) return; // case 2 is for TS reason; should be unreachable

        console.log(folder); // TODO: add import logic

        const files = await getAllFilesInDirectory(folder);
        const mediaFiles = files.filter((f) => isMediaFileByFileExtension(f));

        const folderName = await basename(folder);

        const newPlaylist = await createPlaylist().then((newPlaylist) => newPlaylist && updatePlaylistById(newPlaylist.id, { name: folderName }));
        if (!newPlaylist) return console.error("Failed to create new playlist"); // TODO: show error
        setPlaylists((playlists) => [...playlists, newPlaylist]);

        await Promise.all(mediaFiles.map(async (file) => createPlaylistEntry(file, newPlaylist.id)));
        navigate(`/app/playlists/${newPlaylist.id}`);

    }, [playlists, setPlaylists]);

    return (
        <PlaylistListContextMenu
            handleNewPlaylist={handleNewPlaylist}
            handleImportFolder={handleImportFolder}
        >
            <ScrollArea className="h-full">
                <ul className="space-y-1 p-1">
                    {/* Special item */}
                    <PlaylistListItem
                        playlist={{ id: "current-folder", name: "Current Folder" }}
                        editable={false}
                    />

                    {playlists.map((playlist) => (
                        <PlaylistListItem
                            key={playlist.id}
                            playlist={playlist}
                            editable
                            onCompleteEdit={handlePlayingEdit}
                            onDelete={handlePlaylistDelete}
                        />
                    ))}
                </ul>
            </ScrollArea>
        </PlaylistListContextMenu>
    );
};

const PlaylistListContextMenu: React.FC<
    React.PropsWithChildren<{
        handleNewPlaylist?: () => void;
        handleImportFolder?: () => void;
    }>
> = ({ children, handleNewPlaylist, handleImportFolder }) => {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={handleNewPlaylist}>New playlist</ContextMenuItem>
                <ContextMenuItem onClick={handleImportFolder}>Import Folder</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};

export default PlaylistList;
