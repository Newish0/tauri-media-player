import { invoke } from "@tauri-apps/api";

const createNativeWindow = async () => {
    const windowId: string = await invoke("create_native_window");
    console.log("created", windowId);

    return windowId;
};

const destroyNativeWindow = async (windowId: string) => {
    console.log("destroying", windowId);
    return invoke("destroy_native_window", {
        windowId,
    });
};

const setNativeWindowPosition = async (
    windowId: string,
    x: number,
    y: number,
    width: number,
    height: number
) => {
    // Round to the nearest integer for winapi call
    x = Math.round(x);
    y = Math.round(y);
    width = Math.round(width);
    height = Math.round(height);

    console.log("setting position", windowId, x, y, width, height);

    return invoke("set_native_window_position", {
        windowId,
        x: x,
        y: y,
        w: width,
        h: height,
    });
};

// Create a single instance of a native window.
const initializeAppWithNativeWindow = async (container: HTMLDivElement) => {
    const windowId: string = await createNativeWindow();

    const updatePosAndSize = () => {
        const { x: relX, y: relY, width, height } = container.getBoundingClientRect();

        const absX = relX;
        const absY = relY;

        if (windowId) setNativeWindowPosition(windowId, absX, absY, width, height);
    };

    container.addEventListener("resize", updatePosAndSize);
    new ResizeObserver(updatePosAndSize).observe(container);
    new MutationObserver(updatePosAndSize).observe(container, { attributes: true });
    window.addEventListener("resize", updatePosAndSize);
    window.addEventListener("scroll", updatePosAndSize);
    
    updatePosAndSize(); // Initial update

    return windowId;
};

export default initializeAppWithNativeWindow;
