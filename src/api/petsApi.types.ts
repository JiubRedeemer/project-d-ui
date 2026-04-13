export type PetHealthCurrentUpdateType = "ADD" | "SUBTRACT" | "SET";

export interface PetAbilityRequest {
  abilityCode: string;
  bonusValue: number;
}

export interface CreatePetRequest {
  name: string;
  age?: number;
  description?: string;
  avatar?: string;
  maxHp?: number;
  currentHp?: number;
  armorClass?: number;
  speed?: number;
  size?: string;
  creatureType?: string;
  proficiencyBonus?: number;
  senses?: string;
  languages?: string;
  isSummoned?: boolean;
  isActive?: boolean;
  abilities?: PetAbilityRequest[];
}

export interface PetProfileUpdateRequest {
  name?: string;
  age?: number;
  description?: string;
  avatar?: string;
  armorClass?: number;
  speed?: number;
  size?: string;
  creatureType?: string;
  proficiencyBonus?: number;
  senses?: string;
  languages?: string;
  isSummoned?: boolean;
  isActive?: boolean;
}

export interface PetHealthCurrentUpdateRequest {
  type: PetHealthCurrentUpdateType;
  value: number;
}

export interface PetSkillRequest {
  name?: string;
  description?: string;
}

export interface BonusValueUpdateRequest {
  bonusValue: number;
}

export interface PetAbilityDto {
  id: string;
  petId: string;
  abilityCode: string;
  bonusValue: number;
}

export interface PetSkillDto {
  id: string;
  petId: string;
  name: string;
  description?: string;
}

export interface PetDto {
  id: string;
  characterId: string;
  name: string;
  age?: number;
  description?: string;
  avatar?: string;
  maxHp?: number;
  currentHp?: number;
  armorClass?: number;
  speed?: number;
  size?: string;
  creatureType?: string;
  proficiencyBonus?: number;
  senses?: string;
  languages?: string;
  isSummoned?: boolean;
  isActive?: boolean;
  abilities?: PetAbilityDto[];
  skills?: PetSkillDto[];
}
