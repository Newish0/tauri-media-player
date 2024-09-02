import MpvWindowProxy from "@/components/MPVWindowProxy";
import PlayerControl from "@/components/PlayerControl";
import { Card } from "@/components/ui/card";
import PlayerContextMenu from "@/components/PlayerContextMenu";
import { useMouseActivity } from "@/hooks/use-mouse-activity";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import { useMpvPlayer } from "@/hooks/use-mpv-player";
import { Cross1Icon, ExitIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

function FocusedPlayer() {
    const playerControlContainerRef = useRef<HTMLDivElement>(null);
    const isMouseActive = useMouseActivity([window], {
        inactiveDelay: 1000,
    });

    const {
        info: { path, filename },
    } = useMpvPlayer();

    const navigate = useNavigate();

    const handleExitFocusedPlayer = () => {
        navigate(-1);
    };

    return (
        <div className="h-screen w-screen relative">
            <PlayerContextMenu>
                {path ? (
                    <MpvWindowProxy className="h-full w-full" />
                ) : (
                    <div className="absolute h-full w-full inset-0 flex flex-col justify-center items-center">
                        <div className="leading-6 font-medium">No file opened</div>
                        <i>Right click to play file</i>
                    </div>
                )}
            </PlayerContextMenu>

            {/* Top container */}
            <div
                className={cn(
                    "absolute top-0 w-full p-2 transition-opacity duration-300",
                    isMouseActive ? "opacity-90" : "opacity-0"
                )}
            >
                <div className="text-primary-foreground flex items-center">
                    <Button variant={"link"} onClick={handleExitFocusedPlayer}>
                        <Cross1Icon className="text-primary-foreground" />
                    </Button>

                    <div>{filename}</div>
                </div>
            </div>

            {/* Center wrapper for player controls */}
            <div className="absolute bottom-2 w-full flex justify-center">
                {/* Player control container  */}
                <Card
                    ref={playerControlContainerRef}
                    className={cn(
                        "w-full md:w-1/2 max-w-6xl p-2 transition-opacity duration-300",
                        isMouseActive ? "bg-card/90 opacity-90" : "opacity-0"
                    )}
                >
                    <PlayerControl />
                </Card>
            </div>
        </div>
    );
}

export default FocusedPlayer;
