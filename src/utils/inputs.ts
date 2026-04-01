export const isExitPromptError = (err: unknown) => err instanceof Error && err.name === "ExitPromptError";
