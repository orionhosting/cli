import chalk from "chalk";
import figureSet from "figures";
import { Context } from "../../context";

/**
 * The `telemetry status` command.
 */
export async function telemetryStatus(ctx: Context) {
    const state = ctx.globalConfig.telemetry.enabled ? chalk.blue("enabled") : chalk.redBright("disabled");

    console.log(`Telemetry is currently ${state}.`);
    console.log(chalk.gray(`${figureSet.info} Learn more about telemetry data on the docs`));
}
