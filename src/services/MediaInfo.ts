import { isVideoFileByFileExtension, objectKeysToCamelCase } from "@/lib/utils";
import { invoke } from "@tauri-apps/api";
import { mediaInfo as MediaInfoTable } from "@/db/schema";
import { db } from "@/db/database";
import { basename } from "@tauri-apps/api/path";

// What Tauri backend returns
type TauriMediaMetadata = {
    title?: string;
    artist?: string;
    album?: string;
    year?: number;
    track?: number;
    totalTracks?: number;
    disc?: number;
    totalDiscs?: number;
    genre?: string;
    // pictures?: Array<Array<number>>;
    duration: number;
    bitrate?: number;
    sampleRate?: number;
    channels?: number;
    bitDepth?: number;
};

// The DB metadata schema
type MediaMetadata = typeof MediaInfoTable.$inferSelect;

async function getMetadataFromFile(path: string): Promise<TauriMediaMetadata> {
    const mediaInfo: any = await invoke("get_media_info", { path });
    return objectKeysToCamelCase(mediaInfo) as TauriMediaMetadata;
}

export async function getMediaInfo(path: string): Promise<MediaMetadata | undefined> {
    let mediaInfo = await db.query.mediaInfo.findFirst({
        where: (mediaInfo, { eq }) => eq(mediaInfo.path, path),
    });

    if (mediaInfo) return mediaInfo;

    const isVideo = isVideoFileByFileExtension(path);
    const tauriMetadata = await getMetadataFromFile(path);
    const altName = await basename(path);

    // Video files should use file name instead of media info title.
    const title = isVideo ? altName : tauriMetadata?.title ?? altName;

    const insertionValues: typeof MediaInfoTable.$inferInsert = {
        ...tauriMetadata,
        title,
        path: path,
        isVideo,
    };

    mediaInfo = await db
        .insert(MediaInfoTable)
        .values(insertionValues)
        .returning()
        .then((arr) => arr?.at(0));

    console.log("[getMediaInfo] mediaInfo", mediaInfo);

    return mediaInfo;
}
