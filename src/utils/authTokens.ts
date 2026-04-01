import VueCookies from "vue-cookies";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const COOKIE_TTL = "7d";
const COOKIE_PATH = "/";

function isSecureProtocol(): boolean {
    return window.location.protocol === "https:";
}

export function getAccessToken(): string | null {
    return (
        localStorage.getItem(ACCESS_TOKEN_KEY) ??
        sessionStorage.getItem(ACCESS_TOKEN_KEY) ??
        (VueCookies.get(ACCESS_TOKEN_KEY) as string | null) ??
        null
    );
}

export function getRefreshToken(): string | null {
    return (
        localStorage.getItem(REFRESH_TOKEN_KEY) ??
        sessionStorage.getItem(REFRESH_TOKEN_KEY) ??
        (VueCookies.get(REFRESH_TOKEN_KEY) as string | null) ??
        null
    );
}

export function persistAuthTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    VueCookies.set(ACCESS_TOKEN_KEY, accessToken, COOKIE_TTL, COOKIE_PATH, undefined, isSecureProtocol(), "Lax");
    VueCookies.set(REFRESH_TOKEN_KEY, refreshToken, COOKIE_TTL, COOKIE_PATH, undefined, isSecureProtocol(), "Lax");
}

export function syncAuthTokensFromCookies(): void {
    const accessTokenFromCookie = VueCookies.get(ACCESS_TOKEN_KEY) as string | null;
    const refreshTokenFromCookie = VueCookies.get(REFRESH_TOKEN_KEY) as string | null;

    if (accessTokenFromCookie && !localStorage.getItem(ACCESS_TOKEN_KEY) && !sessionStorage.getItem(ACCESS_TOKEN_KEY)) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessTokenFromCookie);
        sessionStorage.setItem(ACCESS_TOKEN_KEY, accessTokenFromCookie);
    }

    if (
        refreshTokenFromCookie &&
        !localStorage.getItem(REFRESH_TOKEN_KEY) &&
        !sessionStorage.getItem(REFRESH_TOKEN_KEY)
    ) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshTokenFromCookie);
        sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshTokenFromCookie);
    }
}

export function clearAuthTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);

    VueCookies.remove(ACCESS_TOKEN_KEY, COOKIE_PATH);
    VueCookies.remove(REFRESH_TOKEN_KEY, COOKIE_PATH);
}
