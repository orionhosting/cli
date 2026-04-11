import chalk from "chalk";
import { Context } from "../../context";

/**
 * The `telemetry enable` command.
 */
export async function telemetryEnable(ctx: Context) {
    if (ctx.globalConfig.telemetry.enabled) {
        console.log(`Telemetry is already enabled.`);
        return;
    }

    ctx.globalConfig.telemetry.enabled = true;
    await ctx.saveGlobalConfig();

    console.log(`Telemetry is now ${chalk.blue("enabled")}.`);
}
