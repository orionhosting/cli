import { z } from "zod";
import { GLOBAL_CONFIG_FILE } from "../utils/paths";
import { ConfigManager, ExtractConfig } from "./manager";

export enum AlertFlags {
    FirstDeploy = 1 << 0,
}

export type GlobalConfig = ExtractConfig<typeof globalConfig>;

/**
 * The global config file manager.
 */
export const globalConfig = new ConfigManager({
    path: GLOBAL_CONFIG_FILE,
    version: 1,
    schema: z.object({
        version: z.int().min(0).max(10000),
        telemetry: z.object({
            enabled: z.boolean(),
        }),
        alertFlags: z.int(),
    }),
    defaults: config => ({
        version: config.getCurrentVersion(),
        telemetry: {
            enabled: true,
        },
        alertFlags: 0,
    }),
});
