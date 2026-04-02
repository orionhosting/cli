import { WebSocketEvents, WebSocketStatsEventData } from "@voctal/pelican";
import { Box, Text } from "ink";
import { useEffect, useState } from "react";
import { formatUptime, getServerNetworkData } from "../../utils/servers";
import { ServerConsoleProps } from "./console";

export function ServerStats({ server, ws }: ServerConsoleProps) {
    const [stats, setStats] = useState<WebSocketStatsEventData | null>(null);

    useEffect(() => {
        const listener = (stats: WebSocketStatsEventData) => setStats(stats);

        ws.on(WebSocketEvents.Stats, listener);

        return () => void ws.off(WebSocketEvents.Stats, listener);
    }, []);

    return (
        <Box flexDirection="column" minWidth={26} borderStyle="single" borderColor="gray" paddingX={1} gap={1}>
            <Text bold color="cyan">
                Statistics
            </Text>

            <Box flexDirection="column" gap={0}>
                <Text color="gray">
                    Uptime <Text color="white">{stats && formatUptime(stats.uptime)}</Text>
                </Text>
            </Box>

            <Box flexDirection="column" gap={0}>
                <Text color="gray">
                    CPU <Text color="white">{stats?.cpu_absolute?.toFixed(3)}%</Text>
                </Text>
                <StatBar value={stats?.cpu_absolute} max={100} />
            </Box>

            <Box flexDirection="column" gap={0}>
                <Text color="gray">
                    RAM{" "}
                    <Text color="white">
                        {stats && (stats.memory_bytes / 1024 / 1024).toFixed(0)} /{" "}
                        {stats && (stats.memory_limit_bytes / 1024 / 1024).toFixed(0)} MB
                    </Text>
                </Text>
                <StatBar value={stats?.memory_bytes} max={stats?.memory_limit_bytes} />
            </Box>

            <Box flexDirection="column" gap={0}>
                <Text color="gray">
                    Disk{" "}
                    <Text color="white">
                        {stats && (stats.disk_bytes / 1024 / 1024).toFixed(0)} /{" "}
                        {stats && server.attributes.limits.disk.toFixed(0)} MB
                    </Text>
                </Text>
                <StatBar
                    value={stats ? stats.disk_bytes / 1024 / 1024 : undefined}
                    max={server.attributes.limits.disk}
                />
            </Box>

            <Box flexDirection="column" gap={0}>
                <Text color="gray">Network</Text>
                <Text color="gray">
                    {" "}
                    ↑ <Text color="green">{stats && (stats.network.tx_bytes / 1024).toFixed(2)} KB/s</Text>
                </Text>
                <Text color="gray">
                    {" "}
                    ↓ <Text color="cyan">{stats && (stats.network.rx_bytes / 1024).toFixed(2)} KB/s</Text>
                </Text>
                <Text color="gray"> port {getServerNetworkData(server).port || "unknown"}</Text>
            </Box>
        </Box>
    );
}

function StatBar({ value, max, width = 20 }: { value: number | undefined; max: number | undefined; width?: number }) {
    if (value === undefined || max === undefined) {
        return <Text>...</Text>;
    }
    const pct = Math.min(value / max, 1);
    const filled = Math.round(pct * width);
    const empty = width - filled;
    const color = pct > 0.9 ? "red" : pct > 0.7 ? "yellow" : "green";

    return (
        <Text>
            <Text color="gray">▕</Text>
            <Text color={color}>{"█".repeat(filled)}</Text>
            <Text color="gray">{"░".repeat(empty)}</Text>
            <Text color="gray">▏</Text>
        </Text>
    );
}
