import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PlaylistItemProps {
    playlist: {
        id: string;
        name: string;
    };
}

const PlaylistItem: React.FC<PlaylistItemProps> = ({ playlist }) => {
    return (
        <li>
            <NavLink
                to={`/app/playlists/${playlist.id}`}
                className={({ isActive }) =>
                    cn(
                        "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                    )
                }
            >
                {playlist.name}
            </NavLink>
        </li>
    );
};

export default PlaylistItem;
