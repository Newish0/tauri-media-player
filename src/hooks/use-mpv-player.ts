import MpvPlayer from "@/services/MpvPlayer";
import { useState, useEffect } from "react";

type MpvPlayerHookOptions = {};

export function useMpvPlayer({}: MpvPlayerHookOptions = {}) {
    const [info, setInfo] = useState({
        duration: 0,
        position: 0,
        volume: 0,
        isPaused: true,
        path: "", // empty path ==> no file loaded
    });

    useEffect(() => {
        let intId = setInterval(async () => {
            // Get state and use default value if there is an error
            const duration = await MpvPlayer.getDuration().catch(() => 0);
            const position = await MpvPlayer.getPosition().catch(() => 0);
            const volume = await MpvPlayer.getVolume().catch(() => 0);
            const isPaused = await MpvPlayer.isPaused().catch(() => true);
            const path = await MpvPlayer.getPath().catch(() => "");

            setInfo((prev) => ({
                ...prev,
                duration,
                position,
                volume,
                isPaused,
                path,
            }));
        }, 1);

        return () => clearInterval(intId);
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
