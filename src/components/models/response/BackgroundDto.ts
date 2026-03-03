/** D&D 2024 Rulebook Background API */

export type BackgroundProficiencyTypeEnum = "SKILL" | "TOOL";

export type BackgroundProficiencyDto = {
  id: string;
  backgroundStatsId: string;
  type: BackgroundProficiencyTypeEnum;
  code: string;
};

export type BackgroundTraitDto = {
  id: string;
  backgroundStatsId: string;
  name: string;
  code: string;
  description: string;
};

export type BackgroundStatsDto = {
  id: string;
  abilityModifiers: string[];
  traits: BackgroundTraitDto[];
  proficiencies: BackgroundProficiencyDto[];
};

export type BackgroundDto = {
  id: string;
  roomId: string;
  name: string;
  description: string;
  code: string;
  imgUrl: string;
  stats: BackgroundStatsDto;
};
