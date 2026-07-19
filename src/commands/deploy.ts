import { File } from "node:buffer";
import { statSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import confirm from "@inquirer/confirm";
import { PelicanClient, PowerAction } from "@voctal/pelican";
import boxen from "boxen";
import chalk from "chalk";
import figureSet from "figures";
import ora from "ora";
import { AlertFlags } from "../configs/global";
import { Context, Project } from "../context";
import { isExitPromptError } from "../utils/inputs";
import { makeDirectory, TEMP_ARCHIVES_DIR } from "../utils/paths";
import { getDeletableFiles, zipDirectory } from "../utils/zip";

const REMOTE_ARCHIVE_NAME = "orion-deployment.zip";

function formatDuration(ms: number) {
    return `${(ms / 1000).toFixed(1)}s`;
}

function formatBytes(bytes: number) {
    return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

function startElapsedTimer(spinner: ReturnType<typeof ora>, startedAt: number, baseText: string) {
    const timer = setInterval(() => {
        spinner.text = `${baseText} ${chalk.gray(`(${formatDuration(Date.now() - startedAt)})`)}`;
    }, 100);

    return () => clearInterval(timer);
}

interface DeploymentConfig {
    client: PelicanClient;
    project: Project;
    deploymentId: string;
    projectDir: string;
    remoteDir: string;
    archivePath: string;
}

export async function deploy(ctx: Context) {
    await ctx.requireAuth();
    const project = await ctx.requireProject();

    await firstDeploymentAlert(ctx);

    // Pipeline

    if (project.userConfig.deploy?.pipeline) {
        console.log(chalk.redBright(`${figureSet.cross} deploy.pipeline option is not yet supported`));
        process.exit(1);
    }

    // Path validation

    const basePath = project.userConfig.deploy?.path || "/";
    if (!basePath.startsWith("/")) {
        console.log(chalk.redBright(`${figureSet.cross} deploy.path must start with '/'`));
        process.exit(1);
    }

    // Deployment

    const deploymentId = Date.now().toString(16);

    const deploymentConfig: DeploymentConfig = {
        client: ctx.getPelicanClient(),
        project,
        deploymentId,
        projectDir: path.join(process.cwd(), basePath),
        remoteDir: basePath,
        archivePath: path.join(TEMP_ARCHIVES_DIR, `deployment-${project.serverId}-${deploymentId}-0.zip`),
    };

    console.log(
        chalk.blue(
            `${figureSet.info} Running deployment ${chalk.bold(deploymentId)} for ${chalk.bold(project.serverId)}\n`,
        ),
    );

    try {
        await compressFiles(ctx, deploymentConfig);
        await uploadFiles(ctx, deploymentConfig);

        await runPowerAction(ctx, deploymentConfig, {
            signal: "kill",
            loadingText: "Stopping server...",
            successText: "Server stopped",
            failText: "Stop failed",
        });

        if (project.userConfig.deploy?.clean) {
            await cleanServerFiles(ctx, deploymentConfig);
        }

        await decompressFiles(ctx, deploymentConfig);
        await cleanLocalFiles(ctx, deploymentConfig);

        await runPowerAction(ctx, deploymentConfig, {
            signal: "restart",
            loadingText: "Restarting server...",
            successText: "Server restarted",
            failText: "Restart failed",
        });
    } catch (err) {
        try {
            await unlink(deploymentConfig.archivePath);
        } catch {}

        throw err;
    }

    console.log(chalk.bold.green(`\n${figureSet.tick} Project deployed!`));
    console.log(chalk.gray(`  ${figureSet.triangleRightSmall} ${chalk.blue("orion open")} to open the panel`));
    console.log(chalk.gray(`  ${figureSet.triangleRightSmall} ${chalk.blue("orion console")} to view the console\n`));
}

async function cleanServerFiles(_ctx: Context, config: DeploymentConfig) {
    const cleanSpinner = ora("Cleaning server files...").start();
    const startedAt = Date.now();
    const stopTimer = startElapsedTimer(cleanSpinner, startedAt, "Cleaning server files...");

    // special folder that should not be automatically deleted (i guess)
    const specialIgnore = ["node_modules", ".npm", ".npm-global", ".local", ".cache", REMOTE_ARCHIVE_NAME];

    try {
        const list = await config.client.files.list(
            config.project.serverId,
            config.remoteDir === "/" ? undefined : config.remoteDir,
        );

        const toDelete = getDeletableFiles(
            list.data.map(d => d.attributes.name),
            config.project.userConfig.deploy?.exclude || [],
        ).filter(item => !specialIgnore.includes(item));

        if (toDelete.length) {
            await config.client.files.delete(config.project.serverId, {
                files: toDelete,
                root: config.remoteDir,
            });
        }

        stopTimer();
        cleanSpinner.succeed(`Server files cleaned ${chalk.gray(`(${formatDuration(Date.now() - startedAt)})`)}`);
    } catch (err) {
        stopTimer();
        cleanSpinner.fail(`Server files clean failed ${chalk.gray(`(${formatDuration(Date.now() - startedAt)})`)}`);
        throw err;
    }
}

async function compressFiles(_ctx: Context, config: DeploymentConfig) {
    const compressSpinner = ora("Compressing project...").start();
    const startedAt = Date.now();
    const progressTextPrefix = "Compressing project...";

    try {
        await makeDirectory(config.archivePath);
        await zipDirectory(
            config.projectDir,
            config.archivePath,
            config.project.userConfig.deploy?.exclude ?? [],
            progress => {
                let progressInfo;
                if (progress.totalBytes > 0) {
                    progressInfo = `${formatBytes(progress.processedBytes)} / ${formatBytes(progress.totalBytes)} (${progress.percent.toFixed(1)}%)`;
                } else {
                    progressInfo = `${formatBytes(progress.processedBytes)}`;
                }

                compressSpinner.text = `${progressTextPrefix} ${chalk.greenBright(progressInfo)} (${formatDuration(Date.now() - startedAt)})`;
            },
        );

        const sizeMb = statSync(config.archivePath).size / 1024 / 1024;
        const sizeMbString = sizeMb.toFixed(2);

        if (sizeMb >= 100) {
            compressSpinner.fail(
                `Project too big (${sizeMbString} MB / 100 MB, ${formatDuration(Date.now() - startedAt)})`,
            );
            process.exit(1);
        }

        compressSpinner.succeed(`Project compressed (${sizeMbString} MB, ${formatDuration(Date.now() - startedAt)})`);
    } catch (err) {
        compressSpinner.fail(`Failed to compress project (${formatDuration(Date.now() - startedAt)})`);
        throw err;
    }
}

async function decompressFiles(_ctx: Context, config: DeploymentConfig) {
    const decompressSpinner = ora("Extracting archive...").start();
    const startedAt = Date.now();
    const stopTimer = startElapsedTimer(decompressSpinner, startedAt, "Extracting archive...");

    try {
        await config.client.files.decompress(config.project.serverId, {
            file: REMOTE_ARCHIVE_NAME,
            root: config.remoteDir,
        });

        stopTimer();
        decompressSpinner.succeed(`Archive extracted ${chalk.gray(`(${formatDuration(Date.now() - startedAt)})`)}`);
    } catch (err) {
        stopTimer();
        decompressSpinner.fail(`Extraction failed ${chalk.gray(`(${formatDuration(Date.now() - startedAt)})`)}`);
        throw err;
    }
}

async function uploadFiles(_ctx: Context, config: DeploymentConfig) {
    const uploadSpinner = ora("Uploading project...").start();
    const startedAt = Date.now();
    const stopTimer = startElapsedTimer(uploadSpinner, startedAt, "Uploading project...");

    try {
        // Upload URL

        const uploadURL = await config.client.files.getUploadURL(config.project.serverId, config.remoteDir);
        const signedURL = uploadURL.attributes.url;

        // Upload

        const buffer = await readFile(config.archivePath);
        const blob = new File([buffer], REMOTE_ARCHIVE_NAME, { type: "application/zip" });

        const form = new FormData();
        form.append("files", blob);

        await config.client.files.upload(signedURL, form);

        stopTimer();
        uploadSpinner.succeed(`Project uploaded ${chalk.gray(`(${formatDuration(Date.now() - startedAt)})`)}`);
    } catch (err) {
        stopTimer();
        uploadSpinner.fail(
            `Upload failed (maybe your server's storage is full?) ${chalk.gray(`(${formatDuration(Date.now() - startedAt)})`)}`,
        );
        throw err;
    }
}

async function cleanLocalFiles(_ctx: Context, config: DeploymentConfig) {
    const cleanSpinner = ora("Deleting temporary files...").start();
    const startedAt = Date.now();
    const stopTimer = startElapsedTimer(cleanSpinner, startedAt, "Deleting temporary files...");

    try {
        await unlink(config.archivePath);

        stopTimer();
        cleanSpinner.succeed(`Deleted temporary files ${chalk.gray(`(${formatDuration(Date.now() - startedAt)})`)}`);
    } catch (err) {
        stopTimer();
        cleanSpinner.fail(`Delete temporary files failed ${chalk.gray(`(${formatDuration(Date.now() - startedAt)})`)}`);
        throw err;
    }
}

async function runPowerAction(
    _ctx: Context,
    config: DeploymentConfig,
    options: {
        signal: PowerAction;
        loadingText: string;
        successText: string;
        failText: string;
    },
) {
    const spinner = ora(options.loadingText).start();
    const startedAt = Date.now();
    const stopTimer = startElapsedTimer(spinner, startedAt, options.loadingText);

    try {
        await config.client.servers.sendPowerAction(config.project.serverId, { signal: options.signal });
        stopTimer();
        spinner.succeed(`${options.successText} ${chalk.gray(`(${formatDuration(Date.now() - startedAt)})`)}`);
    } catch (err) {
        stopTimer();
        spinner.fail(`${options.failText} ${chalk.gray(`(${formatDuration(Date.now() - startedAt)})`)}`);
        throw err;
    }
}

async function firstDeploymentAlert(ctx: Context) {
    if (ctx.isCI) return;

    if ((ctx.globalConfig.alertFlags & AlertFlags.FirstDeployment) !== 0) {
        return;
    }

    let answer;
    try {
        console.log(
            boxen(
                "This is your first deployment. Please read this:" +
                    "\nWhen deploying, most files on the server will be deleted and/or replaced by the new ones." +
                    `\n${chalk.redBright("Deleted files CANNOT be recovered.")}` +
                    "\nWe recommend that you back up all your important files before each deployment." +
                    `\n\nAlso note that the ${chalk.gray("deploy.clean")} option could delete files` +
                    `\npresent in the ${chalk.gray("deploy.exclude")} option. Read the docs for more info.`,
                {
                    title: "Warning",
                    borderColor: "yellowBright",
                    textAlignment: "center",
                    titleAlignment: "center",
                    padding: 1,
                },
            ),
        );

        answer = await confirm({ message: "Continue?" });
    } catch (err) {
        if (isExitPromptError(err)) {
            console.log(`${chalk.blue(figureSet.tick)} Canceled`);
            process.exit(0);
        }
        throw err;
    }

    ctx.globalConfig.alertFlags |= AlertFlags.FirstDeployment;
    await ctx.saveGlobalConfig();

    if (!answer) {
        process.exit(0);
    }

    console.log("");
}
