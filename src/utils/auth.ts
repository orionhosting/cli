import { readFile, mkdir, writeFile } from "node:fs/promises";
import z from "zod";
import { GLOBAL_AUTH_FILE, GLOBAL_CONFIG_DIR } from "./paths";

const AUTH_CONFIG_VERSION = 1;

const authConfigSchema = z.object({
    version: z.int(),
    token: z.string(),
});

type AuthConfig = z.infer<typeof authConfigSchema>;

/**
 * Write the config to the file system.
 */
export async function saveAuth(config: AuthConfig) {
    await mkdir(GLOBAL_CONFIG_DIR, { recursive: true });
    await writeFile(GLOBAL_AUTH_FILE, JSON.stringify(config, null, 2));
}

/**
 * Load the config from the file system.
 */
export async function loadAuth(): Promise<AuthConfig | null> {
    try {
        const raw = JSON.parse(await readFile(GLOBAL_AUTH_FILE, "utf-8"));
        return authConfigSchema.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Load the config from the file system.
 */
export async function loadOrCreateAuth(): Promise<AuthConfig> {
    try {
        const raw = JSON.parse(await readFile(GLOBAL_AUTH_FILE, "utf-8"));
        return authConfigSchema.parse(raw);
    } catch {
        return createAuth();
    }
}

/**
 * Load the config or throw error if not found.
 */
export async function requireAuth(): Promise<AuthConfig> {
    const auth = await loadAuth();
    if (!auth) throw new Error("Not logged in. Run `orion login` first.");
    return auth;
}

export function createAuth(): AuthConfig {
    return {
        version: AUTH_CONFIG_VERSION,
        token: "",
    };
}
