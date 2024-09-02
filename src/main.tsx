import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import Root from "@/routes/root";
import App from "@/routes/app";
import ErrorPage from "@/routes/error";
import FocusedPlayer from "@/routes/focused-player";

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
