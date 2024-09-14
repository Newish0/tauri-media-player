import { objectKeysToCamelCase } from "@/lib/utils";
import { invoke } from "@tauri-apps/api";
import { listen, type Event } from "@tauri-apps/api/event";
import { IPlaylist } from "./PlaylistSvc";

export enum MpvEventId {
    None = 0,
    Shutdown = 1,
    LogMessage = 2,
    GetPropertyReply = 3,
    SetPropertyReply = 4,
    CommandReply = 5,
    StartFile = 6,
    EndFile = 7,
    FileLoaded = 8,
    ClientMessage = 16,
    VideoReconfig = 17,
    AudioReconfig = 18,
    Seek = 20,
    PlaybackRestart = 21,
    PropertyChange = 22,
    QueueOverflow = 24,
    Hook = 25,
}

type MpvEvent = Event<{
    event_id: MpvEventId;
}>;

type MpvEventCallback = (event: MpvEvent) => void;

export interface Track {
    id: number;
    type: string; // `type` is not a reserved word in TypeScript, so no need to rename
    srcId: number;
    title?: string;
    lang?: string;
    image: boolean;
    albumart: boolean;
    default: boolean;
    forced: boolean;
    selected: boolean;
    mainSelection?: number;
    external: boolean;
    externalFilename?: string;
    codec: string;
    codecDesc?: string;
    codecProfile?: string;
    ffIndex?: number;
    decoderDesc?: string;
    demuxW?: number;
    demuxH?: number;
    demuxCropX?: number;
    demuxCropY?: number;
    demuxCropW?: number;
    demuxCropH?: number;
    demuxChannelCount?: number;
    demuxChannels?: string;
    demuxSamplerate?: number;
    demuxFps?: number;
    demuxBitrate?: number;
    demuxRotation?: number;
    demuxPar?: number;
    audioChannels?: number;
    replaygainTrackPeak?: number;
    replaygainTrackGain?: number;
    replaygainAlbumPeak?: number;
    replaygainAlbumGain?: number;
}

export type CurrentTracks = {
    video?: Track;
    audio?: Track;
    subtitle?: Track;
};

export type PlaylistEntry = {
    filename: string;
    current: boolean;
    playing: boolean;
    title?: string;
    id?: number;
};
export default class MpvPlayer {
    private static eventListeners = new Map<MpvEventId, Set<MpvEventCallback>>();

    static {
        invoke("mpv_register_events_callback");

        listen("mpv-event", (event: MpvEvent) => {
            const eventId: MpvEventId = event.payload.event_id;

            // Trigger all callbacks registered for this event
            const listeners = MpvPlayer.eventListeners.get(eventId);
            if (listeners) {
                listeners.forEach((callback) => callback(event));
            }
        });
    }

    public static on(event: MpvEventId, callback: MpvEventCallback) {
        if (!MpvPlayer.eventListeners.has(event)) {
            MpvPlayer.eventListeners.set(event, new Set());
        }
        MpvPlayer.eventListeners.get(event)!.add(callback);
    }

    public static off(event: MpvEventId, callback: MpvEventCallback) {
        const listeners = MpvPlayer.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                MpvPlayer.eventListeners.delete(event);
            }
        }
    }

    public static async getDuration(): Promise<number> {
        return await invoke("mpv_get_duration");
    }

    public static async getPosition(): Promise<number> {
        return await invoke("mpv_get_position");
    }

    public static async seek(position: number) {
        return await invoke("mpv_seek", {
            position,
        });
    }

    public static async getVolume(): Promise<number> {
        return await invoke("mpv_get_volume");
    }

    public static async setVolume(volume: number) {
        return await invoke("mpv_set_volume", {
            volume,
        });
    }

    public static async loadFile(filePath: string) {
        return await invoke("mpv_load_file", {
            path: filePath,
        });
    }

    public static async getPath(): Promise<string> {
        return await invoke("mpv_get_path");
    }

    public static async getFilename(): Promise<string> {
        return await invoke("mpv_get_filename");
    }

    public static isPaused(): Promise<boolean> {
        return invoke("mpv_is_paused");
    }

    public static async play() {
        await invoke("mpv_play");
    }

    public static async pause() {
        await invoke("mpv_pause");
    }

    public static async stop() {
        await invoke("mpv_stop");
    }

    public static async getTracks(): Promise<Track[]> {
        const rustTracks: any[] = await invoke("mpv_get_tracks");
        return rustTracks.map(objectKeysToCamelCase) as Track[];
    }

    public static async getCurrentTracks(): Promise<CurrentTracks> {
        const currentTracks: any = await invoke("mpv_get_current_tracks");
        for (const k of Object.keys(currentTracks)) {
            currentTracks[k] = objectKeysToCamelCase(currentTracks[k]);
        }
        return currentTracks;
    }

    public static async setTracks({
        audioId,
        subtitleId,
        videoId,
    }: {
        audioId?: number;
        subtitleId?: number;
        videoId?: number;
    } = {}) {
        return await invoke("mpv_set_tracks", {
            audio: audioId,
            subtitle: subtitleId,
            video: videoId,
        });
    }

    /*
     * Playlist are managed by the TS MpvPlayer class.
     * In theory, if MPV backend is not controlled by any other
     * service, the MpvPlayer class's playlist state should be kept in sync.
     */

    private static playlist: (Omit<IPlaylist, "id"> & { id: any }) | null = null;

    public static async setPlaylist(playlist: Omit<IPlaylist, "id"> & { id: any }) {
        MpvPlayer.playlist = playlist;
        await MpvPlayer._setPlaylistFromPaths(
            MpvPlayer.playlist.entries.map((e) => e.path),
            true
        );
    }

    public static getPlaylist() {
        return MpvPlayer.playlist;
    }

    public static async getPlaylistPos() {
        if (!MpvPlayer.playlist) throw new Error("No playlist loaded");
        return await MpvPlayer._getPlaylistPos();
    }

    public static async setPlaylistPos(pos: number) {
        if (!MpvPlayer.playlist) throw new Error("No playlist loaded");
        await MpvPlayer._setPlaylistPos(pos);
    }

    public static async playlistNext() {
        if (!MpvPlayer.playlist) throw new Error("No playlist loaded");
        const curPos = await MpvPlayer._getPlaylistPos();
        const n = MpvPlayer.playlist.entries.length;
        const nextPos = (curPos + 1) % n;
        await MpvPlayer._setPlaylistPos(nextPos);
    }

    public static async playlistPrev() {
        if (!MpvPlayer.playlist) throw new Error("No playlist loaded");
        const curPos = await MpvPlayer._getPlaylistPos();
        const n = MpvPlayer.playlist.entries.length;
        const prevPos = (curPos - 1 + n) % n;
        await MpvPlayer._setPlaylistPos(prevPos);
    }

    private static async _setPlaylistFromPaths(paths: string[], replace = true) {
        if (replace) {
            await MpvPlayer.stop();
            await MpvPlayer._clearPlaylist();
        }

        return await invoke("mpv_set_playlist_from_paths", {
            paths,
        });
    }

    private static async _clearPlaylist() {
        return await invoke("mpv_clear_playlist");
    }

    private static async _playlistNext() {
        return await invoke("mpv_playlist_next");
    }

    private static async _playlistPrev() {
        return await invoke("mpv_playlist_prev");
    }

    private static async _getPlaylist() {
        const playlist: any[] = await invoke("mpv_get_playlist");
        return playlist.map(objectKeysToCamelCase) as PlaylistEntry[];
    }

    private static async _getPlaylistPos(): Promise<number> {
        return await invoke("mpv_get_playlist_pos");
    }

    private static async _setPlaylistPos(pos: number) {
        return await invoke("mpv_set_playlist_pos", {
            pos,
        });
    }
}
