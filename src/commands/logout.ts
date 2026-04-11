import chalk from "chalk";
import figureSet from "figures";
import { Context } from "../context";

/**
 * The `logout` command.
 */
export async function logout(ctx: Context) {
    if (!ctx.auth.token) {
        console.log(chalk.gray(`${figureSet.cross} You are not logged in.`));
        return;
    }

    ctx.setToken(null);
    await ctx.saveAuth();

    console.log(chalk.green(`${figureSet.tick} Logged out`));
}
