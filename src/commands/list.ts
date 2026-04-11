import chalk from "chalk";
import figureSet from "figures";
import ora from "ora";
import { Context } from "../context";

/**
 * The `list` command.
 */
export async function list(ctx: Context) {
    await ctx.requireAuth();

    const client = ctx.getPelicanClient();
    const spinner = ora("Loading servers...\n").start();

    let servers;
    try {
        servers = await client.servers.list();
    } catch (err) {
        spinner.stop();
        ctx.handleException(err);
        return;
    }

    if (!servers.data.length) {
        spinner.info("You do not have any servers.");
        return;
    }

    spinner.stop();

    console.log(`${chalk.white("Your servers")}`);
    for (const server of servers.data) {
        console.log(
            chalk.gray(` [${chalk.blue(server.attributes.identifier)}]`) +
                chalk.gray(`  ${figureSet.triangleRightSmall}  ${chalk.gray(server.attributes.name)}`),
        );
    }
}
