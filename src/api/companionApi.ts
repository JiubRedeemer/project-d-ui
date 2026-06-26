import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type {
  CompanionDto,
  SaveCompanionRequest,
} from "@/api/companionApi.types";

function baseUrl(roomId: string, characterId: string): string {
  return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterId}${GATEWAY_INTEGRATION_ROUTES.companions}`;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  };
}

export async function saveCompanion(
  roomId: string,
  characterId: string,
  body: SaveCompanionRequest
): Promise<CompanionDto> {
  const { data } = await axios.put<CompanionDto>(
    baseUrl(roomId, characterId),
    body,
    { headers: authHeaders() }
  );
  return data;
}

export async function getCompanionsByCharacterId(
  roomId: string,
  characterId: string
): Promise<CompanionDto[]> {
  const { data } = await axios.get<CompanionDto[]>(
    baseUrl(roomId, characterId),
    { headers: authHeaders() }
  );
  return data;
}

export async function getCompanionById(
  roomId: string,
  characterId: string,
  id: string
): Promise<CompanionDto> {
  const { data } = await axios.get<CompanionDto>(
    `${baseUrl(roomId, characterId)}/${id}`,
    { headers: authHeaders() }
  );
  return data;
}

export async function updateCompanionCurrentHp(
  roomId: string,
  characterId: string,
  id: string,
  value: number
): Promise<void> {
  await axios.patch(
    `${baseUrl(roomId, characterId)}/${id}/hp/current`,
    { value },
    { headers: authHeaders() }
  );
}

export async function restoreCompanionFullHp(
  roomId: string,
  characterId: string,
  id: string
): Promise<void> {
  await axios.post(
    `${baseUrl(roomId, characterId)}/${id}/hp/restore`,
    {},
    { headers: authHeaders() }
  );
}

export async function deleteCompanion(
  roomId: string,
  characterId: string,
  id: string
): Promise<void> {
  await axios.delete(`${baseUrl(roomId, characterId)}/${id}`, {
    headers: authHeaders(),
  });
}
