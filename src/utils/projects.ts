import { existsSync } from "node:fs";
import { readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import z from "zod";
import { getProjectFolderPath, getProjectDataPath, PROJECT_FOLDER_NAME, getProjectUserConfigPath } from "./paths";

/**
 * Add the project data path to the .gitignore if present.
 */
export async function addProjectFolderToGitignore(): Promise<boolean> {
    const gitignorePath = path.join(process.cwd(), ".gitignore");
    const entry = `${PROJECT_FOLDER_NAME}/`;

    if (existsSync(gitignorePath)) {
        const content = await readFile(gitignorePath, "utf-8");
        if (content.includes(entry)) return false;

        await appendFile(gitignorePath, `\n# Orion CLI\n${entry}\n`);
        return true;
    }

    return false;
}

// Project Data

// const PROJECT_DATA_VERSION = 1;

const projectDataSchema = z.object({
    version: z.int(),
    serverId: z.string(),
});

type ProjectData = z.infer<typeof projectDataSchema>;

/**
 * Load the project data from the file system.
 */
export async function loadProjectData(): Promise<ProjectData | null> {
    try {
        const raw = JSON.parse(await readFile(getProjectDataPath(), "utf-8"));
        return projectDataSchema.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Save the project data to the file system.
 */
export async function saveProjectData(data: ProjectData) {
    await mkdir(getProjectFolderPath(), { recursive: true });
    await writeFile(getProjectDataPath(), JSON.stringify(data, null, 2));
}

/**
 * Load the project data, or crash if not found.
 */
export async function requireProjectData(): Promise<ProjectData> {
    const project = await loadProjectData();
    if (!project) throw new Error("No project linked. Run `orion link` first.");
    return project;
}

// Project User Config

const projectUserConfigSchema = z.object({
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
});

type ProjectUserConfig = z.infer<typeof projectUserConfigSchema>;

/**
 * Load the project user config from the file system.
 */
export async function loadProjectUserConfig(): Promise<ProjectUserConfig | null> {
    try {
        const raw = JSON.parse(await readFile(getProjectUserConfigPath(), "utf-8"));
        return projectUserConfigSchema.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Save the project user config to the file system.
 */
export async function saveProjectUserConfig(data: ProjectUserConfig) {
    await writeFile(getProjectUserConfigPath(), JSON.stringify(data, null, 2));
}

/**
 * Load the project user config, or crash if not found.
 */
export async function requireProjectUserConfig(): Promise<ProjectUserConfig> {
    const project = await loadProjectUserConfig();
    if (!project) throw new Error("No project linked. Run `orion link` first.");
    return project;
}
