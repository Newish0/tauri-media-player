import { db } from "@/db/database";
import { playlist as PlaylistSchema } from "@/db/schema";
import { InferQueryModel } from "@/db/types";
import { count, eq } from "drizzle-orm";

export type IPlaylist = InferQueryModel<
    "playlist",
    {
        with: {
            entries: {
                with: { mediaInfo: true };
            };
        };
    }
>;

export async function createPlaylist(name = "New Playlist"): Promise<IPlaylist | undefined> {
    // New playlist will be added at the end of the playlist list.
    const currentNumberOfPlaylists = await db
        .select({ count: count() })
        .from(PlaylistSchema)
        .then((r) => r[0].count);

    const playlists = await db
        .insert(PlaylistSchema)
        .values({ name, index: currentNumberOfPlaylists })
        .returning({ insertedId: PlaylistSchema.id });
    const playlist = playlists.at(0);

    if (!playlist) throw new Error("Failed to create playlist");

    // Get playlist again since returning can't populate relations fields
    const { insertedId } = playlist;
    return getPlaylistById(insertedId);
}

export async function getPlaylistById(id: number): Promise<IPlaylist | undefined> {
    const playlist = await db.query.playlist.findFirst({
        where: (playlist, { eq }) => eq(playlist.id, id),
        with: {
            entries: {
                with: { mediaInfo: true },
            },
        },
    });

    return playlist;
}

export async function updatePlaylistById(
    id: number,
    newPlaylist: Partial<typeof PlaylistSchema.$inferSelect>
): Promise<IPlaylist | undefined> {
    const updatedPlaylist = await db
        .update(PlaylistSchema)
        .set(newPlaylist)
        .where(eq(PlaylistSchema.id, id))
        .returning({ updatedId: PlaylistSchema.id })
        .then((r) => r.at(0));

    if (!updatedPlaylist) throw new Error("Failed to edit playlist");

    // Get playlist again since returning can't populate relations fields
    const { updatedId } = updatedPlaylist;
    return getPlaylistById(updatedId);
}

export async function deletePlaylistById(id: number): Promise<void> {
    await db.delete(PlaylistSchema).where(eq(PlaylistSchema.id, id));
}

export function getAllPlaylists(): Promise<IPlaylist[]> {
    console.log("getAllPlaylists");
    return db.query.playlist.findMany({
        with: {
            entries: {
                with: { mediaInfo: true },
            },
        },
    });
}
