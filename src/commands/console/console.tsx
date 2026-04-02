import { ClientServer, PelicanWebSocket } from "@voctal/pelican";
import { Box } from "ink";
import { Context } from "../../context";
import { ServerLogs } from "./logs";
import { ServerStats } from "./stats";

export interface ServerConsoleProps {
    ctx: Context;
    server: ClientServer;
    ws: PelicanWebSocket;
}

export function ServerConsole({ ctx, ws, server }: ServerConsoleProps) {
    return (
        <Box flexDirection="row" flexGrow={1} gap={2}>
            <ServerLogs {...{ ctx, ws, server }} />
            <ServerStats {...{ ctx, ws, server }} />
        </Box>
    );
}
