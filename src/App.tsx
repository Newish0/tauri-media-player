import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Button } from "./components/ui/button";
import NativeWindow from "./components/NativeWindow";
import MpvPlayerWindow from "./components/MpvPlayerWindow";

function App() {
    return (
        <div className="container">
            <h1>Welcome to Tauri MPV Minimal Example!</h1>

            <Button>PLAY MEDIA</Button>

            <MpvPlayerWindow />
        </div>
    );
}

export default App;
