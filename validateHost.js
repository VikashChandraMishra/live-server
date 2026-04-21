import net from "net";
import dns from "dns/promises";

/**
 * Validates whether a host can be used for server.listen(host)
 *
 * What this covers:
 * - Invalid IP formats (e.g. 256.x.x.x)
 * - Non-resolvable hostnames
 * - Special-purpose addresses (broadcast, multicast)
 * - Addresses not assigned to this machine (EADDRNOTAVAIL)
 * - IPv4 / IPv6 correctness
 *
 * NOTE:
 * - This still cannot guarantee success at runtime (race conditions, env issues)
 * - Final authority is always server.listen()
 */
export const validateHost = async (host) => {
    // 1. Basic presence check
    if (!host || typeof host !== "string") {
        return { ok: false, error: "Host must be a non-empty string" };
    }

    // 2. Normalize common safe aliases
    if (host === "localhost") {
        // localhost is always safe (resolves to 127.0.0.1 or ::1)
        return { ok: true };
    }

    // 3. Check if it's a valid IP (IPv4 or IPv6)
    const ipVersion = net.isIP(host);

    if (ipVersion === 0) {
        // Not an IP → try DNS resolution
        try {
            await dns.lookup(host);
        } catch {
            return { ok: false, error: "Host does not resolve (DNS lookup failed)" };
        }
    }

    // 4. Reject special-purpose IPv4 ranges
    if (ipVersion === 4) {
        const parts = host.split(".").map(Number);

        // Broadcast address
        if (host === "255.255.255.255") {
            return { ok: false, error: "Broadcast address cannot be used as host" };
        }

        // Multicast range: 224.0.0.0 → 239.255.255.255
        if (parts[0] >= 224 && parts[0] <= 239) {
            return { ok: false, error: "Multicast addresses cannot be used as host" };
        }
    }

    // 5. Try binding to detect if address exists on this machine
    // (catches EADDRNOTAVAIL)
    const canBind = await new Promise((resolve) => {
        const tester = net
            .createServer()
            .once("error", (err) => {
                if (err && err.code === "EADDRNOTAVAIL") {
                    resolve(false);
                } else {
                    resolve(true);
                }
            })
            .once("listening", () => {
                tester.close(() => resolve(true));
            })
            .listen(0, host);
    });

    if (!canBind) {
        return {
            ok: false,
            error: "Host is not available on this machine (EADDRNOTAVAIL)",
        };
    }

    // 6. Everything looks valid
    return { ok: true };
};
