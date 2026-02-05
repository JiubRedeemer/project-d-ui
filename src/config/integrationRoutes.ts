export const GATEWAY_INTEGRATION_ROUTES = {
    baseURL: "http://localhost:8080",
    // baseURL: "http://192.168.0.73:8080",

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
    baseURL: "http://localhost:8079",
    // baseURL: "http://192.168.0.73:8079",
    api: "/files",

    other_bucket: "/other",
    room_images_bucket: "/room-images",
    avatar_images_bucket: "/avatar-images",
    items_images_bucket: "/item-images",
    skills_images_bucket: "/skills-images",
    upload: "/upload",
    download: "/download"
}
