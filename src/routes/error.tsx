import { Link, useRouteError } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";
import { $viewStates } from "@/stores/view-states";

export default function ErrorPage() {
    const error: any = useRouteError();

    // Resets view state on error. Usually error happens when we forcefully delete the DB. 
    // Therefore, need to reset stored states since certain items no longer exist in DB. 
    const resetViewState = () => {
        $viewStates.setKey("lastViewedPlaylistId", "current-folder");
    };

    return (
        <div className="text-center space-y-2 my-16">
            <h1 className="text-3xl font-bold text-primary">Oops!</h1>
            <p className="text-xl text-primary">Sorry, an unexpected error has occurred.</p>
            <div className="text-destructive">
                <p>
                    <i>
                        {error?.status} {error?.statusText || error?.message}
                    </i>
                </p>

                {/* Only show full error in dev mode */}
                {import.meta.env.DEV && (
                    <Card className="w-min m-auto">
                        <CardContent className="h-full flex items-center justify-center p-4">
                            <pre className="text-left text-sm flex justify-center bg-card">
                                <code>{JSON.stringify(error, null, 2)}</code>
                            </pre>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Link to="/" onClick={resetViewState} className={buttonVariants({ variant: "link" })}>
                Return to app
            </Link>
        </div>
    );
}
