import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type { CombatStateDto, UpdateParticipantStatsRequest } from "@/api/combatApi.types";

function baseUrl(roomId: string): string {
  return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}/combat`;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  };
}

export async function createCombatSession(roomId: string): Promise<CombatStateDto> {
  const { data } = await axios.post<CombatStateDto>(baseUrl(roomId), {}, { headers: authHeaders() });
  return data;
}

export async function getActiveCombatSession(roomId: string): Promise<CombatStateDto | null> {
  try {
    const { data } = await axios.get<CombatStateDto>(`${baseUrl(roomId)}/active`, { headers: authHeaders() });
    return data;
  } catch (e: any) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

export async function endCombatSession(roomId: string, sessionId: string): Promise<void> {
  await axios.delete(`${baseUrl(roomId)}/${sessionId}`, { headers: authHeaders() });
}

export async function addCombatParticipant(
  roomId: string,
  sessionId: string,
  request: {
    participantType: string;
    referenceId: string | null;
    displayName: string;
    copyCount?: number;
    maxHp?: number | null;
    currentHp?: number | null;
    armoryClassOverride?: number | null;
  }
): Promise<CombatStateDto> {
  const { data } = await axios.post<CombatStateDto>(
    `${baseUrl(roomId)}/${sessionId}/participants`,
    request,
    { headers: authHeaders() }
  );
  return data;
}

export async function removeCombatParticipant(
  roomId: string,
  sessionId: string,
  participantId: string
): Promise<CombatStateDto> {
  const { data } = await axios.delete<CombatStateDto>(
    `${baseUrl(roomId)}/${sessionId}/participants/${participantId}`,
    { headers: authHeaders() }
  );
  return data;
}

export async function startCombat(roomId: string, sessionId: string): Promise<CombatStateDto> {
  const { data } = await axios.patch<CombatStateDto>(
    `${baseUrl(roomId)}/${sessionId}/start`,
    {},
    { headers: authHeaders() }
  );
  return data;
}

export async function setCombatInitiative(
  roomId: string,
  sessionId: string,
  participantId: string,
  initiative: number
): Promise<CombatStateDto> {
  const { data } = await axios.patch<CombatStateDto>(
    `${baseUrl(roomId)}/${sessionId}/initiative`,
    { participantId, initiative },
    { headers: authHeaders() }
  );
  return data;
}

export async function nextCombatTurn(roomId: string, sessionId: string): Promise<CombatStateDto> {
  const { data } = await axios.patch<CombatStateDto>(
    `${baseUrl(roomId)}/${sessionId}/next-turn`,
    {},
    { headers: authHeaders() }
  );
  return data;
}

export async function prevCombatTurn(roomId: string, sessionId: string): Promise<CombatStateDto> {
  const { data } = await axios.patch<CombatStateDto>(
    `${baseUrl(roomId)}/${sessionId}/prev-turn`,
    {},
    { headers: authHeaders() }
  );
  return data;
}

export async function updateParticipantStats(
  roomId: string,
  sessionId: string,
  request: UpdateParticipantStatsRequest
): Promise<CombatStateDto> {
  const { data } = await axios.patch<CombatStateDto>(
    `${baseUrl(roomId)}/${sessionId}/participants/stats`,
    request,
    { headers: authHeaders() }
  );
  return data;
}

export async function updateParticipantHp(
  roomId: string,
  sessionId: string,
  participantId: string,
  currentHp: number,
  maxHp?: number
): Promise<CombatStateDto> {
  const { data } = await axios.patch<CombatStateDto>(
    `${baseUrl(roomId)}/${sessionId}/participants/hp`,
    { participantId, currentHp, maxHp },
    { headers: authHeaders() }
  );
  return data;
}
