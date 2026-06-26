export interface CombatParticipantDto {
  id: string;
  participantType: 'CHARACTER' | 'NPC';
  referenceId: string | null;
  displayName: string;
  initiative: number | null;
  isReady: boolean;
  copyIndex: number;
  sortOrder: number | null;
  isCurrentTurn: boolean;
  currentHp: number | null;
  maxHp: number | null;
  tempHp: number | null;
  armoryClass: number | null;
  states: string[];
  clazzName: string | null;
  level: number | null;
  deathSaveSuccesses: number | null;
  deathSaveFailures: number | null;
  npcType: string | null;
  abilities?: { code: string; value: number; bonusValue?: number | null }[] | null;
}

export interface UpdateParticipantStatsRequest {
  participantId: string;
  currentHp?: number | null;
  maxHp?: number | null;
  armoryClass?: number | null;
}

export interface CombatStateDto {
  sessionId: string;
  roomId: string;
  state: 'PREPARING' | 'ACTIVE' | 'FINISHED';
  round: number;
  currentTurnIndex: number;
  allReady: boolean;
  participants: CombatParticipantDto[];
}
