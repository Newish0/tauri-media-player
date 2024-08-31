import { useState, useEffect } from "react";

export type MouseActivityOptions = {
    inactiveDelay?: number;
};

export function useMouseActivity(
    root: Window | Element | null,
    options: MouseActivityOptions = {}
) {
    const { inactiveDelay = 100 } = options;
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let tmId: ReturnType<typeof setTimeout>;
        const setInactiveWithDelay = () => {
            clearTimeout(tmId);
            tmId = setTimeout(() => setIsActive(false), inactiveDelay);
        };

        const handleMouseOver = () => setIsActive(true);
        const handleMouseLeave = () => setInactiveWithDelay();
        const handleMouseMove = () => {
            if (isActive) return;
            setIsActive(true);
            setInactiveWithDelay();
        };

        if (!root) return;
        root.addEventListener("mouseover", handleMouseOver);
        root.addEventListener("mouseleave", handleMouseLeave);
        root.addEventListener("mousemove", handleMouseMove);
        return () => {
            root.removeEventListener("mouseover", handleMouseOver);
            root.removeEventListener("mouseleave", handleMouseLeave);
            root.removeEventListener("mousemove", handleMouseMove);
        };
    }, [root, inactiveDelay]);

    return isActive;
}
