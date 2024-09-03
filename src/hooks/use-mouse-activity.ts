import { useState, useEffect } from "react";

export type MouseActivityOptions = {
    inactiveDelay?: number;
};

export function useMouseActivity(
    root: Window | Element | null | (Window | Element | null)[],
    options: MouseActivityOptions = {}
) {
    const { inactiveDelay = 1000 } = options;
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let tmId: ReturnType<typeof setTimeout>;
        const setInactiveWithDelay = () => {
            clearTimeout(tmId);
            tmId = setTimeout(() => setIsActive(false), inactiveDelay);
        };

        const handleMouseOver = () => {
            setIsActive(true);
        };
        const handleMouseLeave = () => setInactiveWithDelay();
        const handleMouseMove = () => {
            setIsActive(true);
            setInactiveWithDelay();
        };

        if (!root) return;

        const addListeners = (target: Window | Element) => {
            target.addEventListener("mouseover", handleMouseOver);
            target.addEventListener("mouseleave", handleMouseLeave);
            target.addEventListener("mousemove", handleMouseMove);
        };

        const removeListeners = (target: Window | Element) => {
            target.removeEventListener("mouseover", handleMouseOver);
            target.removeEventListener("mouseleave", handleMouseLeave);
            target.removeEventListener("mousemove", handleMouseMove);
        };

        if (Array.isArray(root)) {
            root.forEach((eln) => eln && addListeners(eln));
            return () => root.forEach((eln) => eln && removeListeners(eln));
        }

        addListeners(root);
        return () => {
            removeListeners(root);
        };
    }, [...(Array.isArray(root) ? [...root] : [root]), inactiveDelay]);

    return isActive;
}
