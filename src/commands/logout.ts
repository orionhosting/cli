import chalk from "chalk";
import figureSet from "figures";
import { Context } from "../context";
import { loadOrCreateAuth, saveAuth } from "../utils/auth";

export async function logout(ctx: Context) {
    ctx.printBanner();

    const auth = await loadOrCreateAuth();

    if (!auth.token) {
        console.log(chalk.gray(`${figureSet.cross} You are not logged in.`));
        return;
    }

    auth.token = "";
    await saveAuth(auth);

    console.log(chalk.green(`${figureSet.tick} Logged out`));
}
