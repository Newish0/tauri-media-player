import MpvPlayer, { MpvEventId, type Track } from "@/services/MpvPlayer";
import { useState, useEffect } from "react";
import { useWindowFullscreen } from "@/hooks/use-tauri-window";
import { useLocation, useNavigate } from "react-router-dom";

type MpvPlayerHookOptions = {};

type PlayerInfo = {
    duration: number;
    position: number;
    volume: number;
    isPaused: boolean;
    path: string;
    tracks: Track[];
};

export function useMpvPlayer({}: MpvPlayerHookOptions = {}) {
    const [info, setInfo] = useState<PlayerInfo>({
        duration: 0,
        position: 0,
        volume: 0,
        isPaused: true,
        path: "", // empty path ==> no file loaded
        tracks: [],
    });

    useEffect(() => {
        const fetchInfo = async () => {
            // Get state and use default value if there is an error
            const duration = await MpvPlayer.getDuration().catch(() => 0);
            const position = await MpvPlayer.getPosition().catch(() => 0);
            const volume = await MpvPlayer.getVolume().catch(() => 0);
            const isPaused = await MpvPlayer.isPaused().catch(() => true);
            const path = await MpvPlayer.getPath().catch(() => "");
            const tracks = await MpvPlayer.getTracks().catch(() => []);

            setInfo((prev) => ({
                ...prev,
                duration,
                position,
                volume,
                isPaused,
                path,
                tracks,
            }));
        };

        let intId = setInterval(fetchInfo, 1000);
        MpvPlayer.on(MpvEventId.FileLoaded, fetchInfo);

        // Cleanup
        return () => {
            MpvPlayer.off(MpvEventId.FileLoaded, fetchInfo);
            clearInterval(intId);
        };
    }, []);

    return {
        info,
        seek(position: number) {
            setInfo((prev) => ({ ...prev, position })); // optimistic update
            MpvPlayer.seek(position).then(() =>
                MpvPlayer.getDuration().then((duration) =>
                    setInfo((prev) => ({ ...prev, duration }))
                )
            ); // actual update
        },
        play() {
            setInfo((prev) => ({ ...prev, isPaused: false })); // optimistic update
            MpvPlayer.play()
                .then(() => MpvPlayer.isPaused())
                .then((isPaused) => setInfo((prev) => ({ ...prev, isPaused }))); // actual update
        },
        pause() {
            setInfo((prev) => ({ ...prev, isPaused: true })); // optimistic update
            MpvPlayer.pause().then(() =>
                MpvPlayer.isPaused().then((isPaused) => setInfo((prev) => ({ ...prev, isPaused })))
            ); // actual update
        },
        setVolume(volume: number) {
            setInfo((prev) => ({ ...prev, volume })); // optimistic update
            MpvPlayer.setVolume(volume).then(() =>
                MpvPlayer.getVolume().then((volume) => setInfo((prev) => ({ ...prev, volume })))
            ); // actual update
        },
    } as const;
}

/**
 * Basically useWindowFullscreen but ensures that we are using the focused-player page
 *
 * @example
 * const [isFullScreen, setIsFullScreen] = useFullscreenAsFocusedPlayer(
 *    () => useWindowFullscreen("container")
 * );
 *
 * @param useFullscreenHook
 * @returns
 */
export function useFullscreenAsFocusedPlayer(
    useFullscreenHook: () => ReturnType<typeof useWindowFullscreen>,
    focusedPlayerLocationPath: string = "/focused-player"
) {
    const [isFullscreen, setFullscreenViaHook] = useFullscreenHook();
    let location = useLocation();
    const navigator = useNavigate();

    const setFullscreen: typeof setFullscreenViaHook = async (isFullscreen) => {
        setFullscreenViaHook(isFullscreen);

        if (isFullscreen && location.pathname !== focusedPlayerLocationPath) {
            navigator(focusedPlayerLocationPath);
        }
    };

    return [isFullscreen, setFullscreen] as const;
}
