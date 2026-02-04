/**
 * Magic API DTOs and types (OpenAPI Magic API).
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

/** Localized names (locale -> name) */
export type LocalizedNames = Record<string, string>;

export interface SpellDto {
    id?: string;
    /** Локализованные названия заклинаний (locale -> name) */
    name?: LocalizedNames;
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
    description?: string;
    createdAt?: string;
    imgUrl?: string;
}

export type ChargesRefillEnum = "SHORT_REST" | "LONG_REST";

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
    spell?: SpellDto;
}

export interface SpellBookDto {
    id?: string;
    characterId?: string;
    roomId?: string;
    manaMax?: number;
    manaCurrent?: number;
    spells?: SpellBookItemDto[];
    /** Уровень заклинания -> ячейка (ключи — строки) */
    spellCells?: Record<string, SpellCellDto>;
}

export interface ImportResult {
    /** Всего обработано заклинаний */
    total: number;
    /** Импортировано новых */
    imported: number;
    /** Обновлено */
    updated: number;
    /** Ошибок импорта */
    failed: number;
}
