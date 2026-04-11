import chalk from "chalk";
import ora from "ora";
import { Context } from "../context";

/**
 * The `restart` command.
 */
export async function restart(ctx: Context) {
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
        spinner.fail("The server is suspended and cannot be restarted.");
        return;
    }

    spinner.color = "yellow";
    spinner.text = "Restarting server...\n";

    try {
        await client.servers.sendPowerAction(project.serverId, { signal: "restart" });
    } catch (err) {
        spinner.fail("Failed to restart server\n");
        ctx.handleException(err);
        return;
    }

    spinner.succeed("Server restarted");

    console.log(chalk.gray(`  Use ${chalk.bold.gray("orion console")} to verify`));
}
