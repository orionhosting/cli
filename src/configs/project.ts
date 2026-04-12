import { z } from "zod";
import { PROJECT_CONFIG_FILE, PROJECT_USER_CONFIG_FILE } from "../utils/paths";
import { ConfigManager, ExtractConfig } from "./manager";

export type ProjectConfig = ExtractConfig<typeof projectConfig>;

/**
 * The manager of the generated project config file.
 */
export const projectConfig = new ConfigManager({
    path: PROJECT_CONFIG_FILE,
    version: 1,
    schema: z.object({
        version: z.int().min(0).max(10000),
        serverId: z.string().min(1).max(100).nullable(),
    }),
    defaults: config => ({
        version: config.getCurrentVersion(),
        serverId: null,
    }),
});

const deployPipelineStageSchema = z.object({
    path: z.string().max(255).optional().describe("The root path of the deployment stage"),
    clean: z
        .boolean()
        .optional()
        .describe("If true, remove all the files from the server before deploying the new version"),
    include: z.array(z.string().max(255)).max(255).optional().describe("List of files/patterns to deploy"),
    exclude: z
        .array(z.string().max(255))
        .max(255)
        .optional()
        .describe("List of files/patterns to ignore. Takes priority over the include option"),
});

export type ProjectUserConfig = ExtractConfig<typeof projectUserConfig>;

/**
 * The config manager of the project user config file.
 */
export const projectUserConfig = new ConfigManager({
    path: PROJECT_USER_CONFIG_FILE,
    schema: z
        .object({
            $schema: z.string().optional(),
            deploy: deployPipelineStageSchema
                .extend({
                    pipeline: z
                        .array(deployPipelineStageSchema)
                        .max(20)
                        .optional()
                        .describe("A pipeline of stages for the deployment"),
                })
                .optional(),
        })
        .meta({ title: "Orion Config", description: "Orion CLI configuration schema" }),
    defaults: () => ({
        $schema: "https://orionhost.xyz/cli.schema.json",
        deploy: {
            clean: true,
            exclude: ["node_modules", "dist", ".git", ".env", "*.log"],
        },
    }),
});
