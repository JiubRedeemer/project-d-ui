/**
 * Types for Rulebook API (OpenAPI 3.0.3 — Rulebook API Frontend).
 * Room-scoped: all paths under /api/rooms/{roomId}/...
 */

// ——— Races ———

export type AbilityModifierDto = {
  code: string;
  value: number;
  count?: number | null;
};

export type RaceTraitDto = {
  id?: string;
  raceStatsId?: string;
  name: string;
  code?: string;
  description: string;
};

export type RaceProficiencyTypeEnum = "WEAPON" | "ARMOR" | "INSTRUMENT" | "ABILITY";

export type RaceProficiencyDto = {
  id?: string;
  raceStatsId?: string;
  type: RaceProficiencyTypeEnum;
  code: string;
};

export type RaceStatsDto = {
  id?: string;
  maxAge?: number | null;
  maxHeight?: number | null;
  maxWeight?: number | null;
  baseSpeed?: number | null;
  abilityModifiers: AbilityModifierDto[];
  traits?: RaceTraitDto[];
  proficiencies?: RaceProficiencyDto[];
};

export type RaceDto = {
  id?: string;
  roomId: string;
  name: string;
  description: string;
  code?: string;
  speciesCode?: string | null;
  imgUrl?: string | null;
  stats: RaceStatsDto;
};

export type RaceGroupDto = {
  species?: RaceDto | null;
  subspecies: RaceDto[];
};

export type RaceCreateInfoDto = {
  name: string;
  description: string;
  code: string;
  speciesCode?: string | null;
  imgUrl?: string | null;
  stats: RaceStatsDto;
};

// ——— Classes ———

export type AbilityShortDto = {
  code: string;
  name: string;
};

export type SkillTypeEnum = "ABILITY" | "WEAPON" | "ARMOR" | "INSTRUMENT";

export type AvailableSkillDto = {
  type: SkillTypeEnum;
  count: number;
  of: (string | null)[];
};

export type ClazzStatsDto = {
  id: string;
  hpDice: string;
  savingThrowsAbilities: AbilityShortDto[];
  availableSkills: AvailableSkillDto[];
};

export type ClazzDto = {
  id: string;
  roomId: string;
  name: string;
  description?: string | null;
  code: string;
  groupCode?: string | null;
  imgUrl?: string | null;
  stats: ClazzStatsDto;
};

export type ClazzGroupDto = {
  clazz?: ClazzDto | null;
  subClazzes: ClazzDto[];
};

export type ClassCreateInfoDto = {
  name: string;
  description: string;
  code: string;
  groupCode?: string | null;
  imgUrl?: string | null;
  stats: ClazzStatsDto;
};

// ——— Abilities ———

export type AbilitySkillDto = {
  id?: string | null;
  name?: string | null;
  code?: string | null;
};

export type AbilityDto = {
  name?: string | null;
  code?: string | null;
  roomId?: string | null;
  skills?: AbilitySkillDto[] | null;
};

// ——— Skills ———

export type SkillResponse = {
  name: string;
  code: string;
  ability?: AbilityDto | null;
};

// ——— Background ———

export type BackgroundProficiencyTypeEnum = "SKILL" | "TOOL";

export type BackgroundProficiencyDto = {
  id?: string;
  backgroundStatsId?: string;
  type: BackgroundProficiencyTypeEnum;
  code: string;
};

export type BackgroundTraitDto = {
  id?: string;
  backgroundStatsId?: string;
  name: string;
  code?: string;
  description: string;
};

export type BackgroundStatsDto = {
  id?: string;
  abilityModifiers: string[];
  traits?: BackgroundTraitDto[];
  proficiencies?: BackgroundProficiencyDto[];
};

export type BackgroundDto = {
  id?: string;
  roomId: string;
  name: string;
  description: string;
  code?: string;
  imgUrl?: string | null;
  stats: BackgroundStatsDto;
};
