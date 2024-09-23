import DraggableList from "@/components/DraggableList";

import SimplePlaylistItem from "@/components/SimplePlaylistItem";
import { IPlaylistEntry } from "@/services/PlaylistEntrySvc";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import React, { memo } from "react";

interface SimplePlaylistItemProps {
    entries: IPlaylistEntry[];
    activeEntry?: IPlaylistEntry;
    onPlay: (entry: IPlaylistEntry) => void;
    onDelete: (entry: IPlaylistEntry) => void;
    readonly: boolean;
    onEntriesSorted?: (entries: IPlaylistEntry[]) => void;
}

const SimpleDndPlaylist: React.FC<SimplePlaylistItemProps> = ({
    entries,
    activeEntry,
    onPlay,
    onDelete,
    readonly,
    onEntriesSorted,
}) => {
    const [sortedEntries, setSortedEntries] = React.useState<IPlaylistEntry[]>(entries);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSortedEntries((entries) => {
                const srcEntryIndex = entries.findIndex((e) => e.id === active.id);
                const destEntryIndex = entries.findIndex((e) => e.id === over.id);
                const srcEntry = entries[srcEntryIndex];
                const destEntry = entries[destEntryIndex];

                if (!srcEntry || !destEntry) return entries;
                const tmp = srcEntry.sortIndex;
                srcEntry.sortIndex = destEntry.sortIndex;
                destEntry.sortIndex = tmp;

                const newEntries = arrayMove(entries, srcEntryIndex, destEntryIndex);
                if (onEntriesSorted) onEntriesSorted(newEntries);
                return newEntries;
            });
        }
    };

    return (
        <DraggableList
            items={sortedEntries}
            onDragEnd={handleDragEnd}
            disabled={readonly}
            getItemId={(entry) => entry.id}
            renderItem={(e, _, { ref, style, attributes, listeners }) => {
                const isActive =
                    activeEntry?.playlistId === e.playlistId && activeEntry?.id === e.id;

                return (
                    <SimplePlaylistItem
                        ref={ref}
                        style={style}
                        attributes={attributes}
                        listeners={listeners}
                        key={e.path}
                        entry={e}
                        isActive={isActive}
                        onPlay={onPlay}
                        onDelete={onDelete}
                        readonly={readonly}
                    />
                );
            }}
        />
    );
};

export default memo(SimpleDndPlaylist);
