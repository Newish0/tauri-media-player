import MpvWindowProxy from "@/components/MPVWindowProxy";
import PlayerControl from "@/components/ui/player-control";
import { Card } from "@/components/ui/card";
import PlayerContextMenu from "@/components/ui/player-context-menu";
import { useMouseActivity } from "@/hooks/use-mouse-activity";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import { useMpvPlayer } from "@/hooks/use-mpv-player";

function App() {
    const playerControlContainerRef = useRef<HTMLDivElement>(null);
    const isMouseActive = useMouseActivity([window], {
        inactiveDelay: 1000,
    });

    const {
        info: { path },
    } = useMpvPlayer();

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

export default App;
