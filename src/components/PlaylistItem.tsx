/**
 * PlaylistItem Component
 *
 * Not to be confused with PlaylistListItem...
 *
 * This component represents a single item in the playlist. It displays the media title
 * and provides interactions for playing the media or deleting the entry. It integrates
 * with a context menu to offer additional actions for each playlist item.
 */

import React from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { IPlaylistEntry } from "@/services/PlaylistEntrySvc";

/**
 * Props for the PlaylistItem component.
 */
interface PlaylistItemProps {
    entry: IPlaylistEntry;
    isActive: boolean;
    onPlay: (entry: IPlaylistEntry) => void;
    onDelete: (entry: IPlaylistEntry) => void;
    readonly: boolean;
}

/**
 * Component representing a single item in the playlist.
 */
const PlaylistItem: React.FC<PlaylistItemProps> = React.memo(
    ({ entry, isActive, onPlay, onDelete, readonly }) => (
        <ContextMenu>
            <ContextMenuTrigger asChild>
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
            </ContextMenuTrigger>
            <ContextMenuContent className="w-32">
                <ContextMenuItem onClick={() => onPlay(entry)}>Play</ContextMenuItem>
                <ContextMenuItem onClick={() => onDelete(entry)} disabled={readonly}>
                    Delete
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
);

PlaylistItem.displayName = "PlaylistItem";

export default PlaylistItem;
