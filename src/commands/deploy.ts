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
        await runPowerAction(ctx, deploymentConfig, {
            signal: "kill",
            loadingText: "Stopping server...",
            successText: "Server stopped",
            failText: "Stop failed",
        });

        await compressFiles(ctx, deploymentConfig);

        if (project.userConfig.deploy?.clean) {
            await cleanServerFiles(ctx, deploymentConfig);
        }

        await uploadFiles(ctx, deploymentConfig);
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

    // special folder that should not be automatically deleted (i guess)
    const specialIgnore = ["node_modules", ".npm", ".npm-global", ".local", ".cache"];

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

        cleanSpinner.succeed("Server files cleaned");
    } catch (err) {
        cleanSpinner.fail("Server files clean failed");
        throw err;
    }
}

async function compressFiles(_ctx: Context, config: DeploymentConfig) {
    const compressSpinner = ora("Compressing project...").start();

    try {
        await makeDirectory(config.archivePath);
        await zipDirectory(config.projectDir, config.archivePath, config.project.userConfig.deploy?.exclude ?? []);

        const sizeMb = statSync(config.archivePath).size / 1024 / 1024;
        const sizeMbString = sizeMb.toFixed(2);

        if (sizeMb >= 100) {
            compressSpinner.fail(`Project too big (${sizeMbString} MB / 100 MB)`);
            process.exit(1);
        }

        compressSpinner.succeed(`Project compressed ${chalk.gray(`(${sizeMbString} MB)`)}`);
    } catch (err) {
        compressSpinner.fail("Failed to compress project");
        throw err;
    }
}

async function decompressFiles(_ctx: Context, config: DeploymentConfig) {
    const decompressSpinner = ora("Extracting archive...").start();

    try {
        await config.client.files.decompress(config.project.serverId, {
            file: REMOTE_ARCHIVE_NAME,
            root: config.remoteDir,
        });

        decompressSpinner.succeed("Archive extracted");
    } catch (err) {
        decompressSpinner.fail("Extraction failed");
        throw err;
    }
}

async function uploadFiles(_ctx: Context, config: DeploymentConfig) {
    const uploadSpinner = ora("Uploading project...").start();

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

        uploadSpinner.succeed("Project uploaded");
    } catch (err) {
        uploadSpinner.fail("Upload failed (maybe your server's storage is full?)");
        throw err;
    }
}

async function cleanLocalFiles(_ctx: Context, config: DeploymentConfig) {
    const cleanSpinner = ora("Deleting temporary files...").start();

    try {
        await unlink(config.archivePath);

        cleanSpinner.succeed("Deleted temporary files");
    } catch (err) {
        cleanSpinner.fail("Delete temporary files failed");
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

    try {
        await config.client.servers.sendPowerAction(config.project.serverId, { signal: options.signal });
        spinner.succeed(options.successText);
    } catch (err) {
        spinner.fail(options.failText);
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
