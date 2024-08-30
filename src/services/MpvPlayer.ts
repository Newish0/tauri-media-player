import { invoke } from "@tauri-apps/api";

export default class MpvPlayer {
    public static async loadFile(filePath: string) {
        return await invoke("mpv_load_file", {
            path: filePath,
        });
    }

    public static async play() {
        await invoke("mpv_play");
    }

    public static async pause() {
        await invoke("mpv_pause");
    }
}
