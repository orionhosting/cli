import path from "node:path";
import envPaths from "env-paths";

const paths = envPaths("orionhosting-cli", { suffix: "" });

// Global paths

export const GLOBAL_CONFIG_DIR = paths.config;
export const GLOBAL_AUTH_FILE = path.join(paths.config, "auth.json");
export const GLOBAL_CONFIG_FILE = path.join(paths.config, "config.json");

// Project paths (generated config)

export const PROJECT_DIR_NAME = ".orion";
export const PROJECT_DIR = path.join(process.cwd(), PROJECT_DIR_NAME);
export const PROJECT_CONFIG_FILE = path.join(PROJECT_DIR, "project.json");

// Project paths (user config)

export const PROJECT_USER_CONFIG_FILE_NAME = "orion.config.json";
export const PROJECT_USER_CONFIG_FILE = path.join(process.cwd(), PROJECT_USER_CONFIG_FILE_NAME);
