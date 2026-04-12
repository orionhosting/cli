#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import { account } from "./commands/account";
import { consoleCommand } from "./commands/console";
import { deploy } from "./commands/deploy";
import { docs } from "./commands/docs";
import { link } from "./commands/link";
import { list } from "./commands/list";
import { login } from "./commands/login";
import { logout } from "./commands/logout";
import { open } from "./commands/open";
import { restart } from "./commands/restart";
import { start } from "./commands/start";
import { status } from "./commands/status";
import { stop } from "./commands/stop";
import { telemetryDisable } from "./commands/telemetry/disable";
import { telemetryEnable } from "./commands/telemetry/enable";
import { telemetryStatus } from "./commands/telemetry/status";
import { Context } from "./context";
import { initUpdateNotifier } from "./utils/updater";

initUpdateNotifier();

const program = new Command();
const ctx = await Context.from(program);

program.name("orion").description("Deploy your projects from your terminal").version(ctx.pkg.version, "-v, --version");

program
    .option("--token <TOKEN>", "The token to use")
    .option("--server <SERVER_ID>", "The server ID")
    .option("--ci", "Disable all interactive questions for CI/CD");

program
    .command("status")
    .description("show the state of the server")
    .action(options => ctx.run(status, options));

program
    .command("account")
    .description("view the logged in account details")
    .action(options => ctx.run(account, options));

program
    .command("open")
    .description("open your server's panel")
    .action(options => ctx.run(open, options));

program
    .command("start")
    .description("start the Orion server")
    .action(options => ctx.run(start, options));

program
    .command("stop")
    .description("stop the Orion server")
    .action(options => ctx.run(stop, options));

program
    .command("restart")
    .description("start or restart the Orion server")
    .action(options => ctx.run(restart, options));

program
    .command("list")
    .description("list your Orion servers")
    .action(options => ctx.run(list, options));

program
    .command("login")
    .description("login to your Orion account")
    .action(options => ctx.run(login, options));

program
    .command("logout")
    .description("logout from your account")
    .action(options => ctx.run(logout, options));

program
    .command("docs")
    .description("open the Orion documentation in your browser")
    .action(options => ctx.run(docs, options));

program
    .command("link")
    .description("link this directory to a server")
    .action(options => ctx.run(link, options));

program
    .command("console")
    .description("view the server console in real-time")
    .option("--no-stats", "do not display stats")
    .action(options => ctx.run(consoleCommand, options));

const telemetryCommand = program.command("telemetry").description("manage the telemetry config");

telemetryCommand
    .command("status")
    .description("view telemetry status")
    .action(options => ctx.run(telemetryStatus, options));

telemetryCommand
    .command("enable")
    .description("enable telemetry")
    .action(options => ctx.run(telemetryEnable, options));

telemetryCommand
    .command("disable")
    .description("disable telemetry")
    .action(options => ctx.run(telemetryDisable, options));

program
    .command("deploy")
    .description("deploy the current directory to your server")
    .action(options => ctx.run(deploy, options));

program.parse();
