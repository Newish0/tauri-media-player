import { WebviewWindow } from "@tauri-apps/api/window";
import { useState, useEffect } from "react";

/**
 * Get the current fullscreen state of a window and a function to change it.
 * 
 * > **WARNING:** If fullscreen is toggle elsewhere, the value will be out of sync.
 * 
 * > **NOTE:** This hook requires the `window` permission.
 *
 * @param windowLabel The label of the window to check.
 * @returns An array with the current fullscreen state and a function to change it.
 */
export function useWindowFullscreen(
    windowLabel: string
): [boolean, (isFullscreen: boolean) => Promise<void>] {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const window = WebviewWindow.getByLabel(windowLabel);

        // Get the initial state
        window?.isFullscreen().then(setIsFullscreen);
    }, [windowLabel]);

    /**
     * Set the fullscreen state of the window.
     *
     * @param isFullscreen Whether the window should be in fullscreen mode.
     * @returns A promise that resolves after the state has been updated.
     */
    const setFullscreen = async (isFullscreen: boolean) => {
        const window = WebviewWindow.getByLabel(windowLabel);
        if (window) {
            // Optimistic update
            setIsFullscreen(isFullscreen);
            // Actual update
            await window.setFullscreen(isFullscreen);
            // Revert to the actual state if the update failed
            window.isFullscreen().then(setIsFullscreen);
        }
    };

    return [isFullscreen, setFullscreen] as const;
}
