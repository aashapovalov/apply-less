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
 * Persistent Chrome profile directory.
 * Stores SSO cookies between runs so the user only needs to log in once.
 * Located in the home directory so it survives reboots (unlike /tmp).
 */
export const USER_DATA_DIR = path.join(
    process.env.HOME || "/tmp",
    ".applyless-chrome-profile"
);

export const BASE_URL = "https://finder.startupnationcentral.org";
