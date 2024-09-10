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

const PlaylistList: React.FC<{ playlists: IPlaylist[] }> = ({ playlists: defaultPlaylists }) => {
    const [playlists, setPlaylists] = React.useState(defaultPlaylists);

    const handleNewPlaylist = useCallback(() => {
        createPlaylist().then((newPlaylist) => {
            if (!newPlaylist) return console.error("Failed to create new playlist"); // TODO: show error

            setPlaylists((playlists) => [...playlists, newPlaylist]); // assume new playlist is added at the end
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
                })
                .catch(console.error); // TODO: show error
        },
        [playlists, setPlaylists]
    );

    return (
        <PlaylistListContextMenu handleNewPlaylist={handleNewPlaylist}>
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
    }>
> = ({ children, handleNewPlaylist }) => {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={handleNewPlaylist}>New playlist</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};

export default PlaylistList;
