import chalk from "chalk";
import ora from "ora";
import { Context } from "../context";

/**
 * The `stop` command.
 */
export async function stop(ctx: Context) {
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
        await client.servers.sendPowerAction(project.serverId, { signal: "kill" });
    } catch (err) {
        spinner.fail("Failed to stop server\n");
        ctx.handleException(err);
        return;
    }

    spinner.succeed("Server stopped");

    console.log(chalk.gray(`  Use ${chalk.bold.gray("orion console")} to verify`));
}
