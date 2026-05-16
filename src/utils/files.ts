import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function getAllFiles(dirPath: string, basePath = ""): string[] {
    let results: string[] = [];
    const list = readdirSync(dirPath);

    list.forEach((file) => {
        const filePath = join(dirPath, file);
        const stat = statSync(filePath);

        const relativePath = basePath ? join(basePath, file) : file;

        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(filePath, relativePath));
        } else {
            results.push(relativePath);
        }
    });

    return results;
}