import { ClientServer, PelicanWebSocket } from "@voctal/pelican";
import { Box } from "ink";
import { CommandOptions, Context } from "../../context";
import { ServerLogs } from "./logs";
import { ServerStats } from "./stats";

export interface ServerConsoleProps {
    ctx: Context;
    server: ClientServer;
    ws: PelicanWebSocket;
}

export function ServerConsole({
    ctx,
    ws,
    server,
    options,
}: ServerConsoleProps & { options: CommandOptions<{ stats: boolean }> }) {
    return (
        <Box flexDirection="row" flexGrow={1} gap={2}>
            <ServerLogs {...{ ctx, ws, server }} />
            {options.stats ? <ServerStats {...{ ctx, ws, server }} /> : ""}
        </Box>
    );
}
