import React from "react";
import PlaylistListItem from "./PlaylistListItem";

// Mock data for playlists
const playlists: { id: string; name: string }[] = [
    // { id: "1", name: "Favorites" },
    // { id: "2", name: "Rock Classics" },
    // { id: "3", name: "Chill Vibes" },
    // { id: "4", name: "Workout Mix" },
    // { id: "5", name: "Party Anthems" },
];

const PlaylistList: React.FC = () => {
    return (
        <nav>
            <ul className="space-y-1">
                {/* Special item */}
                <PlaylistListItem playlist={{ id: "current-folder", name: "Current Folder" }} />

                {playlists.map((playlist) => (
                    <PlaylistListItem key={playlist.id} playlist={playlist} />
                ))}
            </ul>
        </nav>
    );
};

export default PlaylistList;
