import { PelicanWebSocket } from "@voctal/pelican";
import { render } from "ink";
import ora from "ora";
import { Context } from "../../context";
import { ServerConsole } from "./console";

/**
 * The `console` command.
 */
export async function console(ctx: Context) {
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

    render(<ServerConsole ctx={ctx} ws={ws} server={server} />);
}
