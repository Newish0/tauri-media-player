import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import Root from "@/routes/root";
import App, { loader as appLoader } from "@/routes/app";
import ErrorPage from "@/routes/error";
import FocusedPlayer from "@/routes/focused-player";
import Playlist, { loader as playlistLoader } from "@/routes/playlist";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MpvPlayer, { MpvEventId } from "./services/MpvPlayer";
import { getPictures } from "./services/MediaInfo";
import { convertToBase64Image } from "./lib/utils";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        errorElement: <ErrorPage />,
        children: [
            {
                path: "/app",
                element: <App />,
                loader: appLoader,
                children: [
                    {
                        path: "/app/playlists/:id",
                        element: <Playlist />,
                        loader: playlistLoader,
                    },
                ],
            },
            {
                path: "/focused-player",
                element: <FocusedPlayer />,
            },
        ],
    },
]);

MpvPlayer.on(MpvEventId.StartFile, async () => {
    const path = await MpvPlayer.getPath();
    console.log("start file", path);
    if (path) {
        const pictures = await getPictures(path);

        if (pictures.length > 0) {
            const base64Picture = convertToBase64Image(pictures[0].data, pictures[0].mimeType);
            console.log(base64Picture);

            // await emit('set-background', base64Picture);
            invoke("set_background", { color: base64Picture });
        }
    }
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
);
