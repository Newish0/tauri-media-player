import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import mime from "mime";

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

export function getFileExtension(filePath: string): string | undefined {
    return filePath.split(".").pop();
}

/**
 * **Guess** if a file is a media file (audio, video, image) based on its file extension.
 *
 * First it tries to guess the MIME type of the file, then it checks if the type is one of the media types.
 *
 * @param filePath - The path to the file to check.
 * @returns `true` if the file is a media file, `false` otherwise.
 */
export function isMediaFileByFileExtension(filePath: string): boolean {
    const fileExtension = getFileExtension(filePath);

    if (!fileExtension) return false;

    // "Media" mime types
    const mediaTypes = ["audio", "video"];
    return isExtensionOfType(fileExtension, mediaTypes);
}

/**
 * **Guess** if a file is a video file based on its file extension.
 *
 * @param filePath - The path to the file to check.
 * @returns `true` if the file is a video file, `false` otherwise.
 */
export function isVideoFileByFileExtension(filePath: string): boolean {
    const fileExtension = getFileExtension(filePath);
    if (!fileExtension) return false;
    return isExtensionOfType(fileExtension, ["video"]);
}

/**
 * Checks if a file extension is of a certain MIME type.
 *
 * @param extension - The file extension to check.
 * @param mimeTypes - The MIME types to check against.
 * @returns `true` if the extension is of one of the MIME types, `false` otherwise.
 *
 * @example
 */
export function isExtensionOfType(extension: string, mimeTypes: string[]): boolean {
    // Get the MIME type of the extension
    const mimeType = mime.getType(extension);

    // If the MIME type cannot be determined, return false
    if (!mimeType) {
        return false;
    }

    // Split the MIME type into the type and subtype
    const [type] = mimeType.split("/");

    // Check if the type is one of the mime types
    return mimeTypes.includes(type);
}
