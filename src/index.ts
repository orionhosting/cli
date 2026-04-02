#!/usr/bin/env node

import { Command } from "commander";
import { account } from "./commands/account";
import { console as consoleCommand } from "./commands/console";
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
import { Context } from "./context";
import { initUpdateNotifier } from "./utils/updater";

const program = new Command();
const ctx = new Context(program);

program.name("orion").description("Deploy your projects from your terminal").version(ctx.pkg.version, "-v, --version");

program.option("--token <TOKEN>", "The token to use").option("--server <SERVER_ID>", "The server ID");

program.command("status").description("show the state of the server").action(ctx.buildCommand(status));

program.command("account").description("view the logged in account details").action(ctx.buildCommand(account));

program.command("open").description("open your server's panel").action(ctx.buildCommand(open));

program.command("start").description("start the Orion server").action(ctx.buildCommand(start));

program.command("stop").description("stop the Orion server").action(ctx.buildCommand(stop));

program.command("restart").description("start or restart the Orion server").action(ctx.buildCommand(restart));

program.command("list").description("List your Orion servers").action(ctx.buildCommand(list));

program.command("login").description("Login to your Orion account").action(ctx.buildCommand(login));

program.command("logout").description("Logout from your account").action(ctx.buildCommand(logout));

program.command("docs").description("Open the Orion documentation in your browser").action(ctx.buildCommand(docs));

program.command("link").description("Link this directory to a server").action(ctx.buildCommand(link));

program
    .command("console")
    .description("View the server console in real-time")
    .option("--no-stats", "do not display stats")
    .action(ctx.buildCommand(consoleCommand));

initUpdateNotifier();

/*
program
    .command("deploy")
    .description("Deploy the current directory to your server")
    .action(options => deploy(ctx));
*/

program.parse();
