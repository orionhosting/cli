import chalk from "chalk";
import ora from "ora";
import { Context } from "../context";

/**
 * The `start` command.
 */
export async function start(ctx: Context) {
    await ctx.requireAuth();
    const project = await ctx.requireProject();
    const client = ctx.getPelicanClient();

    const spinner = ora("Fetching server...\n").start();

    let stats;
    try {
        stats = await client.servers.getResourceUsage(project.serverId);
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
        await client.servers.sendPowerAction(project.serverId, { signal: "start" });
    } catch (err) {
        spinner.fail("Failed to start server\n");
        ctx.handleException(err);
        return;
    }

    spinner.succeed("Server started");

    console.log(chalk.gray(`  Use ${chalk.bold.gray("orion console")} to verify`));
}
