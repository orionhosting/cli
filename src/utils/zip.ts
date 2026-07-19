import { createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { ZipArchive } from "archiver";
import { glob } from "glob";

const DEFAULT_IGNORE = ["node_modules", ".git"];

interface ZipProgress {
    processedBytes: number;
    totalBytes: number;
    percent: number;
}

/**
 * Zip a directory.
 */
export async function zipDirectory(
    sourceDir: string,
    outputPath: string,
    ignore: string[],
    onProgress?: (progress: ZipProgress) => void,
): Promise<void> {
    const allIgnore = [...DEFAULT_IGNORE, ...ignore];

    const entries = await glob("**/*", {
        cwd: sourceDir,
        dot: true,
        stat: true,
        withFileTypes: true,
        ignore: allIgnore.flatMap(p => {
            if (p.includes("/") || p.includes("**")) return [p];
            if (p.startsWith("*.")) return [`**/${p}`];
            return [`**/${p}`, `**/${p}/**`, `${p}`, `${p}/**`];
        }),
    });

    const files = await Promise.all(
        entries.map(async entry => {
            const fullPath = entry.fullpath();
            const stats = await stat(fullPath);

            return {
                fullPath,
                relativePath: entry.relative(),
                stats,
            };
        }),
    );

    return new Promise((resolve, reject) => {
        try {
            const totalBytes = files.reduce((sum, file) => sum + file.stats.size, 0);

            const output = createWriteStream(outputPath);
            const archive = new ZipArchive({
                zlib: { level: 9 },
            });

            output.on("close", () => {
                output.destroy();
                resolve();
            });

            output.on("error", reject);
            archive.on("error", reject);

            archive.on("progress", p => {
                onProgress?.({
                    processedBytes: p.fs.processedBytes,
                    totalBytes,
                    percent: totalBytes === 0 ? 100 : (p.fs.processedBytes / totalBytes) * 100,
                });
            });

            archive.pipe(output);

            for (const file of files) {
                archive.file(file.fullPath, {
                    name: file.relativePath,
                    stats: file.stats,
                });
            }

            archive.finalize();
        } catch (err) {
            reject(err);
        }
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
