import { useFullscreenAsFocusedPlayer, useMpvPlayer } from "@/hooks/use-mpv-player";
import { useWindowFullscreen } from "@/hooks/use-tauri-window";
import { Slider } from "@/components/ui/slider";
import { formatSeconds } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    EnterFullScreenIcon,
    ExitFullScreenIcon,
    PauseIcon,
    PlayIcon,
    StopIcon,
    SpeakerLoudIcon,
    SpeakerModerateIcon,
    SpeakerOffIcon,
    SpeakerQuietIcon,
    TrackNextIcon,
    TrackPreviousIcon,
} from "@radix-ui/react-icons";
import { useState } from "react";
import MpvPlayer from "@/services/MpvPlayer";

const PlayerControl: React.FC = () => {
    const { info: playerInfo, seek, play, pause, setVolume } = useMpvPlayer();
    const [isFullScreen, setIsFullScreen] = useFullscreenAsFocusedPlayer(() =>
        useWindowFullscreen("container")
    );

    // store the volume before muting so we can restore it when toggling mute
    const [volumeBeforeMute, setVolumeBeforeMute] = useState(playerInfo.volume);

    const handleSeek = (values: number[]) => {
        const [pos] = values; // expect only a single value
        seek(pos);
    };

    const handleVolumeChange = (values: number[]) => {
        const [volume] = values; // expect only a single value
        setVolume(volume);
    };

    const toggleMute = () => {
        if (playerInfo.volume === 0) {
            setVolume(volumeBeforeMute);
        } else {
            setVolumeBeforeMute(playerInfo.volume);
            setVolume(0);
        }
    };

    const handlePlayPauseToggle = () => {
        if (playerInfo.isPaused) {
            play();
        } else {
            pause();
        }
    };

    const handleStop = () => {
        MpvPlayer.stop();
    };

    const toggleFullScreen = async () => {
        setIsFullScreen(!isFullScreen);
    };

    const handleNextTrack = () => {
        MpvPlayer.playlistNext();
    };

    const handlePreviousTrack = () => {
        MpvPlayer.playlistPrev();
    };

    return (
        <div className="w-full h-full flex flex-col justify-center gap-1">
            <div className="flex justify-between gap-2">
                <span className="text-sm font-medium">{formatSeconds(playerInfo.position)}</span>

                <Slider
                    disabled={!playerInfo.path}
                    value={[playerInfo.position]}
                    min={0}
                    max={
                        // Use very small number as zero so slider nob position correctly
                        Math.max(playerInfo.duration, 1e-24)
                    }
                    step={0.1}
                    onValueChange={handleSeek}
                />

                <span className="text-sm font-medium">{formatSeconds(playerInfo.duration)}</span>
            </div>

            <div className="flex justify-between items-center">
                <div>
                    <Button
                        size={"icon"}
                        variant={"ghost"}
                        onClick={handlePlayPauseToggle}
                        disabled={!playerInfo.path}
                    >
                        {playerInfo.isPaused ? <PlayIcon></PlayIcon> : <PauseIcon></PauseIcon>}
                    </Button>
                    <Button
                        size={"icon"}
                        variant={"ghost"}
                        onClick={handleStop}
                        disabled={!playerInfo.path}
                    >
                        <StopIcon />
                    </Button>

                    <Button
                        size={"icon"}
                        variant={"ghost"}
                        disabled={!playerInfo.path}
                        onClick={handlePreviousTrack}
                    >
                        <TrackPreviousIcon />
                    </Button>

                    <Button
                        size={"icon"}
                        variant={"ghost"}
                        disabled={!playerInfo.path}
                        onClick={handleNextTrack}
                    >
                        <TrackNextIcon />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="min-w-28 w-1/6 flex items-center gap-1">
                        <Button
                            className="flex-shrink-0"
                            size={"icon"}
                            variant={"ghost"}
                            onClick={toggleMute}
                        >
                            <DynamicSpeakerIcon volume={playerInfo.volume} />
                        </Button>
                        <Slider
                            className="flex-grow"
                            value={[playerInfo.volume]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={handleVolumeChange}
                        ></Slider>
                    </div>

                    <Button size={"icon"} variant={"ghost"} onClick={toggleFullScreen}>
                        {isFullScreen ? <ExitFullScreenIcon /> : <EnterFullScreenIcon />}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const DynamicSpeakerIcon: React.FC<{ volume: number }> = ({ volume }) => {
    if (volume === 0) {
        return <SpeakerOffIcon />;
    }

    if (volume < 33) {
        return <SpeakerQuietIcon />;
    }

    if (volume < 66) {
        return <SpeakerModerateIcon />;
    }

    return <SpeakerLoudIcon />;
};

export default PlayerControl;
