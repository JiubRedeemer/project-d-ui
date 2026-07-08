export interface SeoConfig {
    title: string;
    description?: string;
    /** Path (relative to site root) this route's content should canonicalize to, e.g. '/welcome'. */
    canonicalPath?: string;
    robots?: string;
}

const SITE_URL = "https://mythrill.ru";
const DEFAULT_TITLE = "Mythrill";
const DEFAULT_DESCRIPTION =
    "Mythrill — бесплатное приложение для настольных РПГ: цифровой лист персонажа, боевой трекер и справочник мастера.";

// Only routes listed here are eligible for indexing. Everything else (the in-app,
// auth-gated area: rooms, characters, master tools, guidebook deep links that
// depend on client-side state not present on a cold load, etc.) defaults to noindex.
const ROUTE_SEO: Record<string, SeoConfig> = {
    welcomePage: {
        title: "Mythrill — цифровой лист персонажа для D&D и настольных РПГ",
        description:
            "Mythrill — бесплатное приложение для настольных РПГ: цифровой лист персонажа, боевой трекер и справочник мастера. Работает офлайн, в браузере и на Android.",
        canonicalPath: "/welcome",
        robots: "index, follow",
    },
    registerPage: {
        title: "Регистрация — Mythrill",
        description: "Создайте бесплатный аккаунт Mythrill и начните вести кампанию или играть за столом уже сегодня.",
        // Same component/content as /welcome — canonicalize instead of indexing a duplicate.
        canonicalPath: "/welcome",
        robots: "index, follow",
    },
    forgotPasswordPage: {
        title: "Восстановление пароля — Mythrill",
        robots: "noindex, follow",
    },
    termsPage: {
        title: "Условия использования — Mythrill",
        description: "Условия использования сервиса Mythrill: предоставление сервиса «как есть», ответственность за пользовательский контент и ограничение ответственности.",
        robots: "index, follow",
    },
};

function setMeta(attr: "name" | "property", key: string, content: string) {
    let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute("content", content);
}

function setCanonical(href: string) {
    let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", "canonical");
        document.head.appendChild(el);
    }
    el.setAttribute("href", href);
}

export function applySeo(routeName: string | null | undefined, path: string) {
    const config = (routeName && ROUTE_SEO[routeName]) || null;
    const title = config?.title ?? DEFAULT_TITLE;
    const description = config?.description ?? DEFAULT_DESCRIPTION;
    const robots = config?.robots ?? "noindex, nofollow";
    const canonicalUrl = SITE_URL + (config?.canonicalPath ?? path);

    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", robots);
    setCanonical(canonicalUrl);

    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
}
