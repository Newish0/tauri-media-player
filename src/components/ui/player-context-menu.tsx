import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import MpvPlayer from "@/services/MpvPlayer";

import { open } from "@tauri-apps/api/dialog";

const PlayerContextMenu: React.FC<React.PropsWithChildren> = ({ children }) => {
    const handlePlayFile = async () => {
        const path = await open({
            multiple: false,
        });

        if (!path) return;

        // TODO: Play multiple files
        if (Array.isArray(path)) throw new Error("Multiple files not implemented");

        MpvPlayer.loadFile(path);
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={handlePlayFile}>Play file</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};

export default PlayerContextMenu;
