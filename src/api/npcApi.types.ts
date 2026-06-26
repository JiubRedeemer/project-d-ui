/**
 * Types for Character NPC API (OpenAPI 3.0.3 — Frontend).
 * Room-scoped: all paths under /api/rooms/{roomId}/...
 */

export type NpcTypeEnum = "RATIONAL" | "BEAST" | "MONSTER" | "DEITY" | "UNDEAD";

export type RelationTypeEnum = "FRIEND" | "ENEMY" | "RULER" | "PET" | "OTHER";

export type ClassInfoDto = {
  code?: string;
  name?: string;
};

export type RaceTraitDto = {
  code?: string;
  name?: string;
  description?: string;
};

export type RaceInfoDto = {
  code?: string;
  name?: string;
  speciesCode?: string;
  imgUrl?: string;
  traits?: RaceTraitDto[];
};

export type NpcAbilityScore = {
  code: string;
  value: number;
  bonusValue?: number | null;
};

export type NpcSkillDto = { name: string; bonus: number };
export type NpcActionDto = { name: string; description: string };
export type NpcFeatureDto = { name: string; description: string };

export type NpcDto = {
  id: string;
  roomId: string;
  name: string;
  description?: string | null;
  visible?: boolean;
  unique?: boolean;
  type: NpcTypeEnum;
  clazzCode?: string | null;
  clazzInfo?: ClassInfoDto | null;
  raceCode?: string | null;
  raceInfo?: RaceInfoDto | null;
  armoryClass?: string | null;
  speed?: string | null;
  initiative?: number | null;
  maxHp?: number | null;
  hpDiceCount?: number | null;
  hpDieSize?: number | null;
  hpDiceBonus?: number | null;
  level?: number | null;
  proficiencyBonus?: number | null;
  challengeRating?: string | null;
  skills?: NpcSkillDto[] | null;
  actions?: NpcActionDto[] | null;
  features?: NpcFeatureDto[] | null;
  abilities?: NpcAbilityScore[] | null;
  imgUrl?: string | null;
  createdBy: string;
  createdAt: string;
  tags?: string[] | null;
};

export type SaveNpcRequest = {
  id?: string | null;
  roomId: string;
  name: string;
  description?: string | null;
  type: NpcTypeEnum;
  visible?: boolean;
  unique?: boolean;
  clazzCode?: string | null;
  raceCode?: string | null;
  armoryClass?: string | null;
  speed?: string | null;
  initiative?: number | null;
  maxHp?: number | null;
  hpDiceCount?: number | null;
  hpDieSize?: number | null;
  hpDiceBonus?: number | null;
  level?: number | null;
  proficiencyBonus?: number | null;
  challengeRating?: string | null;
  skills?: NpcSkillDto[] | null;
  actions?: NpcActionDto[] | null;
  features?: NpcFeatureDto[] | null;
  strScore?: number | null;
  dexScore?: number | null;
  conScore?: number | null;
  intScore?: number | null;
  wisScore?: number | null;
  chaScore?: number | null;
  imgUrl?: string | null;
  createdBy: string;
  tags?: string[] | null;
};

export type CharacterNpcRelationDto = {
  id: string;
  characterId: string;
  npcId: string;
  note?: string | null;
  relationType?: RelationTypeEnum | null;
};

/** NPC with relation id (backend returns relationId in npcs/relationType response). */
export type NpcWithRelationIdDto = NpcDto & { relationId: string };

export type SaveCharacterNpcRelationRequest = {
  id?: string | null;
  characterId: string;
  npcId: string;
  note?: string | null;
  relationType?: RelationTypeEnum | null;
};

export type NpcNpcRelationDto = {
  id: string;
  fromNpcId: string;
  toNpcId: string;
  note?: string | null;
  relationType?: RelationTypeEnum | null;
};

export type SaveNpcNpcRelationRequest = {
  id?: string | null;
  fromNpcId: string;
  toNpcId: string;
  note?: string | null;
  relationType?: RelationTypeEnum | null;
};

