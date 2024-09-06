import MpvPlayer, { MpvEventId, Track } from "@/services/MpvPlayer";
import { atom } from "nanostores";

type PlayerInfo = {
    duration: number;
    position: number;
    volume: number;
    isPaused: boolean;
    path: string;
    filename: string;
    tracks: Track[];
};

export const $mpvPlayerInfo = atom<PlayerInfo>({
    duration: 0,
    position: 0,
    volume: 0,
    isPaused: true,
    path: "", // empty path ==> no file loaded
    filename: "",
    tracks: [],
});

export function setPartialMpvPlayerInfo(partialInfo: Partial<PlayerInfo>) {
    $mpvPlayerInfo.set({
        ...$mpvPlayerInfo.get(),
        ...partialInfo,
    });
}

// Initial setup for polling data   
(async function init() {
    const fetchInfo = async () => {
        // Get state and use default value if there is an error
        const duration = await MpvPlayer.getDuration().catch(() => 0);
        const position = await MpvPlayer.getPosition().catch(() => 0);
        const volume = await MpvPlayer.getVolume().catch(() => 0);
        const isPaused = await MpvPlayer.isPaused().catch(() => true);
        const path = await MpvPlayer.getPath().catch(() => "");
        const filename = await MpvPlayer.getFilename().catch(() => "");
        const tracks = await MpvPlayer.getTracks().catch(() => []);

        setPartialMpvPlayerInfo({
            duration,
            position,
            volume,
            isPaused,
            path,
            filename,
            tracks,
        });
    };

    let intId = setInterval(fetchInfo, 1000);
    MpvPlayer.on(MpvEventId.FileLoaded, fetchInfo);
    MpvPlayer.on(MpvEventId.StartFile, fetchInfo);
    MpvPlayer.on(MpvEventId.EndFile, fetchInfo);

    fetchInfo(); // initial fetch

    // Cleanup func
    return () => {
        MpvPlayer.off(MpvEventId.FileLoaded, fetchInfo);
        MpvPlayer.off(MpvEventId.StartFile, fetchInfo);
        MpvPlayer.off(MpvEventId.EndFile, fetchInfo);
        clearInterval(intId);
    };
})();
