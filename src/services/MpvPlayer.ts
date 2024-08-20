import { invoke } from "@tauri-apps/api";

export default class MpvPlayer {
    private serializedPlayer: string;

    private constructor(serializedPlayer: string) {
        this.serializedPlayer = serializedPlayer;
    }

    public static async create(): Promise<MpvPlayer> {
        const serializedPlayer: string = await invoke("mpv_create");
        return new MpvPlayer(serializedPlayer);
    }

    public async attachToWindow(windowId: string) {
        return await invoke("mpv_attach_to_window", {
            windowId,
            serializedMpv: this.serializedPlayer,
        });
    }

    public async loadFile(filePath: string) {
        return await invoke("mpv_load_file", {
            path: filePath,
            serializedMpv: this.serializedPlayer,
        });
    }

    public async destroy() {
        await invoke("mpv_destroy", {
            serializedMpv: this.serializedPlayer,
        });
    }

    public async play() {
        await invoke("mpv_play", {
            serializedMpv: this.serializedPlayer,
        });
    }

    public async pause() {
        await invoke("mpv_pause", {
            serializedMpv: this.serializedPlayer,
        });
    }

    delete() {
        this.destroy();
    }
}

/** A global singleton instance of MpvPlayer */
export const mpvPlayer = await MpvPlayer.create();

// mpvPlayer.destroy();
