import { PowerAction } from "@voctal/pelican";
import chalk from "chalk";
import ora from "ora";
import { Context } from "../context";

/**
 * The `restart` command.
 */
export async function restart(ctx: Context) {
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
        spinner.fail("The server is suspended and cannot be restarted.");
        return;
    }

    spinner.color = "yellow";
    spinner.text = "Restarting server...\n";

    try {
        await client.servers.sendPowerAction(project.data.serverId, { signal: PowerAction.Restart });
    } catch (err) {
        spinner.fail("Failed to restart server\n");
        ctx.handleException(err);
        return;
    }

    spinner.succeed("Server restarted");

    console.log(chalk.gray(`  Use ${chalk.bold.gray("orion status")} to verify`));
}
