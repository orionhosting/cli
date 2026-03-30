import chalk, { ChalkInstance } from "chalk";
import ora from "ora";
import { Context } from "../context";

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
    await ctx.auth();
    const project = await ctx.project();
    const client = ctx.getPelicanClient();

    ctx.printBanner();

    const spinner = ora("Fetching server details...\n").start();

    let server;
    try {
        server = await client.servers.get(project.data.serverId);
    } catch (err) {
        spinner.stop();
        ctx.handleException(err);
        return;
    }

    spinner.color = "yellow";
    spinner.text = "Fetching server resources...\n";

    let data;
    try {
        data = await client.servers.getResourceUsage(project.data.serverId);
    } catch (err) {
        spinner.stop();
        ctx.handleException(err);
        return;
    }

    spinner.stop();

    const alloc = server.attributes.relationships?.allocations?.data[0];
    const ip_alias = alloc?.attributes.ip_alias;
    const port = alloc?.attributes.port;

    // URLs

    if (ip_alias) {
        console.log(`    ${chalk.gray(`http://${ip_alias}:${port}`)}`);
        console.log(`    ${chalk.gray(`https://${port}.${ip_alias}`)}`);
        console.log("");
    }

    // Server

    console.log(`  Server  ${chalk.magenta(server.attributes.identifier)}`);
    console.log(chalk.gray(`    name    ${server.attributes.name}`));
    console.log(chalk.gray(`    node    ${server.attributes.node}`));

    if (alloc) {
        console.log(chalk.gray(`    addr    ${ip_alias || "unknown"}`));
        console.log(chalk.gray(`    port    ${port}`));
    }

    // Status

    const state = data.attributes.current_state;
    const color = colors[state] ?? chalk.gray;

    // @ts-expect-error Intl.DurationFormat is missing from tslib, but is available as of Node v23
    const intl = new Intl.DurationFormat("en", { style: "narrow" });
    const uptime: string = intl.format({
        seconds: Math.floor((data.attributes.resources.uptime / 1000) % 60),
        minutes: Math.floor((data.attributes.resources.uptime / (1000 * 60)) % 60),
        hours: Math.floor((data.attributes.resources.uptime / (1000 * 60 * 60)) % 24),
        days: Math.floor(data.attributes.resources.uptime / (1000 * 60 * 60 * 24)),
    });

    const bytesToMB = (value: number) => Math.floor(value / 1024 / 1024);
    const formatPercent = (value: number, total: number) => `${((value / total) * 100).toFixed(2)}%`;

    const memory = bytesToMB(data.attributes.resources.memory_bytes); // in MB
    const memoryLimit = server.attributes.limits.memory; // in MB

    const disk = bytesToMB(data.attributes.resources.disk_bytes); // in MB
    const diskLimit = server.attributes.limits.disk; // in MB

    console.log(`\n  Status  ${color(state)}`);
    console.log(chalk.gray(`    uptime  ${uptime}`));
    console.log(chalk.gray(`    cpu     ${data.attributes.resources.cpu_absolute}%`));
    console.log(chalk.gray(`    memory  ${memory} MB / ${memoryLimit} MB (${formatPercent(memory, memoryLimit)})`));
    console.log(chalk.gray(`    disk    ${disk} MB / ${diskLimit} MB (${formatPercent(disk, diskLimit)})`));
}
