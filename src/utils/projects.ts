import { existsSync } from "node:fs";
import { readFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { PROJECT_DIR_NAME } from "./paths";

/**
 * Add the project data path to the .gitignore if present.
 */
export async function addProjectFolderToGitignore(): Promise<boolean> {
    const gitignorePath = path.join(process.cwd(), ".gitignore");
    const entry = `${PROJECT_DIR_NAME}/`;

    if (existsSync(gitignorePath)) {
        const content = await readFile(gitignorePath, "utf-8");
        if (content.includes(entry)) return false;

        await appendFile(gitignorePath, `\n# Orion CLI\n${entry}\n`);
        return true;
    }

    return false;
}
