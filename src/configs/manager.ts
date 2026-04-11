import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ZodType } from "zod";

export interface ConfigManagerOptions<T> {
    path: string;
    version?: number;
    schema: ZodType<T>;
    defaults: (config: ConfigManager<T>) => T;
}

export type ExtractConfig<C> = C extends ConfigManager<infer T> ? T : never;

export class ConfigManager<T> {
    private readonly path: string;
    private readonly schema: ZodType<T>;
    private readonly version: number;
    private readonly defaults: (config: ConfigManager<T>) => T;

    public constructor(options: ConfigManagerOptions<T>) {
        this.path = options.path;
        this.schema = options.schema;
        this.version = options.version ?? 1;
        this.defaults = options.defaults;
    }

    /**
     * Get the current config version.
     */
    public getCurrentVersion() {
        return this.version;
    }

    public async load(): Promise<T | null> {
        try {
            const raw = JSON.parse(await readFile(this.path, "utf8"));
            const data = this.applyMigration(raw);
            const result = this.schema.safeParse(data);
            return result.success ? result.data : null;
        } catch {
            return null;
        }
    }

    public async loadOrDefaults(): Promise<T> {
        return (await this.load()) || this.defaults(this);
    }

    public async loadOrCreate(): Promise<T> {
        const existing = await this.load();
        if (existing) return existing;

        const data = this.defaults(this);

        this.save(data);
        return data;
    }

    public async save(data: T): Promise<void> {
        const validated = this.schema.parse(data);
        await mkdir(path.dirname(this.path), { recursive: true });
        await writeFile(this.path, JSON.stringify(validated, null, 2), "utf8");
    }

    public async delete() {
        try {
            await unlink(this.path);
        } catch {}
    }

    public exists(): boolean {
        return existsSync(this.path);
    }

    /**
     * TODO: later
     */
    private applyMigration(raw: unknown): unknown {
        return raw;
    }
}
