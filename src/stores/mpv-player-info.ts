import MpvPlayer, { MpvEventId, Track } from "@/services/MpvPlayer";
import { IPlaylistEntry } from "@/services/PlaylistEntrySvc";
import { IPlaylist } from "@/services/PlaylistSvc";
import { atom } from "nanostores";

type PlayerInfo = {
    duration: number;
    position: number;
    volume: number;
    isPaused: boolean;
    path: string;
    filename: string;
    tracks: Track[];
    currentPlaylist: IPlaylist | null;
    currentPlaylistEntry: IPlaylistEntry | null;
};

export const $mpvPlayerInfo = atom<PlayerInfo>({
    duration: 0,
    position: 0,
    volume: 0,
    isPaused: true,
    path: "", // empty path ==> no file loaded
    filename: "",
    tracks: [],
    currentPlaylist: null,
    currentPlaylistEntry: null,
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
        const currentPlaylist = MpvPlayer.getPlaylist();
        const currentPlaylistEntrySortIndex = await MpvPlayer.getPlaylistPos().catch(() => -1);
        const currentPlaylistEntry =
            currentPlaylist?.entries.find((e) => e.sortIndex === currentPlaylistEntrySortIndex) ??
            null;

        setPartialMpvPlayerInfo({
            duration,
            position,
            volume,
            isPaused,
            path,
            filename,
            tracks,
            currentPlaylist,
            currentPlaylistEntry,
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
