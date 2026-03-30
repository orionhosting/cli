import path from "node:path";
import envPaths from "env-paths";

const paths = envPaths("orionhosting-cli", { suffix: "" });

export const GLOBAL_CONFIG_DIR = paths.config;
export const GLOBAL_AUTH_FILE = path.join(paths.config, "auth.json");
export const GLOBAL_UPDATE_FILE = path.join(paths.config, "update-check.json");

export const PROJECT_FOLDER_NAME = ".orion";
export const PROJECT_USER_CONFIG_NAME = "orion.config.json";
export const getProjectFolderPath = () => path.join(process.cwd(), PROJECT_FOLDER_NAME);
export const getProjectUserConfigPath = () => path.join(process.cwd(), PROJECT_USER_CONFIG_NAME);
export const getProjectDataPath = () => path.join(getProjectFolderPath(), "project.json");
