/**
 * Check if the error is an ExitPromptError from inquirer.
 */
export const isExitPromptError = (err: unknown) => err instanceof Error && err.name === "ExitPromptError";
