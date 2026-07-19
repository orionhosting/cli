import { ClientServer } from "@voctal/pelican";

/**
 * Format a server's uptime.
 *
 * @param value - Milliseconds
 */
export const formatUptime = (value: number) => {
    const intl = new Intl.DurationFormat("en", { style: "narrow" });
    const uptime: string = intl.format({
        seconds: Math.floor((value / 1000) % 60),
        minutes: Math.floor((value / (1000 * 60)) % 60),
        hours: Math.floor((value / (1000 * 60 * 60)) % 24),
        days: Math.floor(value / (1000 * 60 * 60 * 24)),
    });
    return uptime;
};

/**
 * Get the server network properties.
 */
export const getServerNetworkData = (server: ClientServer) => {
    const alloc = server.attributes.relationships?.allocations?.data[0];
    const ip_alias = alloc?.attributes.ip_alias;
    const port = alloc?.attributes.port;

    return { allocation: alloc, ip_alias, port };
};
