import updateNotifier from "update-notifier";
import pkg from "../../package.json";

/**
 * Initialize `update-notifier`.
 */
export function initUpdateNotifier() {
    const notifier = updateNotifier({ pkg, updateCheckInterval: 10 * 60 * 1000 });
    notifier.notify({ isGlobal: true, defer: false });
}
