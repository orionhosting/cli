import chalk, { ChalkInstance } from "chalk";
import ora from "ora";
import { Context } from "../context";
import { formatUptime, getServerNetworkData } from "../utils/servers";

const colors: Record<string, ChalkInstance> = {
    running: chalk.green,
    starting: chalk.yellow,
    stopping: chalk.yellow,
    offline: chalk.red,
    installing: chalk.blue,
};

/**
 * The `status` command.
 */
export async function status(ctx: Context) {
    await ctx.requireAuth();
    const project = await ctx.requireProject();
    const client = ctx.getPelicanClient();

    const spinner = ora("Fetching server details...\n").start();

    let server;
    try {
        server = await client.servers.get(project.serverId);
    } catch (err) {
        spinner.stop();
        ctx.handleException(err);
        return;
    }

    spinner.color = "yellow";
    spinner.text = "Fetching server resources...\n";

    let data;
    try {
        data = await client.servers.getResourceUsage(project.serverId);
    } catch (err) {
        spinner.stop();
        ctx.handleException(err);
        return;
    }

    spinner.stop();

    const { allocation, ip_alias, port } = getServerNetworkData(server);

    // Server

    console.log(`  Server  ${chalk.magenta(server.attributes.identifier)}`);
    console.log(chalk.gray(`    name    ${server.attributes.name}`));
    console.log(chalk.gray(`    node    ${server.attributes.node}`));

    if (allocation) {
        console.log(chalk.gray(`    addr    ${ip_alias || "unknown"}`));
        console.log(chalk.gray(`    port    ${port}`));
    }

    // URLs

    if (ip_alias) {
        console.log(`\n  Addresses`);
        console.log(`    ${chalk.gray(`http://${ip_alias}:${port}`)}`);
        console.log(`    ${chalk.gray(`https://${port}.${ip_alias}`)}`);
    }

    // Status

    const state = data.attributes.current_state;
    const color = colors[state] ?? chalk.gray;

    const bytesToMB = (value: number) => Math.floor(value / 1024 / 1024);
    const formatPercent = (value: number, total: number) => `${((value / total) * 100).toFixed(2)}%`;

    const memory = bytesToMB(data.attributes.resources.memory_bytes); // in MB
    const memoryLimit = server.attributes.limits.memory; // in MB

    const disk = bytesToMB(data.attributes.resources.disk_bytes); // in MB
    const diskLimit = server.attributes.limits.disk; // in MB

    console.log(`\n  Status  ${color(state)}`);
    console.log(
        chalk.gray(
            `    uptime  ${data.attributes.resources.uptime > 0 ? formatUptime(data.attributes.resources.uptime) : "offline"}`,
        ),
    );
    console.log(chalk.gray(`    cpu     ${data.attributes.resources.cpu_absolute}%`));
    console.log(chalk.gray(`    memory  ${memory} MB / ${memoryLimit} MB (${formatPercent(memory, memoryLimit)})`));
    console.log(chalk.gray(`    disk    ${disk} MB / ${diskLimit} MB (${formatPercent(disk, diskLimit)})`));

    console.log(
        chalk.gray(`\n${chalk.underline.magenta(`note:`)} the status might be inconsistent as it is cached for 20s`),
    );
}
