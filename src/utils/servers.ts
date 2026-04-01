export const formatUptime = (value: number) => {
    // @ts-expect-error Intl.DurationFormat is missing from tslib, but is available as of Node v23
    const intl = new Intl.DurationFormat("en", { style: "narrow" });
    const uptime: string = intl.format({
        seconds: Math.floor((value / 1000) % 60),
        minutes: Math.floor((value / (1000 * 60)) % 60),
        hours: Math.floor((value / (1000 * 60 * 60)) % 24),
        days: Math.floor(value / (1000 * 60 * 60 * 24)),
    });
    return uptime;
};
