import MPVWindowProxy from "./MPVWindowProxy";
import PlayerContextMenu from "./PlayerContextMenu";

const TrackSideDetails: React.FC = () => {
    return (
        <div>
            <PlayerContextMenu>
                <MPVWindowProxy className="aspect-square w-full" />
            </PlayerContextMenu>
        </div>
    );
};

export default TrackSideDetails;
