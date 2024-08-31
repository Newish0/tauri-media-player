import MpvPlayer from "@/services/MpvPlayer";
import { useState, useEffect } from "react";

type MpvPlayerHookOptions = {};

export function useMpvPlayer({}: MpvPlayerHookOptions = {}) {
    const [info, setInfo] = useState({
        duration: 0,
        position: 0,
        volume: 0,
        isPaused: true,
    });

    useEffect(() => {
        let intId = setInterval(() => {
            MpvPlayer.getDuration().then((duration) => {
                setInfo((prev) => ({
                    ...prev,
                    duration,
                }));
            });

            MpvPlayer.getPosition().then((position) => {
                setInfo((prev) => ({
                    ...prev,
                    position,
                }));
            });

            MpvPlayer.getVolume().then((volume) => {
                setInfo((prev) => ({
                    ...prev,
                    volume,
                }));
            });

            MpvPlayer.isPaused().then((isPaused) => {
                setInfo((prev) => ({
                    ...prev,
                    isPaused,
                }));
            });
        }, 1000);

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
