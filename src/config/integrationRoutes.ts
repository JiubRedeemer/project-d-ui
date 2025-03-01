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

    health: "/health",
    updateCurrent: "/updateCurrent",
    armoryClass: "/armoryClass",
    speed: "/speed",
    initiative: "/initiative",
    skills: "/skills",

    bonus: "/bonus",
    mastery: "/mastery"
};

export const FILE_STORAGE_INTEGRATION_ROUTES = {
    baseURL: "http://localhost:8079",
    // baseURL: "http://192.168.0.73:8079",
    api: "/files",

    other_bucket: "/other",
    room_images_bucket: "/roomImages",
    upload: "/upload",
    download: "/download"
}
