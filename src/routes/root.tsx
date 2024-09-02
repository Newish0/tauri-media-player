import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import { db } from "@/db/database";

console.log(db);

/**
 * Root page has no real UI, just redirects to app.
 * But quite useful for error handling over the entire app.
 * @returns
 */
const Root: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate("/app", { replace: true }); // redirect to app
    }, [navigate]);

    return (
        <>
            <Outlet />
        </>
    );
};

export default Root;
