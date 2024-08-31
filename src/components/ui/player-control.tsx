import { useMpvPlayer } from "@/hooks/use-mpv-player";
import { Slider } from "./slider";
import { info } from "console";
import { formatSeconds } from "@/lib/utils";
import { Button } from "./button";
import {
    PauseIcon,
    PlayIcon,
    SpeakerLoudIcon,
    SpeakerModerateIcon,
    SpeakerOffIcon,
    SpeakerQuietIcon,
} from "@radix-ui/react-icons";
import { useState } from "react";

const PlayerControl: React.FC = () => {
    const { info: playerInfo, seek, play, pause, setVolume } = useMpvPlayer();

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

    return (
        <div className="w-full h-full flex flex-col justify-center gap-1">
            <div className="flex justify-between text-sm font-medium">
                <span>{formatSeconds(playerInfo.position)}</span>
                <span>{formatSeconds(playerInfo.duration)}</span>
            </div>
            <Slider
                value={[playerInfo.position]}
                min={0}
                max={playerInfo.duration}
                step={0.1}
                onValueChange={handleSeek}
            ></Slider>

            <div className="flex justify-between items-center">
                <div>
                    <Button size={"icon"} variant={"ghost"} onClick={handlePlayPauseToggle}>
                        {playerInfo.isPaused ? <PlayIcon></PlayIcon> : <PauseIcon></PauseIcon>}
                    </Button>
                </div>

                <div className="min-w-28 w-1/6 flex items-center gap-2">
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
