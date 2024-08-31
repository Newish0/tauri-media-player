import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Button } from "./components/ui/button";
// import { mpvPlayer } from "./services/MpvPlayer";
import MpvWindowProxy from "./components/MpvWindowProxy";
import MpvPlayer from "./services/MpvPlayer";
import { useMpvPlayer } from "./hooks/use-mpv-player";
import PlayerControl from "./components/ui/player-control";
import { Card } from "./components/ui/card";
import PlayerContextMenu from "./components/ui/player-context-menu";
import { useMouseActivity } from "./hooks/use-mouse-activity";
import { cn } from "./lib/utils";

function App() {
    const isMouseActive = useMouseActivity({ inactiveDelay: 1000 });

    return (
        <div className="h-screen w-screen relative">
            <PlayerContextMenu>
                <MpvWindowProxy className="h-full w-full" />
            </PlayerContextMenu>

            {/* Center wrapper for player controls */}
            <div className="absolute bottom-2 w-full flex justify-center">
                {/* Player control container  */}
                <Card
                    className={cn(
                        "w-full md:w-1/2 max-w-6xl p-4 transition-opacity duration-300",
                        isMouseActive ? "opacity-85" : "opacity-0"
                    )}
                >
                    <PlayerControl />
                </Card>
            </div>
        </div>
    );
}

export default App;
