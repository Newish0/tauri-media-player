import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import Root from "@/routes/root";
import App, { loader as appLoader } from "@/routes/app";
import ErrorPage from "@/routes/error";
import FocusedPlayer from "@/routes/focused-player";
import Playlist, { loader as playlistLoader } from "@/routes/playlist";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

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

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
);
