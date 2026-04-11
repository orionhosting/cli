import chalk from "chalk";
import { Context } from "../../context";

/**
 * The `telemetry disable` command.
 */
export async function telemetryDisable(ctx: Context) {
    if (!ctx.globalConfig.telemetry.enabled) {
        console.log(`Telemetry is already disabled.`);
        return;
    }

    ctx.globalConfig.telemetry.enabled = false;
    await ctx.saveGlobalConfig();

    console.log(`Telemetry is now ${chalk.redBright("disabled")}.`);
}
