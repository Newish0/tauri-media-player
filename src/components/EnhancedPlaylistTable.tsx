import React, { useState } from "react";
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

type SortKey = keyof IPlaylistEntry["mediaInfo"] | keyof IPlaylistEntry;

interface EnhancedPlaylistTableProps {
    entries: IPlaylistEntry[];
    activeEntry?: IPlaylistEntry;
    onPlay: (entry: IPlaylistEntry) => void;
    onDelete: (entry: IPlaylistEntry) => void;
    readonly: boolean;
    onEntrySorted?: (sortedEntries: IPlaylistEntry[]) => void;
}

const EnhancedPlaylistTable: React.FC<EnhancedPlaylistTableProps> = ({
    entries,
    activeEntry,
    onPlay,
    onDelete,
    readonly,
    onEntrySorted,
}) => {
    const [sortedEntries, setSortedEntries] = useState<IPlaylistEntry[]>(entries);
    const [lastSortDirectionByKey, setLastSortDirectionByKey] = useState<
        Record<string, "asc" | "desc">
    >({});

    const onSort = (key: SortKey) => {
        const direction = lastSortDirectionByKey[key] === "asc" ? "desc" : "asc";

        const sorted = [...sortedEntries]
            .sort((a, b) => {
                let attrA: any = null;
                let attrB: any = null;
                if (Object.keys(a.mediaInfo).includes(key)) {
                    const k = key as any as keyof IPlaylistEntry["mediaInfo"];
                    attrA = a.mediaInfo[k];
                    attrB = b.mediaInfo[k];
                } else if (Object.keys(a).includes(key)) {
                    const k = key as any as keyof IPlaylistEntry;
                    attrA = a[k];
                    attrB = b[k];
                }

                if (attrA < attrB) return direction === "asc" ? -1 : 1;
                if (attrA > attrB) return direction === "asc" ? 1 : -1;
                return 0;
            })
            .map((e, i) => ({ ...e, sortIndex: i }));

        setLastSortDirectionByKey({
            ...lastSortDirectionByKey,
            [key]: direction,
        });

        setSortedEntries(sorted);
        if (onEntrySorted) {
            console.log("CALL", onEntrySorted);
            onEntrySorted(sorted);
        }
    };

    const onDragEnd = () => {
        // Stub: Implement drag and drop logic here
        console.log("Drag ended");
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {/* {!readonly && <TableHead className="w-[50px]"></TableHead>} */}
                    <TableHead>
                        <Button className="" variant="ghost" onClick={() => onSort("title")}>
                            Title <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </TableHead>
                    <TableHead>
                        <div className="flex justify-center">
                            <Button variant="ghost" onClick={() => onSort("artist")}>
                                Artist <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </TableHead>
                    <TableHead>
                        <div className="flex justify-center">
                            <Button variant="ghost" onClick={() => onSort("album")}>
                                Album <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </TableHead>
                    <TableHead>
                        <div className="flex justify-center">
                            <Button variant="ghost" onClick={() => onSort("duration")}>
                                Duration <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedEntries.map((entry, index) => {
                    const isActive =
                        activeEntry?.playlistId === entry.playlistId &&
                        activeEntry?.id === entry.id;

                    return (
                        <PlaylistItemContextMenu
                            entry={entry}
                            onPlay={onPlay}
                            onDelete={onDelete}
                            readonly={readonly}
                            key={entry.id}
                        >
                            <TableRow
                                className={cn(
                                    "hover:bg-accent/60 hover:text-accent-foreground",
                                    isActive
                                        ? "bg-accent text-accent-foreground"
                                        : "text-muted-foreground"
                                )}
                                onDoubleClick={() => onPlay(entry)}
                            >
                                <TableCell>
                                    <div className="flex gap-2 items-center">
                                        {!readonly && (
                                            <GripVertical className="h-4 w-4 cursor-move" />
                                        )}

                                        {entry.mediaInfo.title}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    {entry.mediaInfo.artist}
                                </TableCell>
                                <TableCell className="text-center">
                                    {entry.mediaInfo.album}
                                </TableCell>
                                <TableCell className="text-center">
                                    {formatSeconds(entry.mediaInfo.duration ?? 0)}
                                </TableCell>
                            </TableRow>
                        </PlaylistItemContextMenu>
                    );
                })}
            </TableBody>
        </Table>
    );
};

export default EnhancedPlaylistTable;
