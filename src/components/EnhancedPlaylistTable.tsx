import React, { useState, useCallback } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, GripVertical } from "lucide-react";
import { IPlaylistEntry } from "@/services/PlaylistEntrySvc";
import { cn, formatSeconds } from "@/lib/utils";
import { PlaylistItemContextMenu } from "./PlaylistItemContextMenu";
import DraggableList from "./DraggableList";
import { DragEndEvent, DraggableAttributes } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

type SortKey = keyof IPlaylistEntry["mediaInfo"] | keyof IPlaylistEntry;

interface EnhancedPlaylistTableProps {
    entries: IPlaylistEntry[];
    activeEntry?: IPlaylistEntry;
    onPlay: (entry: IPlaylistEntry) => void;
    onDelete: (entry: IPlaylistEntry) => void;
    readonly: boolean;
    onEntriesSorted?: (sortedEntries: IPlaylistEntry[]) => void;
}

export default function EnhancedPlaylistTable({
    entries,
    activeEntry,
    onPlay,
    onDelete,
    readonly,
    onEntriesSorted,
}: EnhancedPlaylistTableProps) {
    const [sortedEntries, setSortedEntries] = useState<IPlaylistEntry[]>(entries);
    const [sortDirections, setSortDirections] = useState<Record<string, "asc" | "desc">>({});

    const handleSort = useCallback(
        (key: SortKey) => {
            setSortedEntries((prevEntries) => {
                const direction = sortDirections[key] === "asc" ? "desc" : "asc";
                const sorted = [...prevEntries]
                    .sort((a, b) => {
                        const aValue =
                            key in a.mediaInfo
                                ? a.mediaInfo[key as keyof IPlaylistEntry["mediaInfo"]]
                                : a[key as keyof IPlaylistEntry];
                        const bValue =
                            key in b.mediaInfo
                                ? b.mediaInfo[key as keyof IPlaylistEntry["mediaInfo"]]
                                : b[key as keyof IPlaylistEntry];

                        // Handle potential null values
                        if (aValue === null && bValue === null) return 0;
                        if (aValue === null) return direction === "asc" ? 1 : -1;
                        if (bValue === null) return direction === "asc" ? -1 : 1;

                        return direction === "asc"
                            ? aValue < bValue
                                ? -1
                                : aValue > bValue
                                ? 1
                                : 0
                            : aValue > bValue
                            ? -1
                            : aValue < bValue
                            ? 1
                            : 0;
                    })
                    .map((e, i) => ({ ...e, sortIndex: i }));

                setSortDirections((prev) => ({ ...prev, [key]: direction }));
                onEntriesSorted?.(sorted);
                return sorted;
            });
        },
        [sortDirections, onEntriesSorted]
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
                setSortedEntries((prevEntries) => {
                    const oldIndex = prevEntries.findIndex((e) => e.id === active.id);
                    const newIndex = prevEntries.findIndex((e) => e.id === over.id);
                    const newEntries = arrayMove(prevEntries, oldIndex, newIndex).map((e, i) => ({
                        ...e,
                        sortIndex: i,
                    }));
                    onEntriesSorted?.(newEntries);
                    return newEntries;
                });
            }
        },
        [onEntriesSorted]
    );

    const renderSortButton = useCallback(
        (key: SortKey, label: string) => (
            <Button variant="ghost" onClick={() => handleSort(key)}>
                {label} <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        [handleSort]
    );

    const renderTableHeader = useCallback(
        () => (
            <TableHeader>
                <TableRow>
                    <TableHead>{renderSortButton("title", "Title")}</TableHead>
                    <TableHead className="text-center">
                        {renderSortButton("artist", "Artist")}
                    </TableHead>
                    <TableHead className="text-center">
                        {renderSortButton("album", "Album")}
                    </TableHead>
                    <TableHead className="text-center">
                        {renderSortButton("track", "Track")}
                    </TableHead>
                    <TableHead className="text-center">
                        {renderSortButton("duration", "Duration")}
                    </TableHead>
                </TableRow>
            </TableHeader>
        ),
        [renderSortButton]
    );

    const renderTableRow = useCallback(
        (
            entry: IPlaylistEntry,
            ref: React.Ref<HTMLTableRowElement>,
            style?: React.CSSProperties,
            attributes?: DraggableAttributes,
            listeners?: SyntheticListenerMap
        ) => {
            const isActive =
                activeEntry?.playlistId === entry.playlistId && activeEntry?.id === entry.id;
            return (
                <PlaylistItemContextMenu
                    entry={entry}
                    onPlay={onPlay}
                    onDelete={onDelete}
                    readonly={readonly}
                    key={entry.id}
                >
                    <TableRow
                        ref={ref}
                        {...attributes}
                        {...listeners}
                        style={style || {}}
                        className={cn(
                            "hover:bg-accent/60 hover:text-accent-foreground",
                            isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                        )}
                        onDoubleClick={() => onPlay(entry)}
                    >
                        <TableCell>
                            <div className="flex gap-2 items-center">
                                {!readonly && <GripVertical className="h-4 w-4 cursor-move" />}
                                {entry.mediaInfo.title}
                            </div>
                        </TableCell>
                        <TableCell className="text-center">{entry.mediaInfo.artist}</TableCell>
                        <TableCell className="text-center">{entry.mediaInfo.album}</TableCell>
                        <TableCell className="text-center">{entry.mediaInfo.track}</TableCell>
                        <TableCell className="text-center">
                            {formatSeconds(entry.mediaInfo.duration ?? 0)}
                        </TableCell>
                    </TableRow>
                </PlaylistItemContextMenu>
            );
        },
        [activeEntry, onPlay, onDelete, readonly]
    );

    return (
        <Table>
            {renderTableHeader()}
            <TableBody>
                <DraggableList
                    items={sortedEntries.sort((a, b) => a.sortIndex - b.sortIndex)}
                    onDragEnd={handleDragEnd}
                    disabled={readonly}
                    getItemId={(entry) => entry.id}
                    renderItem={(entry, _, { ref, style, attributes, listeners }) =>
                        renderTableRow(entry, ref, style, attributes, listeners)
                    }
                />
            </TableBody>
        </Table>
    );
}
