import select from "@inquirer/select";
import chalk from "chalk";
import figureSet from "figures";
import ora from "ora";
import { projectConfig } from "../configs/project";
import { Context } from "../context";
import { isExitPromptError } from "../utils/inputs";
import { addProjectFolderToGitignore } from "../utils/projects";

export async function link(ctx: Context) {
    await ctx.requireAuth();
    const client = ctx.getPelicanClient();

    const spinner = ora("Fetching servers...\n").start();

    let servers;
    try {
        servers = await client.servers.list();
    } catch (err) {
        spinner.stop();
        ctx.handleException(err);
        return;
    }

    spinner.stop();

    if (!servers.data.length) {
        console.log(chalk.bold.red(`${figureSet.cross} You do not have any servers.`));
        return;
    }

    let serverId;
    try {
        serverId = await select(
            {
                loop: false,
                message: "Select the server you want to link to this directory",
                choices: servers.data.map(s => ({
                    name: `  ${chalk.bold.gray(s.attributes.name)}`,
                    value: s.attributes.identifier,
                    description: s.attributes.description || undefined,
                })),
            },
            { clearPromptOnDone: true },
        );
    } catch (err) {
        if (isExitPromptError(err)) {
            console.log(`${chalk.blue(figureSet.tick)} Canceled`);
            return;
        }
        throw err;
    }

    // Save new config
    const config = await projectConfig.loadOrDefaults();
    config.serverId = serverId;
    await projectConfig.save(config);

    const addedToGitignore = await addProjectFolderToGitignore();

    const server = servers.data.find(d => d.attributes.identifier === serverId);

    console.log(
        chalk.green(
            `\n${figureSet.tick} Linked directory to server ${chalk.bold(server?.attributes.name)} (${serverId})`,
        ),
    );

    console.log(chalk.gray(`  ${figureSet.triangleRightSmall} Server ID saved to .orion/project.json`));

    if (addedToGitignore) console.log(chalk.gray(`  ${figureSet.triangleRightSmall} Added .orion/ to .gitignore`));

    console.log(chalk.gray(`  ${figureSet.triangleRightSmall} Note: .orion folder is not meant to be manually edited`));
}
