import { platform } from "os";
import chalk from "chalk";
import figureSet from "figures";
import openURL from "open";
import ora from "ora";
import { Context } from "../context";
import { PANEL_URL } from "../utils/constants";

/**
 * The `open` command.
 */
export async function open(ctx: Context) {
    await ctx.auth();
    const project = await ctx.project();
    const client = ctx.getPelicanClient();

    ctx.printBanner();

    const spinner = ora("Fetching server...\n").start();

    let server;
    try {
        server = await client.servers.get(project.data.serverId);
    } catch (err) {
        spinner.stop();
        ctx.handleException(err);
        return;
    }

    spinner.color = "green";
    spinner.text = "Opening panel...";

    const url = `${PANEL_URL}/server/${server.attributes.identifier}`;
    await openURL(url, { wait: platform() === "win32" });

    spinner.stop();

    console.log(chalk.bold.green(`${figureSet.tick} Panel opened in your browser.`));
    console.log(`Otherwise, go to ${chalk.gray(url)}`);
}
