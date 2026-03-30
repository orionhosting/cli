import { PowerAction } from "@voctal/pelican";
import chalk from "chalk";
import ora from "ora";
import { Context } from "../context";

/**
 * The `stop` command.
 */
export async function stop(ctx: Context) {
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
        spinner.fail("The server is suspended and cannot be stopped.");
        return;
    }

    if (stats.attributes.current_state === "offline") {
        spinner.fail("The server is already offline.");
        return;
    }

    spinner.color = "yellow";
    spinner.text = "Stopping server...\n";

    try {
        await client.servers.sendPowerAction(project.data.serverId, { signal: PowerAction.Kill });
    } catch (err) {
        spinner.fail("Failed to stop server\n");
        ctx.handleException(err);
        return;
    }

    spinner.succeed("Server stopped");

    console.log(chalk.gray(`  Use ${chalk.bold.gray("orion status")} to verify`));
}
