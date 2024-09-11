import { db } from "@/db/database";
import { InferQueryModel } from "@/db/types";
import { count, eq } from "drizzle-orm";
import { playlistEntry as PlaylistEntryTable } from "@/db/schema";
import { getMediaInfo } from "./MediaInfo";

export type IPlaylistEntry = InferQueryModel<
    "playlistEntry",
    {
        with: { mediaInfo: true };
    }
>;

export async function getPlaylistEntryById(id: number): Promise<IPlaylistEntry | undefined> {
    return await db.query.playlistEntry.findFirst({
        where: (playlistEntry, { eq }) => eq(playlistEntry.id, id),
        with: {
            mediaInfo: true,
        },
    });
}

export async function getAllPlaylistEntries(): Promise<IPlaylistEntry[]> {
    return await db.query.playlistEntry.findMany({
        with: {
            mediaInfo: true,
        },
    });
}

export async function createPlaylistEntry(
    path: string,
    playlistId: number
): Promise<IPlaylistEntry | undefined> {
    const currentNumberOfPlaylistEntries = await db
        .select({ count: count() })
        .from(PlaylistEntryTable)
        .then((r) => r[0].count);

    const playlistEntries = await db
        .insert(PlaylistEntryTable)
        .values({ path, playlistId, index: currentNumberOfPlaylistEntries })
        .returning({ insertedId: PlaylistEntryTable.id });
    const playlistEntry = playlistEntries.at(0);
    if (!playlistEntry) throw new Error("Failed to create playlist entry.");

    // Make sure we have also generated mediaInfo
    await getMediaInfo(path);

    // Get playlist again since returning can't populate relations fields
    const { insertedId } = playlistEntry;
    return getPlaylistEntryById(insertedId);
}

export async function deletePlaylistEntryById(id: number): Promise<void> {
    await db.delete(PlaylistEntryTable).where(eq(PlaylistEntryTable.id, id));
}

export async function updatePlaylistEntryIndex(
    id: number,
    index: number
): Promise<IPlaylistEntry | undefined> {
    const updatedPlaylistEntries = await db
        .update(PlaylistEntryTable)
        .set({ index })
        .where(eq(PlaylistEntryTable.id, id))
        .returning({ updatedId: PlaylistEntryTable.id });

    const updatedPlaylistEntry = updatedPlaylistEntries.at(0);

    if (!updatedPlaylistEntry) throw new Error("Failed to edit playlist entry.");

    // Get playlist again since returning can't populate relations fields
    const { updatedId } = updatedPlaylistEntry;
    return getPlaylistEntryById(updatedId);
}
