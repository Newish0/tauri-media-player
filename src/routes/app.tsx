import PlayerControl from "@/components/PlayerControl";
import PlaylistList from "@/components/PlaylistList";
import TrackSideDetails from "@/components/TrackSideDetails";
import TitledScrollArea from "@/components/ui/tittled-scroll-area";
import { Playlist } from "@/services/PlaylistManager";
import { useEffect } from "react";
import { Outlet, useLoaderData, useLocation, useNavigate, useRevalidator } from "react-router-dom";

type LoaderData = {
    playlists: Playlist[];
};

export const loader = async (): Promise<LoaderData> => {
    const playlists = await Playlist.getAll();
    return { playlists };
};

const App: React.FC = () => {
    const { playlists } = useLoaderData() as LoaderData;

    const location = useLocation();
    const navigate = useNavigate();
    const revalidator = useRevalidator();

    useEffect(() => {
        // TODO: navigate to last visited playlist (after implementing persistent user stuff for volume etc...)

        // The current folder playlist is the default one.
        // Should never be able to stay on `/app` (only allowed on children routes)
        if (location.pathname === "/app") {
            navigate("/app/playlists/current-folder", { replace: true });
        }
    }, [location.pathname, navigate]);

    return (
        <div className="h-screen flex flex-col">
            <div className="overflow-hidden flex-1 flex flex-nowrap">
                <div className="w-1/4 max-w-60 border">
                    <h2 className="font-semibold px-4 pt-2 pb-1">Your Library</h2>
                    <div className="h-full p-2">
                        <PlaylistList playlists={playlists} />
                    </div>
                </div>
                <div className="flex-1 overflow-hidden border">
                    {/* Currently selected playlist  */}
                    <Outlet />
                </div>
                <div className="w-1/4 max-w-72 border">
                    <TrackSideDetails />
                </div>
            </div>

            <div className="p-2">
                <PlayerControl />
            </div>
        </div>
    );
};

export default App;
