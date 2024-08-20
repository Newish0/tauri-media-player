import { invoke } from "@tauri-apps/api";
import { useEffect, useRef, useState } from "react";

const createNativeWindow = async () => {
    const hwnd = await invoke("create_native_window");
    console.log("created", hwnd);

    return hwnd;
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

type NativeWindowProps = {
    onWindowIdChange?: (windowId: string) => void;
};

const NativeWindow: React.FC<NativeWindowProps> = ({ onWindowIdChange: handleWindowIdChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [windowId, setWindowId] = useState<string | null>(null);

    // Create the native window on mount (and destroy on unmount)
    useEffect(() => {
        let isUnmounted = false;

        let localWindowId: string | null = null;
        createNativeWindow().then((newWindowId) => {
            localWindowId = newWindowId as string; // Keep a local reference for cleanup

            if (isUnmounted) destroyNativeWindow(localWindowId);
            else {
                setWindowId(newWindowId as string);
                handleWindowIdChange?.(newWindowId as string);
            }
        });

        return () => {
            isUnmounted = true;
            if (localWindowId) destroyNativeWindow(localWindowId);
        };
    }, [handleWindowIdChange]);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        const updatePosAndSize = () => {
            const { x: relX, y: relY, width, height } = container.getBoundingClientRect();

            const absX = relX;
            const absY = relY;

            if (windowId) setNativeWindowPosition(windowId, absX, absY, width, height);
        };

        container.addEventListener("resize", updatePosAndSize);
        window.addEventListener("resize", updatePosAndSize);
        window.addEventListener("scroll", updatePosAndSize);

        return () => {
            container.removeEventListener("resize", updatePosAndSize);
            window.removeEventListener("resize", updatePosAndSize);
            window.removeEventListener("scroll", updatePosAndSize);
        };
    }, [containerRef.current, windowId]);

    return (
        <div className="w-72 h-72 bg-red-300 border-red-700 border-8" ref={containerRef}>
            NativeWindow
        </div>
    );
};

export default NativeWindow;
