/**
 * SimplePlaylistItem Component
 *
 * Not to be confused with PlaylistListItem...
 *
 * This component represents a single item in the playlist. It displays the media title
 * and provides interactions for playing the media or deleting the entry. It integrates
 * with a context menu to offer additional actions for each playlist item.
 */

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn, formatSeconds } from "@/lib/utils";
import { IPlaylistEntry } from "@/services/PlaylistEntrySvc";
import { DragHandleDots1Icon } from "@radix-ui/react-icons";
import React from "react";
import { SortableItemChildProps } from "./DraggableSimplePlaylist";
import { PlaylistItemContextMenu } from "./PlaylistItemContextMenu";

/**
 * Props for the PlaylistItem component.
 */
interface SimplePlaylistItemProps extends SortableItemChildProps {
    entry: IPlaylistEntry;
    isActive: boolean;
    onPlay: (entry: IPlaylistEntry) => void;
    onDelete: (entry: IPlaylistEntry) => void;
    readonly: boolean;
}

/**
 * Component representing a single item in the playlist.
 */
const SimplePlaylistItem: React.FC<SimplePlaylistItemProps> = React.memo(
    ({ entry, isActive, onPlay, onDelete, readonly, listeners, attributes }) => {
        return (
            <PlaylistItemContextMenu
                entry={entry}
                onPlay={onPlay}
                onDelete={onDelete}
                readonly={readonly}
            >
                <div
                    onDoubleClick={() => onPlay(entry)}
                    className={cn(
                        "flex justify-between items-center px-3 py-2 rounded-md transition-colors group",
                        "hover:bg-accent/60 hover:text-accent-foreground",
                        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                    )}
                >
                    <div className="text-sm font-medium">{entry.mediaInfo.title}</div>

                    <div className="flex items-center gap-2">
                        {entry.mediaInfo.duration ? (
                            <div className="text-xs">{formatSeconds(entry.mediaInfo.duration)}</div>
                        ) : null}

                        {/* The icon will only be visible when the parent div (group) is hovered and not readonly */}
                        <DragHandleDots1Icon
                            className={cn(
                                "invisible",
                                readonly
                                    ? ""
                                    : "group-hover:visible mr-[-10px] text-muted-foreground scale-y-150"
                            )}
                            {...listeners}
                            {...attributes}
                        />
                    </div>
                </div>
            </PlaylistItemContextMenu>
        );
    }
);

SimplePlaylistItem.displayName = "PlaylistItem";

export default SimplePlaylistItem;
