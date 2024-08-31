import { useEffect, useRef } from "react";

import { LogicalPosition, LogicalSize, WebviewWindow } from "@tauri-apps/api/window";

let instanceCounter = 0;

/**
 * An element that proxies MPV's native window position and size.
 * > **WARNING: Cannot be used in multiple places at the same time**
 * @param props
 */
const MPVWindowProxy: React.FC<Omit<React.ComponentProps<"div">, "ref">> = (props) => {
    const containerRef = useRef<HTMLDivElement>(null);

    if (instanceCounter > 1) return <div>Cannot create multiple NativeWindowProxy instances</div>;

    useEffect(() => {
        instanceCounter += 1;

        if (!containerRef.current) return;

        const container = containerRef.current; // local reference to not lose track for the cleanup function

        const handlePosSizeChange = () => {
            const { x: relX, y: relY, width, height } = container.getBoundingClientRect();

            const mpvWindow = WebviewWindow.getByLabel("mpv");

            if (!mpvWindow) return;

            // Sync MPV's native window position and size HTML proxy
            mpvWindow.setPosition(new LogicalPosition(relX, relY));
            mpvWindow.setSize(new LogicalSize(width, height));
        };

        container.addEventListener("resize", handlePosSizeChange);
        window.addEventListener("resize", handlePosSizeChange);
        window.addEventListener("scroll", handlePosSizeChange);

        handlePosSizeChange(); // Initial update

        return () => {
            instanceCounter -= 1;

            container.removeEventListener("resize", handlePosSizeChange);
            window.removeEventListener("resize", handlePosSizeChange);
            window.removeEventListener("scroll", handlePosSizeChange);
        };
    }, []);

    return <div {...props} ref={containerRef}></div>;
};

export default MPVWindowProxy;
