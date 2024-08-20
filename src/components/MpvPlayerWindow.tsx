import { useState } from "react";
import NativeWindow from "./NativeWindow";
import MpvPlayer from "@/services/MpvPlayer";

const MpvPlayerWindow: React.FC = () => {
    const [mpvPlayer, setMpvPlayer] = useState<MpvPlayer | null>(null);

    const handleWindowIdChange = (windowId: string) => {
        if (mpvPlayer) mpvPlayer.attachToWindow(windowId);
        else {
            MpvPlayer.create().then((player) => {
                player.attachToWindow(windowId);
                setMpvPlayer(player);

                return player.loadFile("E:/Users/Administrator/Downloads/test.mkv");
            });
        }
    };

    return <NativeWindow onWindowIdChange={handleWindowIdChange} />;
};

export default MpvPlayerWindow;