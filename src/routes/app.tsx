import PlayerControl from "@/components/PlayerControl";
import TrackSideDetails from "@/components/TrackSideDetails";
import MpvPlayer from "@/services/MpvPlayer";
import { Outlet } from "react-router-dom";

const App: React.FC = () => {

    return (
        <div className="h-screen flex flex-col">
            <div className=" h-full flex-1 flex">
                <div className="w-1/4 max-w-60 border">PLAYLISTS</div>
                <div className="flex-1 border">
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
