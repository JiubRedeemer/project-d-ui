import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type {
  BonusValueUpdateRequest,
  CreatePetRequest,
  PetDto,
  PetHealthCurrentUpdateRequest,
  PetProfileUpdateRequest,
  PetSkillDto,
  PetSkillRequest,
} from "@/api/petsApi.types";

function baseUrl() {
  return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}`;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  };
}

function petsBase(roomId: string, characterId: string) {
  return `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterId}/pets`;
}

export async function createPetForRoom(
  roomId: string,
  characterId: string,
  body: CreatePetRequest
): Promise<PetDto> {
  const { data } = await axios.post<PetDto>(petsBase(roomId, characterId), body, { headers: authHeaders() });
  return data;
}

export async function getPetsByCharacterIdForRoom(roomId: string, characterId: string): Promise<PetDto[]> {
  const { data } = await axios.get<PetDto[]>(petsBase(roomId, characterId), { headers: authHeaders() });
  return data;
}

export async function getPetByIdForRoom(roomId: string, characterId: string, petId: string): Promise<PetDto> {
  const { data } = await axios.get<PetDto>(`${petsBase(roomId, characterId)}/${petId}`, { headers: authHeaders() });
  return data;
}

export async function deletePetLogicalByIdForRoom(roomId: string, characterId: string, petId: string): Promise<void> {
  await axios.delete(`${petsBase(roomId, characterId)}/${petId}/logical`, { headers: authHeaders() });
}

export async function updatePetProfileForRoom(
  roomId: string,
  characterId: string,
  petId: string,
  body: PetProfileUpdateRequest
): Promise<void> {
  await axios.patch(`${petsBase(roomId, characterId)}/${petId}/profile`, body, { headers: authHeaders() });
}

export async function updatePetAbilityBonusForRoom(
  roomId: string,
  characterId: string,
  petId: string,
  abilityCode: string,
  body: BonusValueUpdateRequest
): Promise<void> {
  await axios.patch(`${petsBase(roomId, characterId)}/${petId}/abilities/${abilityCode}/bonus`, body, {
    headers: authHeaders(),
  });
}

export async function updatePetCurrentHpForRoom(
  roomId: string,
  characterId: string,
  petId: string,
  body: PetHealthCurrentUpdateRequest
): Promise<void> {
  await axios.patch(`${petsBase(roomId, characterId)}/${petId}/health/current`, body, { headers: authHeaders() });
}

export async function updatePetMaxHpForRoom(
  roomId: string,
  characterId: string,
  petId: string,
  body: BonusValueUpdateRequest
): Promise<void> {
  await axios.patch(`${petsBase(roomId, characterId)}/${petId}/health/max`, body, { headers: authHeaders() });
}

export async function createPetSkillForRoom(
  roomId: string,
  characterId: string,
  petId: string,
  body: PetSkillRequest
): Promise<PetSkillDto> {
  const { data } = await axios.post<PetSkillDto>(`${petsBase(roomId, characterId)}/${petId}/skills`, body, {
    headers: authHeaders(),
  });
  return data;
}

export async function updatePetSkillForRoom(
  roomId: string,
  characterId: string,
  petId: string,
  skillId: string,
  body: PetSkillRequest
): Promise<PetSkillDto> {
  const { data } = await axios.patch<PetSkillDto>(`${petsBase(roomId, characterId)}/${petId}/skills/${skillId}`, body, {
    headers: authHeaders(),
  });
  return data;
}

export async function deletePetSkillForRoom(
  roomId: string,
  characterId: string,
  petId: string,
  skillId: string
): Promise<void> {
  await axios.delete(`${petsBase(roomId, characterId)}/${petId}/skills/${skillId}`, { headers: authHeaders() });
}
