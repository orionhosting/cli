import password from "@inquirer/password";
import { PelicanError } from "@voctal/pelican";
import chalk from "chalk";
import figureSet from "figures";
import ora from "ora";
import { Context } from "../context";
import { loadOrCreateAuth, saveAuth } from "../utils/auth";

export async function login(ctx: Context) {
    ctx.printBanner();

    console.log(chalk.bold.gray("  Log in your account"));

    const token = await password({
        message: "Your API Token",
        mask: "*",
        validate: v => {
            const commonMessage = `\n> How to find your token: https://docs.orionhost.xyz/guides/cli\n`;

            if (!v.startsWith("pacc_")) return "The token should start with pacc_" + commonMessage;
            if (v.length <= 18) return "This is not a full token" + commonMessage;

            return true;
        },
    });

    ctx.setToken(token);
    const client = ctx.getPelicanClient();

    const spinner = ora("Verifying token...\n").start();

    try {
        await client.account.get();
    } catch (err) {
        spinner.stop();

        if (err instanceof PelicanError && err.status === 401) {
            console.log(chalk.bold.red(`${figureSet.cross} This token is not valid`));
            return;
        }

        ctx.handleException(err);
        return;
    }

    spinner.color = "magenta";
    spinner.text = "Saving token to file system...";

    const auth = await loadOrCreateAuth();
    auth.token = token;
    await saveAuth(auth);

    spinner.stop();

    console.log(chalk.green(`${figureSet.tick} Token saved`));
}
