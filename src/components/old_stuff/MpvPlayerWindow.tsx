import { memo, useCallback, useState } from "react";
import NativeWindow from "./NativeWindow";
import MpvPlayer, { mpvPlayer } from "@/services/MpvPlayer";

const MpvPlayerWindow: React.FC<{}> = memo(({}) => {
    // const [mpvPlayer, setMpvPlayer] = useState<MpvPlayer | null>(null);

    // const beforeCleanup = useCallback(() => {
    //     // mpvPlayer?.destroy();
    // }, [mpvPlayer]);

    const handleWindowIdChange = useCallback(
        async (windowId: string) => {
            console.log("handleWindowIdChange", windowId);

            // if (mpvPlayer) await mpvPlayer.destroy();

            // const newMpvPlayer = await MpvPlayer.create();

            // setMpvPlayer(mpvPlayer);

            mpvPlayer.attachToWindow(windowId).then(() => {
                // mpvPlayer.loadFile("E:/Users/Administrator/Downloads/test.mkv");
            });
        },
        [mpvPlayer]
    );

    return <NativeWindow onWindowIdChange={handleWindowIdChange} />;
});

export default MpvPlayerWindow;
