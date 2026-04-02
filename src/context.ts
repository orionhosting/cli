import assert from "node:assert";
import { inspect } from "node:util";
import { PelicanClient, PelicanError } from "@voctal/pelican";
import chalk from "chalk";
import { Command } from "commander";
import figures from "figures";
import figureSet from "figures";
import pkg from "../package.json";
import { requireAuth } from "./utils/auth";
import { API_URL, PANEL_URL } from "./utils/constants";
import { requireProjectData } from "./utils/projects";

export type RunnableCommand = (ctx: Context, options?: any) => Promise<void>;

/**
 * Global context for the CLI.
 */
export class Context {
    /**
     * The CLI's package.json.
     */
    public readonly pkg = pkg;

    private token: string | null = null;
    private serverId: string | null = null;

    public constructor(public readonly cli: Command) {
        // Temp
        this.serverId ??= "";
    }

    public buildCommand(action: RunnableCommand): () => Promise<void> {
        return async () => {
            const options = this.cli.opts();

            if (options.token) this.token = options.token;
            if (options.server) this.serverId = options.serverId;

            try {
                await action(this);
            } catch (err) {
                this.handleException(err);
            }
        };
    }

    public printBanner() {
        console.log(chalk.magenta(`\n${figureSet.triangleDown} ${"Orion CLI"} ${this.pkg.version}\n`));
    }

    public async auth() {
        const auth = await requireAuth();
        this.token = auth.token;
        return auth;
    }

    public async project() {
        const data = await requireProjectData();

        return {
            data,
        };
    }

    public setToken(token: string) {
        this.token = token;
    }

    public getPelicanClient() {
        if (!this.token) throw new Error("bro");

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

    public handleException(error: unknown) {
        if (error instanceof PelicanError) {
            if (error.status === 401) {
                console.error(chalk.bold.red(`${figures.cross} You are not authenticated`));
                console.error(chalk.gray("Use `orion login` or the global option `--token <TOKEN>`"));
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
}
