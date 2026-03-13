import {ChargesRefill} from "@/components/models/response/InventoryResponse";
import {RaceTraitDto} from "@/api/rulebookApi.types";

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
    traits: CharacterTraits[];
    itemStats: EquippedItemsStatsResponse | null;
    currentHpDiceCount: number;
    isOwner: boolean;
    ownerUsername: string;
}

export interface ClassInfo {
    code: string;
    name: string;
}

export interface RaceInfo {
    code: string;
    name: string;
    traits: RaceTraitDto[];
}

export interface Ability {
    name: string;
    code: string;
    value: number | undefined;
    bonusValue: number;
    masteryCheckValue: number;
    masterySavingThrowValue: number;
    skills: Skill[]
}

export interface Skill {
    code: string;
    name: string;
    value: string;
    up: boolean;
    bonusValue: number;
    masteryValue: number;
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

export interface EquippedItemsStatsResponse {
    armoryClassBonus: StatsDto[] | null;
    speedBonus: (StatsDto[] | null);
    hpBonus: StatsDto[] | null;
}

export interface StatsDto {
    name: ItemStatsEnum | null;
    options: string[] | null;
    value: any;
}

export interface CharacterSkill {
    id: string;
    characterId: string;
    name: string;
    currentCharges: number | undefined;
    castTime: string | undefined;
    distance: string | undefined;
    description: string;
    shortDescription: string;
    charges: number | undefined;
    chargesRefill: ChargesRefill;
    imgUrl: string;
}

export interface CharacterTraits {
    id: string;
    characterId: string;
    name: string;
    description: string;
}

export enum ItemStatsEnum {
    ARMORY_CLASS = "ARMORY_CLASS",
    SPEED = "SPEED",
    HP = "HP",
    SAVING_THROW = "SAVING_THROW",
    ADVANTAGE = "ADVANTAGE",
    INTERFERENCE = "INTERFERENCE",
    RESISTANCE = "RESISTANCE",
    VULNERABILITY = "VULNERABILITY",
    IMMUNITY = "IMMUNITY",
    ABILITY_SCORE = "ABILITY_SCORE",
    PROFICIENCY_SKILL = "PROFICIENCY_SKILL",
    ATTACK_BONUS = "ATTACK_BONUS",
    DAMAGE_BONUS = "DAMAGE_BONUS",
    ON_HIT_CONDITION = "ON_HIT_CONDITION",
    LIMITATION = "LIMITATION"
}