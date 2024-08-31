import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Button } from "./components/ui/button";
// import { mpvPlayer } from "./services/MpvPlayer";
import MpvWindowProxy from "./components/MpvWindowProxy";
import MpvPlayer from "./services/MpvPlayer";
import { useMpvPlayer } from "./hooks/use-mpv-player";
import PlayerControl from "./components/ui/player-control";
import { Card } from "./components/ui/card";

function App() {
    return (
        <div className="h-screen w-screen relative">
            <MpvWindowProxy className="h-full w-full" />

            {/* Center wrapper for player controls */}
            <div className="absolute bottom-2 w-full flex justify-center">
                {/* Player control container  */}

                <Card className="w-full md:w-1/2 max-w-6xl p-4 ">
                    <PlayerControl />
                </Card>
            </div>
        </div>
    );
}

export default App;
