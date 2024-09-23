import { IPlaylistEntry } from "@/services/PlaylistEntrySvc";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "./ui/context-menu";

interface PlaylistItemContextMenuProps {
    entry: IPlaylistEntry;
    onPlay: (entry: IPlaylistEntry) => void;
    onDelete: (entry: IPlaylistEntry) => void;
    readonly: boolean;
}

export const PlaylistItemContextMenu: React.FC<
    React.PropsWithChildren<PlaylistItemContextMenuProps>
> = ({ entry, onPlay, onDelete, readonly, children }) => {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-32">
                <ContextMenuItem onClick={() => onPlay(entry)}>Play</ContextMenuItem>
                <ContextMenuItem onClick={() => onDelete(entry)} disabled={readonly}>
                    Delete
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};
