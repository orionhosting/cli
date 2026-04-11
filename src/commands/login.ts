import password from "@inquirer/password";
import { PelicanError } from "@voctal/pelican";
import chalk from "chalk";
import figureSet from "figures";
import ora from "ora";
import { Context } from "../context";
import { DOCS_URL } from "../utils/constants";
import { isExitPromptError } from "../utils/inputs";

/**
 * The `login` command.
 */
export async function login(ctx: Context) {
    let newToken;
    try {
        newToken = await password(
            {
                message: "Your API Token",
                mask: "*",
                validate: v => {
                    const commonMessage = `\n> How to find your token: ${DOCS_URL}/guides/cli\n`;

                    if (!v.startsWith("pacc_")) return "The token should start with pacc_" + commonMessage;
                    if (v.length <= 18) return "This is not a full token" + commonMessage;

                    return true;
                },
            },
            { clearPromptOnDone: true },
        );
    } catch (err) {
        if (isExitPromptError(err)) {
            console.log(`${chalk.blue(figureSet.tick)} Login canceled`);
            return;
        }
        throw err;
    }

    ctx.setToken(newToken);
    const client = ctx.getPelicanClient();

    const spinner = ora("Validating token...\n").start();

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

    await ctx.saveAuth();

    spinner.stop();

    console.log(chalk.green(`${figureSet.tick} Token saved`));
}
