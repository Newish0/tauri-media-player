import PlayerControl from "@/components/PlayerControl";
import PlaylistList from "@/components/PlaylistList";
import TrackSideDetails from "@/components/TrackSideDetails";
import TitledScrollArea from "@/components/ui/tittled-scroll-area";
import { Outlet } from "react-router-dom";

const App: React.FC = () => {
    return (
        <div className="h-screen flex flex-col">
            <div className="overflow-hidden flex-1 flex flex-nowrap">
                <div className="w-1/4 max-w-60 border">
                    <TitledScrollArea title="Your Library">
                        <PlaylistList />
                    </TitledScrollArea>
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
