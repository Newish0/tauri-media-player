/**
 * PlaylistContainerContextMenu Component
 *
 * This component wraps the playlist items and provides a context menu for adding files.
 * It manages interactions related to the entire playlist, allowing users to add new files
 * via a context menu.
 */

import React from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

/**
 * Props for the PlaylistContainerContextMenu component.
 */
interface PlaylistContainerContextMenuProps {
    children: React.ReactNode;
    handleAddFile: () => void;
}

/**
 * Component that wraps the playlist and provides a context menu for adding files.
 */
const PlaylistContainerContextMenu: React.FC<PlaylistContainerContextMenuProps> = ({
    children,
    handleAddFile,
}) => (
    <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-32">
            <ContextMenuItem onClick={handleAddFile}>Add file</ContextMenuItem>
        </ContextMenuContent>
    </ContextMenu>
);

export default PlaylistContainerContextMenu;
