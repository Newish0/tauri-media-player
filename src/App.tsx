import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Button } from "./components/ui/button";

function App() {

    return (
        <div className="container">
            <h1>Welcome to Tauri MPV Minimal Example!</h1>

            <Button>PLAY MEDIA</Button>
            
        </div>
    );
}

export default App;
