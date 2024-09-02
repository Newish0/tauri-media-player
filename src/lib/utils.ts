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

/**
 * Converts a string from snake_case or kebab-case to camelCase.
 *
 * @param s - The string to convert.
 * @returns The camelCase version of the input string.
 */
export function toCamel(s: string): string {
    return s.replace(/([-_][a-z])/g, (group) =>
        group.toUpperCase().replace("-", "").replace("_", "")
    );
}

/**
 * Recursively converts the keys of an object from snake_case or kebab-case to camelCase.
 *
 * @param obj - The object whose keys need to be converted.
 * @returns A new object with all keys converted to camelCase.
 */
export function objectKeysToCamelCase(obj: Record<string, any>): Record<string, any> {
    if (Array.isArray(obj)) {
        return obj.map((item) => objectKeysToCamelCase(item));
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            const camelKey = toCamel(key);
            result[camelKey] = objectKeysToCamelCase(obj[key]);
            return result;
        }, {} as Record<string, any>);
    }
    return obj;
}

/**
 * Gets the full name of a language given its ISO 639-1 code.
 *
 * @param langCode - The ISO 639-1 language code (e.g., 'en', 'zh', 'fr').
 * @returns The full name of the language in English.
 *
 * @example
 * ```typescript
 * const languageName = getLanguageFullName('zh');
 * console.log(languageName); // Output: "Chinese"
 * ```
 */
export function getLanguageFullName(langCode: string): string | undefined {
    const languageName = new Intl.DisplayNames(["en"], { type: "language" });
    return languageName.of(langCode);
}
