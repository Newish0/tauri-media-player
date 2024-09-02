import { useWindowFullscreen } from "@/hooks/use-tauri-window";
import MpvPlayer from "@/services/MpvPlayer";
import { $mpvPlayerInfo, setPartialMpvPlayerInfo as setPartialInfo } from "@/stores/mpv-player-info";
import { useStore } from "@nanostores/react";
import { useLocation, useNavigate } from "react-router-dom";

type MpvPlayerHookOptions = {};

export function useMpvPlayer({}: MpvPlayerHookOptions = {}) {
    const info = useStore($mpvPlayerInfo);

    return {
        info,
        seek(position: number) {
            setPartialInfo({ position }); // optimistic update
            MpvPlayer.seek(position).then(() =>
                MpvPlayer.getDuration().then((duration) => setPartialInfo({ duration }))
            ); // actual update
        },
        play() {
            setPartialInfo({ isPaused: false }); // optimistic update
            MpvPlayer.play()
                .then(() => MpvPlayer.isPaused())
                .then((isPaused) => setPartialInfo({ isPaused })); // actual update
        },
        pause() {
            setPartialInfo({ isPaused: true }); // optimistic update
            MpvPlayer.pause().then(() =>
                MpvPlayer.isPaused().then((isPaused) => setPartialInfo({ isPaused }))
            ); // actual update
        },
        setVolume(volume: number) {
            setPartialInfo({ volume }); // optimistic update
            MpvPlayer.setVolume(volume).then(() =>
                MpvPlayer.getVolume().then((volume) => setPartialInfo({ volume }))
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
