import { platform } from "node:os";
import { PelicanWebSocket } from "@voctal/pelican";
import { render } from "ink";
import ora from "ora";
import { CommandOptions, Context } from "../../context";
import { ServerConsole } from "./console";

/**
 * The `console` command.
 */
export async function consoleCommand(ctx: Context, options: CommandOptions<{ stats: boolean }>) {
    await ctx.requireAuth();
    const project = await ctx.requireProject();
    const client = ctx.getPelicanClient();

    const spinner = ora("Connecting to the console...\n").start();

    let server;
    try {
        server = await client.servers.get(project.serverId);
    } catch (err) {
        spinner.stop();
        ctx.handleException(err);
        return;
    }

    spinner.stop();

    const ws = new PelicanWebSocket(client, project.serverId);

    if (platform() !== "win32") {
        // Fix ink issue
        // On Linux, the inputs (useInput & ctrl+c) are not detected without these 2 lines
        process.stdin.setRawMode(true);
        process.stdin.resume();
    }

    render(<ServerConsole ctx={ctx} ws={ws} server={server} options={options} />);
}
