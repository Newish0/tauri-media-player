import { useEffect, useRef } from "react";

let instanceCounter = 0;

const NativeWindowProxy: React.FC<React.ComponentProps<"div">> = (props) => {
    const containerRef = useRef<HTMLDivElement>(null);

    if (instanceCounter > 1) return <div>Cannot create multiple NativeWindowProxy instances</div>;

    useEffect(() => {
        instanceCounter += 1;

        if (!containerRef.current) return;

        const container = containerRef.current; // local reference to not lose track for the cleanup function

        const handlePosSizeChange = () => {
            const { x: relX, y: relY, width, height } = container.getBoundingClientRect();
            const nativeWindowContainer = document.getElementById("native-window-container");

            if (!nativeWindowContainer) return;

            Object.assign(nativeWindowContainer.style, {
                position: "absolute",
                left: `${relX}px`,
                top: `${relY}px`,
                width: `${width}px`,
                height: `${height}px`,
            });
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

export default NativeWindowProxy;
