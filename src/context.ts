import assert from "node:assert";
import os, { platform } from "node:os";
import { inspect } from "node:util";
import { PelicanClient, PelicanError } from "@voctal/pelican";
import chalk from "chalk";
import { Command } from "commander";
import figures from "figures";
import figureSet from "figures";
import pkg from "../package.json";
import { auth, AuthConfig } from "./configs/auth";
import { globalConfig, GlobalConfig } from "./configs/global";
import { ProjectConfig, projectConfig, ProjectUserConfig, projectUserConfig } from "./configs/project";
import { API_URL, PANEL_URL } from "./utils/constants";

export type RunnableCommand = (ctx: Context, options: CommandOptions<any>) => Promise<void>;

export type CommandOptions<T extends {} = {}> = T;

export interface Project {
    serverId: string;
    config: ProjectConfig;
    userConfig: ProjectUserConfig;
}

/**
 * Global context for the CLI.
 */
export class Context {
    /**
     * The CLI.
     */
    public readonly cli: Command;

    /**
     * The CLI's package.json.
     */
    public readonly pkg = pkg;

    public readonly auth: AuthConfig;
    public readonly globalConfig: GlobalConfig;

    /**
     * The pelican token. Will be the one in the --token option
     * or the one in the auth file if the option was not provided.
     */
    private token: AuthConfig["token"] = null;

    /**
     * The pelican server id. Will be the one in the --server option
     * or the one in the project config file if the option was not provided.
     */
    private serverId: ProjectConfig["serverId"] = null;

    /**
     * If we are in a CI/CD environment.
     */
    public isCI = false;

    private constructor(cli: Command, auth: AuthConfig, globalConfig: GlobalConfig) {
        this.cli = cli;
        this.auth = auth;
        this.globalConfig = globalConfig;
        this.token = this.auth.token;

        if (typeof process.env.ORION_TOKEN === "string") {
            this.token = process.env.ORION_TOKEN;
        }
        if (typeof process.env.ORION_SERVER_ID === "string") {
            this.serverId = process.env.ORION_SERVER_ID;
        }
        if (process.env.CI === "true") {
            this.isCI = true;
        }
    }

    public static async from(cli: Command) {
        return new Context(cli, await auth.loadOrCreate(), await globalConfig.loadOrCreate());
    }

    public async run(action: RunnableCommand, commandOptions: unknown): Promise<void> {
        const commandName = this.cli.args[0];
        if (!commandName) throw new Error("no command provided");

        // Global options
        const options = this.cli.opts<Record<string, string | undefined>>();
        if (typeof options.token === "string") this.token = options.token;
        if (typeof options.server === "string") this.serverId = options.server;
        if (options.ci) this.isCI = true;

        // Telemetry
        if (this.globalConfig.telemetry.enabled) {
            // TODO: handle the error
            this.sendUsageTelemetry(commandName).catch(() => null);
        }

        this.printBanner();

        try {
            await action(this, commandOptions as CommandOptions);
        } catch (err) {
            this.handleException(err);
        }
    }

    private printBanner() {
        console.log(chalk.magenta(`\n${figureSet.triangleDown} Orion CLI ${this.pkg.version}\n`));
    }

    public async requireAuth() {
        if (!this.token) {
            this.printUnauthenticatedError();
            process.exit(1);
        }
    }

    public setToken(token: AuthConfig["token"]) {
        this.auth.token = token;
        this.token = token;
    }

    public async saveAuth() {
        await auth.save(this.auth);
    }

    public async saveGlobalConfig() {
        await globalConfig.save(this.globalConfig);
    }

    public async requireProject(): Promise<Project> {
        const config = await projectConfig.load();
        if (!config) {
            this.printNotLinkedError();
            process.exit(1);
        }

        const serverId = this.serverId || config.serverId;
        if (!serverId) {
            this.printNotLinkedError();
            process.exit(1);
        }

        const userConfig = await projectUserConfig.loadOrDefaults();

        return {
            serverId,
            config,
            userConfig,
        };
    }

    public getPelicanClient() {
        assert(this.token, "no token set");

        return new PelicanClient({
            url: PANEL_URL,
            token: this.token,
        });
    }

    public async fetchOrionAPI(path: string, init?: RequestInit) {
        assert(path.startsWith("/"), "path must start with /");

        const response = await fetch(`${API_URL}/api${path}`, {
            ...init,
            headers: {
                ...init?.headers,
                "User-Agent": `orion-cli/${pkg.version}`,
                Authorization: this.token || undefined,
            } as Record<string, string>,
        });

        if (response.status !== 200) {
            throw new Error(`Failed to fetch Orion API: ${response.statusText} (${response.status})`);
        }

        return response;
    }

    public async fetchOrionAPIJSON(path: string) {
        const response = await this.fetchOrionAPI(path);
        return response.json();
    }

    public async sendUsageTelemetry(command: string) {
        await this.fetchOrionAPI("/telemetry/cli", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ver: this.pkg.version,
                nodever: process.version.slice(1),
                os: os.platform(),
                ci: false,
                cmd: command,
                opts: [],
            }),
        });
    }

    public handleException(error: unknown) {
        if (error instanceof PelicanError) {
            if (error.status === 401) {
                this.printUnauthenticatedError();
            } else if (error.status === 404) {
                console.error(chalk.bold.red(`${figures.cross} The linked server does not exist`));
                console.error(chalk.gray("Use `orion link` to re-link the project"));
            } else {
                console.error(chalk.bold.red(`${figures.cross} There was an error fetching the panel`));
                console.error(chalk.gray(error.message));
            }
        } else {
            console.error(chalk.bold.red(`${figures.cross} An unknown error occured`));
            console.error(chalk.gray(inspect(error, { depth: 5 })));
        }
        console.error("");

        process.exit(1);
    }

    public printUnauthenticatedError() {
        console.error(chalk.bold.red(`${figures.cross} You are not authenticated`));
        console.error(chalk.gray(`Use ${chalk.magenta("orion login")} to set your token`));

        if (platform() !== "win32") {
            console.log("");
        }
    }

    public printNotLinkedError() {
        console.error(chalk.bold.red(`${figures.cross} No server linked`));
        console.error(chalk.gray(`Use ${chalk.magenta("orion link")} to link this directory to a server`));

        if (platform() !== "win32") {
            console.log("");
        }
    }
}
