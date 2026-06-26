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
            : "http://localhost:8080"
    ),

    auth: "/auth",
    registration: "/auth/registration",
    registrationSendVerificationCode: "/auth/registration/send-verification-code",
    passwordSendResetCode: "/auth/password/send-reset-code",
    passwordReset: "/auth/password/reset",
    passwordChange: "/auth/password/change",
    usersEmailSendVerificationCode: "/users/email/send-verification-code",
    usersEmailChange: "/users/email/change",
    usersMe: "/users/me",


    api: "/api",
    roomInviteCount: "/invites/rooms/count",
    invites: "/invites/rooms",
    acceptInvite: "/invites/rooms/accept",
    declineInvite: "/invites/rooms/decline",
    roles: "/roles",

    rooms: "/rooms",
    roomClasses: "/classes",
    roomRaces: "/races",
    roomRacesRoot: "/races/root",
    roomRacesGrouped: "/races/grouped",
    roomClassesRoot: "/classes/root",
    roomClassesGrouped: "/classes/grouped",
    roomAbilities: "/abilities",
    roomSkills: "/skills",
    roomSkillsByCode: "/skills/byCode",
    roomSkillsByClassCode: "/skills/byClass",

    /** D&D 2024: GET .../rooms/:roomId/backgrounds (list), GET .../rooms/:roomId/backgrounds/:code (one) */
    backgrounds: "/backgrounds",

    characters: "/characters",
    charactersHeader: "/header",
    charactersSubheader: "/subheader",
    characterAbilities: "/abilities",
    bio: "/bio",
    inventory: "/inventory",
    equip: "/equip",

    health: "/health",
    max: "/max",
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

    // NPC API (room-scoped, under /api/rooms/:roomId)
    npcs: "/npcs",

    // Companions API (room + character scoped)
    companions: "/companions",
    npcRelations: "/relations",
    npcRelationType: "/relationType",

    // Magic API (under /api, not room-scoped)
    spells: "/spells",
    spellsDnd2024: "/spells/dnd2024",
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
            : "http://localhost:8079"
    ),
    api: "/files",

    other_bucket: "/other",
    room_images_bucket: "/room-images",
    avatar_images_bucket: "/avatar-images",
    items_images_bucket: "/item-images",
    skills_images_bucket: "/skills-images",
    races_images_bucket: "/races-images",
    classes_images_bucket: "/classes-images",
    backgrounds_images_bucket: "/backgrounds-images",
    spell_images_bucket: "/spell-images",
    npc_images_bucket: "/npc-images",
    upload: "/upload",
    download: "/download"
}
