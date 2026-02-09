import path from "node:path";

/**
 * Known installation paths for Google Chrome across OSes.
 * The first existing path will be used.
 */
export const CHROME_PATHS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // macOS
    "/usr/bin/google-chrome-stable", // Linux
    "/usr/bin/google-chrome", // Linux alt
];

/**
 * Local port used for Chrome DevTools Protocol (CDP) remote debugging.
 * Playwright connects to Chrome via this port.
 */
export const CDP_PORT = 9400;

/**
 * Temporary user profile directory for the launched Chrome instance.
 * Deleted and recreated on each connect() call to avoid stale locks/caches.
 */
export const USER_DATA_DIR = path.join("/tmp", "applyless-chrome-profile");

export const BASE_URL = "https://finder.startupnationcentral.org";
