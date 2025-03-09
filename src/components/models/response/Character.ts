export interface Character {
    id: string;
    roomId: string;
    userId: string;
    name: string;
    clazzCode: string;
    clazzInfo: ClassInfo;
    raceCode: string;
    raceInfo: RaceInfo;
    proficiencyBonus: number;
    armoryClass: number;
    bonusArmoryClass: number;
    speed: number;
    bonusSpeed: number;
    inspiration: number;
    initiative: number;
    bonusInitiative: number;
    abilities: Ability[];
    skills: Skill[];
    characterBio: CharacterBio;
    health: Health;
    level: Level;
}

export interface ClassInfo {
    code: string;
    name: string;
}

export interface RaceInfo {
    code: string;
    name: string;
}

export interface Ability {
    name: string;
    code: string;
    value: number;
    bonusValue: number;
    skills: Skill[]
}

export interface Skill {
    code: string;
    name: string;
    value: string;
    up: boolean;
}

export interface CharacterBio {
    characterId: string;
    avatar: any;
    age: number;
    height: number;
    weight: number;
    attachments: string;
    history: string;
    ideals: string;
    personality: string;
    relationships: string;
    weaknesses: string;
}

export interface Health {
    characterId: string;
    currentHp: number;
    maxHp: number;
    tempHp: number;
    bonusValue: number;
}

export interface Level {
    characterId: string;
    level: number;
    xp: number;
    nextLevelXp: number;
}
