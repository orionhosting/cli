import chalk from "chalk";
import figureSet from "figures";
import ora from "ora";
import z from "zod";
import { Context } from "../context";

// https://api.orionhost.xyz/docs#/CLI/get_cli_user
const userSchema = z.object({
    id: z.string(),
    discord_id: z.string(),
    credits: z.int(),
    referral_code: z.string(),
    referral_usage: z.int(),
    referral_gains: z.int(),
});

/**
 * The `account` command.
 */
export async function account(ctx: Context) {
    await ctx.auth();
    const client = ctx.getPelicanClient();

    ctx.printBanner();

    const spinner = ora("Loading account...\n").start();

    let account;
    try {
        account = await client.account.get();
    } catch (err) {
        spinner.stop();
        ctx.handleException(err);
        return;
    }

    let user = null;
    try {
        const json = await ctx.fetchOrionAPIJSON("/cli/user");
        user = userSchema.parse(json);
    } catch {
        // TODO: handle
    }

    spinner.color = "yellow";
    spinner.text = "Loading servers...\n";

    let servers;
    try {
        servers = await client.servers.list();
    } catch (err) {
        spinner.stop();
        ctx.handleException(err);
        return;
    }

    spinner.stop();

    console.log(`  ${chalk.gray("Logged in as")} ${chalk.bold.magenta(account.attributes.username)}`);
    console.log(chalk.gray(`  ${figureSet.triangleRightSmall} email: ${account.attributes.email}`));
    console.log(chalk.gray(`  ${figureSet.triangleRightSmall} servers: ${servers.meta.pagination.total}`));

    if (user) {
        console.log(chalk.gray(`  ${figureSet.triangleRightSmall} credits: ${user.credits}`));
        console.log(chalk.gray(`  ${figureSet.triangleRightSmall} discord id: ${user.discord_id}`));
        console.log(chalk.gray(`  ${figureSet.triangleRightSmall} orion id: ${user.id}`));
    }
}
