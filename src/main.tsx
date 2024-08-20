import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import initializeAppWithNativeWindow from "./nativewindow";
import { mpvPlayer } from "./services/MpvPlayer";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

const windowId = await initializeAppWithNativeWindow(
    document.getElementById("native-window-container") as HTMLDivElement
);
mpvPlayer.attachToWindow(windowId);
