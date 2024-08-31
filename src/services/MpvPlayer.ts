import { invoke } from "@tauri-apps/api";

export default class MpvPlayer {
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
}
