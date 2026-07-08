/**
 * Magic API DTOs and types (OpenAPI Magic API v0.0.1-SNAPSHOT).
 */

/** Filter spells by class (listSpells query param) */
export type SpellClass =
    | "BARD"
    | "BARBARIAN"
    | "FIGHTER"
    | "WIZARD"
    | "DRUID"
    | "CLERIC"
    | "ARTIFICER"
    | "WARLOCK"
    | "MONK"
    | "PALADIN"
    | "ROGUE"
    | "RANGER"
    | "SORCERER";

/** Localized spell names (locale -> name) */
export type LocalizedNames = Record<string, string>;

export interface SpellDto {
    id?: string;
    /** Localized spell names (locale -> name) */
    name?: LocalizedNames;
    aliasName?: LocalizedNames;
    level?: string;
    spellClass?: string;
    school?: string;
    ritual?: boolean;
    customization?: boolean;
    damageType?: string;
    healType?: string;
    savingThrow?: string;
    useTime?: string;
    distance?: string;
    duration?: string;
    components?: string;
    materialComponents?: string;
    description?: string;
    createdAt?: string;
    /** When creating a spell, set to the character ID; stored as createdBy */
    characterId?: string;
    /** Who created the spell (e.g. TTG for imported, or character ID for user-created) */
    createdBy?: string;
    imgUrl?: string;
}

export type ChargesRefillEnum = "SHORT_REST" | "LONG_REST" | "REST";

/** Request body for refill rest endpoints */
export interface RefillRestRequest {
    restType: ChargesRefillEnum;
}

export interface SpellCellDto {
    id?: string;
    spellBookId?: string;
    level?: number;
    maxCount?: number;
    currentCount?: number;
    refillRestType?: ChargesRefillEnum;
}

export interface SpellBookItemDto {
    id?: string;
    spellBookId?: string;
    spellId?: string;
    inUse?: boolean;
    alwaysPrepared?: boolean;
    spell?: SpellDto;
}

export interface CharacterResourceDto {
    id?: string;
    spellBookId?: string;
    name: string;
    icon?: string;
    maxCount: number;
    currentCount?: number;
    refillRestType?: ChargesRefillEnum;
}

export interface SpellBookDto {
    id?: string;
    characterId?: string;
    roomId?: string;
    manaMax?: number;
    manaCurrent?: number;
    spells?: SpellBookItemDto[];
    /** Map of spell level to spell cell (keys as strings) */
    spellCells?: Record<string, SpellCellDto>;
    customResources?: CharacterResourceDto[];
}

export interface ImportResult {
    /** Total number of spells processed */
    total: number;
    /** Number of newly imported spells */
    imported: number;
    /** Number of updated spells */
    updated: number;
    /** Number of failed imports */
    failed: number;
}
