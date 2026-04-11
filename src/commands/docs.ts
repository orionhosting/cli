import { platform } from "os";
import chalk from "chalk";
import figureSet from "figures";
import openURL from "open";
import ora from "ora";
import { Context } from "../context";
import { DOCS_URL } from "../utils/constants";

/**
 * The `docs` command.
 */
export async function docs(_ctx: Context) {
    const spinner = ora("Opening documentation...\n").start();
    spinner.color = "green";

    // the `wait` is needed on windows otherwise it does nothing (why?)
    await openURL(DOCS_URL, { wait: platform() === "win32" });

    spinner.stop();

    console.log(chalk.bold.green(`${figureSet.tick} Documentation opened in your browser`));
}
