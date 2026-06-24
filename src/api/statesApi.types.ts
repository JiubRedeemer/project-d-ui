export interface StateDto {
  id?: string | null;
  name?: string | null;
  code?: string | null;
  description?: string | null;
}

export interface CharacterStateDto {
  id?: string | null;
  characterId?: string | null;
  stateCode?: string | null;
}
