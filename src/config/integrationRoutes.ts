const env = import.meta.env as Record<string, string | undefined>;

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const getBaseUrl = (envKey: string, fallback: string) => {
    const raw = env[envKey];
    if (raw && raw.trim().length > 0) {
        return normalizeBaseUrl(raw.trim());
    }
    return normalizeBaseUrl(fallback);
};

export const GATEWAY_INTEGRATION_ROUTES = {
    baseURL: getBaseUrl(
        "VITE_GATEWAY_BASE_URL",
        typeof window !== "undefined" && window.location?.hostname
            ? `${window.location.protocol}//${window.location.hostname}:8080`
            : "http://192.168.31.211:8080"
    ),

    auth: "/auth",
    registration: "/auth/registration",


    api: "/api",
    roomInviteCount: "/invites/rooms/count",
    invites: "/invites/rooms",
    acceptInvite: "/invites/rooms/accept",
    declineInvite: "/invites/rooms/decline",

    rooms: "/rooms",
    roomClasses: "/classes",
    roomRaces: "/races",
    roomAbilities: "/abilities",
    roomSkills: "/skills",
    roomSkillsByCode: "/skills/byCode",
    roomSkillsByClassCode: "/skills/byClass",

    characters: "/characters",
    charactersHeader: "/header",
    charactersSubheader: "/subheader",
    characterAbilities: "/abilities",
    bio: "/bio",
    inventory: "/inventory",
    equip: "/equip",

    health: "/health",
    updateCurrent: "/updateCurrent",
    armoryClass: "/armoryClass",
    speed: "/speed",
    initiative: "/initiative",
    skills: "/skills",
    use: "/use",
    characterSkills: "/character-skills",
    rest: "/rest",

    bonus: "/bonus",
    mastery: "/mastery",
    count: "/count",
    money: "/money",
    items: "/items",
    search: "/search",

    notes: "/notes",

    // Magic API (under /api, not room-scoped)
    spells: "/spells",
    spellsImport: "/spells/import",
    spellBooks: "/spell-books",
    spellBooksByRoomCharacter: "/spell-books/by-room-character",
    spellBookItems: "/spell-book-items",
    spellCells: "/spell-cells"
};

export const SPELL_IMAGE_PLACEHOLDER =
    "https://img.icons8.com/fluency/96/sparkling.png";

export const FILE_STORAGE_INTEGRATION_ROUTES = {
    baseURL: getBaseUrl(
        "VITE_FILE_STORAGE_BASE_URL",
        typeof window !== "undefined" && window.location?.hostname
            ? `${window.location.protocol}//${window.location.hostname}:8079`
            : "http://192.168.31.211:8079"
    ),
    api: "/files",

    other_bucket: "/other",
    room_images_bucket: "/room-images",
    avatar_images_bucket: "/avatar-images",
    items_images_bucket: "/item-images",
    skills_images_bucket: "/skills-images",
    upload: "/upload",
    download: "/download"
}
