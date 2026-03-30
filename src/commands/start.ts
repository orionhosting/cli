import { PowerAction } from "@voctal/pelican";
import chalk from "chalk";
import ora from "ora";
import { Context } from "../context";

/**
 * The `start` command.
 */
export async function start(ctx: Context) {
    await ctx.auth();
    const project = await ctx.project();
    const client = ctx.getPelicanClient();

    ctx.printBanner();

    const spinner = ora("Fetching server...\n").start();

    let stats;
    try {
        stats = await client.servers.getResourceUsage(project.data.serverId);
    } catch (err) {
        spinner.stop();
        ctx.handleException(err);
        return;
    }

    if (stats.attributes.is_suspended) {
        spinner.fail("The server is suspended and cannot be started.");
        return;
    }

    if (stats.attributes.current_state !== "offline") {
        spinner.fail("The server is already running.");
        return;
    }

    spinner.color = "yellow";
    spinner.text = "Starting server...\n";

    try {
        await client.servers.sendPowerAction(project.data.serverId, { signal: PowerAction.Start });
    } catch (err) {
        spinner.fail("Failed to start server\n");
        ctx.handleException(err);
        return;
    }

    spinner.succeed("Server started");

    console.log(chalk.gray(`  Use ${chalk.bold.gray("orion status")} to verify`));
}
