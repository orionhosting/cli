import { PowerAction, WebSocketEvents } from "@voctal/pelican";
import chalk from "chalk";
import { Box, Text, useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import { ServerConsoleProps } from "./console";

const MAX_LOGS = 200;

export function ServerLogs({ server, ws }: ServerConsoleProps) {
    const { exit } = useApp();
    const [logs, setLogs] = useState<string[]>(["[orion/cli] Connecting..."]);
    const [status, setStatus] = useState<string>("offline");

    useEffect(() => {
        const connect = async () => {
            try {
                ws.on(WebSocketEvents.Status, status => setStatus(status));
                ws.on(WebSocketEvents.AuthSuccess, () => {
                    ws.sendMessage({ event: "send logs" });
                    addLog("[orion/cli] Connected to server console");
                });
                ws.on(WebSocketEvents.ConsoleOutput, log => addLog(log));
                ws.on(WebSocketEvents.DaemonMessage, log => addLog(log));
                ws.on("close", () => {
                    addLog("[orion/cli] Disconnected");
                    setStatus("offline");
                });
                ws.on("error", err => addLog(`[orion/cli] WebSocket error: ${err.message}`));

                await ws.connect();
            } catch (err) {
                addLog("Failed to connect: " + (err instanceof Error ? err.message : String(err)));
            }
        };

        connect();
        return () => ws.close();
    }, []);

    const addLog = (line: string) => {
        line = line.startsWith("[orion/cli] ") ? chalk.bold.magenta(line) : line;
        setLogs(prev => [...prev.slice(-MAX_LOGS), line]);
        setScrollOffset(o => (o > 0 ? o + 1 : 0));
    };

    const sendPower = (signal: PowerAction) => {
        ws.sendPowerState(signal);
        addLog(`[orion/cli] → Sent signal: ${signal}`);
    };

    const [scrollOffset, setScrollOffset] = useState(0);
    const visibleLines = process.stdout.rows - 6;

    // Keyboard shortcuts
    useInput((input, key) => {
        if (key.ctrl && input === "c") {
            ws.close();
            exit();
        }

        // Power Actions
        if (key.ctrl && input === "r") sendPower("restart");
        if (key.ctrl && input === "s") sendPower("stop");

        // Scroll Offset
        if (key.upArrow) setScrollOffset(o => Math.min(o + 1, Math.max(0, logs.length - visibleLines)));
        if (key.downArrow) setScrollOffset(o => Math.max(o - 1, 0));
        if (key.ctrl && input === "d") setScrollOffset(0);
    });

    const lines = visibleLines - (scrollOffset > 0 ? 1 : 0);
    const visibleLogs = logs.slice(-(lines + scrollOffset), scrollOffset === 0 ? undefined : -scrollOffset);

    const statusColor =
        ({ running: "green", offline: "red", connecting: "yellow" } as Record<string, string | undefined>)[status] ||
        "gray";

    return (
        <Box flexDirection="column" flexGrow={1} height={process.stdout.rows - 1}>
            <Box borderStyle="single" borderColor="magenta" justifyContent="space-between" paddingX={1}>
                <Box>
                    <Text bold color="magenta">
                        Orion Console{" "}
                    </Text>
                    <Text color="gray">{server.attributes.name} </Text>
                    <Text color={statusColor}>● {status}</Text>
                </Box>
                <Box>
                    <Text color="gray">↑↓ logs ^C exit ^R restart ^S stop</Text>
                </Box>
            </Box>

            <Box
                flexDirection="column"
                flexGrow={1}
                overflow="hidden"
                borderStyle="single"
                borderColor="gray"
                paddingX={1}
            >
                {scrollOffset > 0 && (
                    <Text color="yellow"> ↑ scrolled ({scrollOffset} lines from bottom) — ^D to jump to end</Text>
                )}

                {visibleLogs.map((line, i) => (
                    <Text key={i} wrap="truncate">
                        {line || " "}
                    </Text>
                ))}
            </Box>
        </Box>
    );
}
