import { useNavigate } from "react-router-dom";
import MPVWindowProxy from "./MPVWindowProxy";
import PlayerContextMenu from "./PlayerContextMenu";

const TrackSideDetails: React.FC = () => {
    const navigate = useNavigate();

    const handleMpvWindowDoubleClick = () => {
        navigate("/focused-player");
    };

    return (
        <div className="aspect-square w-full">
            <PlayerContextMenu>
                <MPVWindowProxy
                    className="h-full w-full"
                    onDoubleClick={handleMpvWindowDoubleClick}
                />
            </PlayerContextMenu>
        </div>
    );
};

export default TrackSideDetails;
