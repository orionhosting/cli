import { createWriteStream } from "node:fs";
import archiver from "archiver";

const DEFAULT_IGNORE = ["node_modules", ".git"];

/**
 * Zip a directory.
 */
export function zipDirectory(sourceDir: string, outputPath: string, ignore: string[]): Promise<void> {
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

        archive.glob("**/*", {
            cwd: sourceDir,
            ignore: allIgnore.map(p =>
                // support both folder names and globs
                p.includes("/") || p.includes("*") ? p : `${p}/**`,
            ),
            dot: true,
        });

        archive.finalize();
    });
}

// Paths patterns utils

import { minimatch } from "minimatch";

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
