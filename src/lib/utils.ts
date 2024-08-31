import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Given a time in seconds, format it as HH:MM:SS if hours > 0, MM:SS otherwise
 * @param seconds
 * @returns
 */
export function formatSeconds(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds - h * 3600) / 60);
    const s = Math.floor(seconds - h * 3600 - m * 60);

    return h > 0
        ? `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`
        : `${m}:${s < 10 ? "0" : ""}${s}`;
}
