import { cn } from "@/lib/utils";
import React, { useCallback, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "./ui/context-menu";

type Playlist = { id: string | number; name: string };

type PlaylistListItemProps =
    | {
          playlist: Playlist;
          editable?: boolean;
          onDelete?: (playlist: Playlist) => void;
      } & (
          | {
                editable: false;
                onCompleteEdit?: undefined;
            }
          | {
                editable: true;
                onCompleteEdit: (playlist: Playlist) => void;
            }
      );

const PlaylistListItem: React.FC<PlaylistListItemProps> = ({
    playlist: defaultPlaylist,
    onCompleteEdit,
    editable = true,
    onDelete,
}) => {
    const [playlist, setPlaylist] = React.useState(defaultPlaylist);
    const [isEditMode, setEditMode] = React.useState(false);

    useEffect(() => {
        setPlaylist(defaultPlaylist);
    }, [defaultPlaylist]);

    const handleEdit = () => {
        setEditMode(true);
    };

    const handleCompleteEdit = (e: React.KeyboardEvent | React.FocusEvent) => {
        if ("key" in e && e.key !== "Enter") return; // Only complete on Enter
        setEditMode(false);
        if (playlist.name === "") playlist.name = "Unnamed Playlist";

        onCompleteEdit?.(playlist);
    };

    const handleNameChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        setPlaylist({ ...playlist, name: evt.target.value });
    };

    const handleDelete = () => {
        onDelete?.(playlist);
    };

    const getStyle = useCallback(
        (isActive: boolean) => {
            return cn(
                "block w-full px-3 py-2 rounded-md text-sm font-medium box-border",
                "transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                isEditMode ? "underline" : ""
            );
        },
        [isEditMode]
    );

    return (
        <PlaylistListItemContextMenu
            handleEdit={handleEdit}
            editable={editable}
            handleDelete={handleDelete}
        >
            <li>
                {isEditMode ? (
                    <input
                        className={getStyle(false)}
                        onBlur={handleCompleteEdit}
                        onKeyDown={handleCompleteEdit}
                        onChange={handleNameChange}
                        type="text"
                        value={playlist.name}
                        autoFocus
                    ></input>
                ) : (
                    <NavLink
                        to={`/app/playlists/${playlist.id}`}
                        className={({ isActive }) => getStyle(isActive)}
                    >
                        {playlist.name}
                    </NavLink>
                )}
            </li>
        </PlaylistListItemContextMenu>
    );
};

const PlaylistListItemContextMenu: React.FC<
    React.PropsWithChildren<{
        handleEdit: () => void;
        handleDelete: () => void;
        editable: boolean;
    }>
> = ({ children, handleEdit, editable, handleDelete }) => {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-32">
                <ContextMenuItem onClick={handleEdit} disabled={!editable}>
                    Edit
                </ContextMenuItem>
                <ContextMenuItem onClick={handleDelete}>Delete</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};
export default PlaylistListItem;
