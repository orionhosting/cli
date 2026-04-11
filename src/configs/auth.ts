import { z } from "zod";
import { GLOBAL_AUTH_FILE } from "../utils/paths";
import { ConfigManager, ExtractConfig } from "./manager";

export type AuthConfig = ExtractConfig<typeof auth>;

/**
 * The global auth config file manager.
 */
export const auth = new ConfigManager({
    path: GLOBAL_AUTH_FILE,
    version: 1,
    schema: z.object({
        version: z.int().min(0).max(10000),
        token: z.string().min(1).max(100).nullable(),
    }),
    defaults: config => ({
        version: config.getCurrentVersion(),
        token: null,
    }),
});
