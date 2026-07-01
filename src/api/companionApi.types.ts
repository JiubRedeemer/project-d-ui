export type CompanionType = 'PET' | 'SUMMONED' | 'FORM'

export interface CompanionSkillDto {
  name: string
  bonus: number
}

export interface CompanionActionDto {
  name: string
  description: string
}

export interface CompanionFeatureDto {
  name: string
  description: string
}

export interface AbilityShort {
  code: string
  value: number
}

export interface CompanionDto {
  id: string
  characterId: string
  name: string
  description?: string
  companionType: CompanionType
  maxHp: number
  currentHp: number
  hpDiceCount?: number
  hpDieSize?: number
  hpDiceBonus?: number
  armoryClass?: string
  speed?: string
  level?: number
  proficiencyBonus?: number
  challengeRating?: string
  skills?: CompanionSkillDto[]
  actions?: CompanionActionDto[]
  features?: CompanionFeatureDto[]
  abilities?: AbilityShort[]
  imgUrl?: string
  sourceNpcId?: string
  createdAt?: string
}

export interface SaveCompanionRequest {
  id?: string
  characterId?: string
  name?: string
  description?: string
  companionType?: CompanionType  // 'PET' | 'SUMMONED' | 'FORM'
  maxHp?: number
  currentHp?: number
  hpDiceCount?: number
  hpDieSize?: number
  hpDiceBonus?: number
  armoryClass?: string
  speed?: string
  level?: number
  proficiencyBonus?: number
  challengeRating?: string
  skills?: CompanionSkillDto[]
  actions?: CompanionActionDto[]
  features?: CompanionFeatureDto[]
  strScore?: number
  dexScore?: number
  conScore?: number
  intScore?: number
  wisScore?: number
  chaScore?: number
  imgUrl?: string
  sourceNpcId?: string
}
