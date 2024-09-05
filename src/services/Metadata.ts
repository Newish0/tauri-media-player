import { objectKeysToCamelCase } from "@/lib/utils";
import { invoke } from "@tauri-apps/api";

type SimplifiedMetadata = {
    title?: string;
    artist?: string;
    album?: string;
    year?: number;
    track?: number;
    totalTracks?: number;
    disc?: number;
    totalDiscs?: number;
    genre?: string;
    pictures?: Array<Array<number>>;
    duration: number;
    bitrate?: number;
    sampleRate?: number;
    channels?: number;
    bitDepth?: number;
};

export default class Metadata {
    static async get(path: string) {
        const mediaInfo: any = await invoke("get_media_info", { path });
        return objectKeysToCamelCase(mediaInfo) as SimplifiedMetadata;
    }
}
