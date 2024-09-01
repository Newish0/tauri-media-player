import { Outlet } from "react-router-dom";

const App: React.FC = () => {
    return (
        <div className="h-screen flex">
            <div className="w-1/4 max-w-60 border">PLAYLISTS</div>
            <div className="flex-1 border">
                {/* Currently selected playlist  */}
                <Outlet />
            </div>
            <div className="w-1/4 max-w-96 border">CURRENTLY PLAYING TRACK DETAILS</div>
        </div>
    );
};

export default App;
