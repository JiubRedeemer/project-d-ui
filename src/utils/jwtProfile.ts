export interface JwtProfile {
    email: string | null;
    username: string | null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const payloadPart = token.split(".")[1];
        if (!payloadPart) return null;
        const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
        const decoded = atob(padded);
        return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function firstString(payload: Record<string, unknown> | null, keys: string[]): string | null {
    if (!payload) return null;
    for (const key of keys) {
        const value = payload[key];
        if (typeof value === "string" && value.trim().length > 0) {
            return value.trim();
        }
    }
    return null;
}

export function readProfileFromAccessToken(token: string | null): JwtProfile {
    if (!token) {
        return { email: null, username: null };
    }
    const payload = decodeJwtPayload(token);
    return {
        email: firstString(payload, ["email", "userEmail", "mail", "sub"]),
        username: firstString(payload, ["username", "userName", "preferred_username", "name"]),
    };
}
