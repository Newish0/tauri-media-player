import { invoke } from "@tauri-apps/api";
import { listen, type Event } from "@tauri-apps/api/event";

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

export type Track = {
    id: number;
    type_: string;
    src_id: number;
    title?: string;
    lang?: string;
    codec: string;
    external: boolean;
    selected: boolean;
    decoder?: string;
    codec_desc?: string;
    demux_w?: number;
    demux_h?: number;
    demux_fps?: number;
    audio_channels?: number;
    demux_channel_count?: number;
    demux_samplerate?: number;
};

export type CurrentTracks = {
    video?: Track;
    audio?: Track;
    subtitle?: Track;
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

    public static isPaused(): Promise<boolean> {
        return invoke("mpv_is_paused");
    }

    public static async play() {
        await invoke("mpv_play");
    }

    public static async pause() {
        await invoke("mpv_pause");
    }

    public static async get_tracks(): Promise<Track[]> {
        return await invoke("mpv_get_tracks");
    }

    public static async get_current_tracks(): Promise<CurrentTracks> {
        return await invoke("mpv_get_current_tracks");
    }

    public static async set_tracks(
        options: {
            audio?: string;
            subtitle?: string;
            video?: string;
        } = {}
    ) {
        return await invoke("mpv_set_tracks", {
            ...options,
        });
    }
}
