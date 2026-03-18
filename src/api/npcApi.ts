/**
 * Character NPC API client (room-scoped).
 * OpenAPI: Character NPC API (Frontend) — /api/rooms/{roomId}/...
 */
import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type {
  CharacterNpcRelationDto,
  NpcDto,
  RelationTypeEnum,
  SaveCharacterNpcRelationRequest,
  SaveNpcRequest,
} from "@/api/npcApi.types";

function baseUrl(roomId: string): string {
    return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}`;
}

function authHeaders(): Record<string, string> {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    };
}

// ——— NPCs ———

export async function saveNpcForRoom(roomId: string, body: SaveNpcRequest): Promise<NpcDto> {
    const { data } = await axios.put<NpcDto>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.npcs}`,
        body,
        { headers: authHeaders() }
    );
    return data;
}

export async function getNpcsByRoomIdForRoom(roomId: string): Promise<NpcDto[]> {
    const { data } = await axios.get<NpcDto[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.npcs}`,
        { headers: authHeaders() }
    );
    return data;
}

export async function getNpcByIdForRoom(roomId: string, id: string): Promise<NpcDto> {
    const { data } = await axios.get<NpcDto>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.npcs}/${encodeURIComponent(id)}`,
        { headers: authHeaders() }
    );
    return data;
}

export async function deleteNpcByIdForRoom(roomId: string, id: string): Promise<void> {
    await axios.delete(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.npcs}/${encodeURIComponent(id)}`,
        { headers: authHeaders() }
    );
}

// ——— Character–NPC Relations ———

export async function saveCharacterNpcRelationForRoom(
    roomId: string,
    characterId: string,
    body: SaveCharacterNpcRelationRequest
): Promise<CharacterNpcRelationDto> {
    const { data } = await axios.put<CharacterNpcRelationDto>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.characters}/${encodeURIComponent(characterId)}${GATEWAY_INTEGRATION_ROUTES.npcs}${GATEWAY_INTEGRATION_ROUTES.npcRelations}`,
        body,
        { headers: authHeaders() }
    );
    return data;
}

export async function deleteCharacterNpcRelationByIdForRoom(
    roomId: string,
    characterId: string,
    id: string
): Promise<void> {
    await axios.delete(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.characters}/${encodeURIComponent(characterId)}${GATEWAY_INTEGRATION_ROUTES.npcRelations}/${encodeURIComponent(id)}`,
        { headers: authHeaders() }
    );
}

export async function getNpcsByCharacterIdForRoom(
    roomId: string,
    characterId: string
): Promise<NpcDto[]> {
    const { data } = await axios.get<NpcDto[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.characters}/${encodeURIComponent(characterId)}${GATEWAY_INTEGRATION_ROUTES.npcs}`,
        { headers: authHeaders() }
    );
    return data;
}

export async function getNpcsByCharacterIdAndRelationTypeForRoom(
    roomId: string,
    characterId: string,
    relationType: RelationTypeEnum
): Promise<NpcDto[]> {
    const { data } = await axios.get<NpcDto[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.characters}/${encodeURIComponent(characterId)}${GATEWAY_INTEGRATION_ROUTES.npcs}${GATEWAY_INTEGRATION_ROUTES.npcRelationType}/${encodeURIComponent(relationType)}`,
        { headers: authHeaders() }
    );
    return data;
}

