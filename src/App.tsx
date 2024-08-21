import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Button } from "./components/ui/button";
import { mpvPlayer } from "./services/MpvPlayer";
import NativeWindowProxy from "./components/NativeWindowProxy";

function App() {

    return (
        <div className="container">
            <h1>Welcome to Tauri MPV Minimal Example!</h1>

            <Button onClick={() => mpvPlayer.loadFile("E:/Users/Administrator/Downloads/[SubsPlease] Gimai Seikatsu - 07 (1080p) [430962AA].mkv")}>
                PLAY MEDIA
            </Button>

            {/* <MpvPlayerWindow /> */}

            <NativeWindowProxy className="h-full min-h-96 border" />


            <Button onClick={() => mpvPlayer.play()}>Play </Button>
            <Button onClick={() => mpvPlayer.pause()}>Pause</Button>
        </div>
    );
}

export default App;
