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
  imgUrl?: string | null;
  createdBy: string;
  createdAt: string;
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
  imgUrl?: string | null;
  createdBy: string;
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

