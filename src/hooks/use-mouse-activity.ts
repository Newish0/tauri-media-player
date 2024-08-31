import { useState, useEffect } from "react";

export type MouseActivityOptions = {
    inactiveDelay?: number;
};

export function useMouseActivity(options: MouseActivityOptions = {}) {
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

        if (!window) return;
        window.addEventListener("mouseover", handleMouseOver);
        window.addEventListener("mouseleave", handleMouseLeave);
        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            window.removeEventListener("mouseover", handleMouseOver);
            window.removeEventListener("mouseleave", handleMouseLeave);
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, [inactiveDelay]);

    return isActive;
}
