import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Button } from "./components/ui/button";
// import { mpvPlayer } from "./services/MpvPlayer";
import MPVWindowProxy from "./components/MPVWindowProxy";

function App() {

    return (
        <div className="h-full w-full min-h-screen">
            <h1>Welcome to Tauri MPV Minimal Example!</h1>

            {/* <Button onClick={() => mpvPlayer.loadFile("E:/Users/Administrator/Downloads/[SubsPlease] Gimai Seikatsu - 07 (1080p) [430962AA].mkv")}>
                PLAY MEDIA
            </Button> */}

            {/* <MpvPlayerWindow /> */}

            <MPVWindowProxy className="h-full min-h-96 border" />

{/* 
            <Button onClick={() => mpvPlayer.play()}>Play </Button>
            <Button onClick={() => mpvPlayer.pause()}>Pause</Button> */}
        </div>
    );
}

export default App;
