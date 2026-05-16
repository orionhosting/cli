import { createWriteStream } from "node:fs";
import archiver from "archiver";
import { minimatch } from "minimatch";
import { getAllFiles } from "./files";
import { join } from "node:path";

const DEFAULT_IGNORE = ["node_modules", ".git"];

/**
 * Zip a directory.
 */
export function zipDirectory(sourceDir: string, outputPath: string, ignore: string[], include: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const output = createWriteStream(outputPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        const allIgnore = [...DEFAULT_IGNORE, ...ignore];

        output.on("close", () => {
            output.destroy();
            resolve();
        });
        archive.on("error", reject);
        archive.pipe(output);

        const allFiles = getAllFiles(sourceDir, "");

        for (const filePath of allFiles) {
            const isIgnored = allIgnore.some(pattern => 
                minimatch(filePath, pattern, { dot: true, matchBase: true }) ||
                minimatch(filePath + "/**", pattern, { dot: true })
            );

            if (isIgnored) continue;

            if (include.length > 0) {
                const isIncluded = include.some(pattern => 
                    minimatch(filePath, pattern, { dot: true, matchBase: true })
                );

                if (!isIncluded) continue;
            }

            const fullPath = join(sourceDir, filePath);
            archive.file(fullPath, { name: filePath });
        }

        archive.finalize();
    });
}

export function getDeletableFiles(rootFiles: string[], exclude: string[]) {
    const toDelete = rootFiles.filter(item => {
        const shouldIgnore = exclude.some(
            pattern =>
                minimatch(item, pattern, { dot: true, matchBase: true }) ||
                minimatch(item + "/**", pattern, { dot: true }),
        );

        return !shouldIgnore;
    });

    return toDelete;
}
