/**
 * Character NPC API client (room-scoped).
 * OpenAPI: Character NPC API (Frontend) — /api/rooms/{roomId}/...
 */
import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type {
  CharacterNpcRelationDto,
  NpcDto,
  NpcWithRelationIdDto,
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

/** Backend wraps array in { value: T[], Count: number } */
type WrappedResponse<T> = { value?: T[]; Count?: number } | T[];

// ——— NPCs ———

export async function saveNpcForRoom(roomId: string, body: SaveNpcRequest): Promise<NpcDto> {
    const { data } = await axios.put<NpcDto>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.npcs}`,
        body,
        { headers: authHeaders() }
    );
    return data;
}

export type GetNpcsByRoomIdParams = {
    characterId?: string | null;
    forceAll?: boolean;
};

export async function getNpcsByRoomIdForRoom(
    roomId: string,
    params?: GetNpcsByRoomIdParams
): Promise<NpcDto[]> {
    const queryParams: Record<string, string | boolean> = {};
    if (params?.characterId != null && params.characterId !== "") {
        queryParams.characterId = params.characterId;
    }
    if (params?.forceAll != null) {
        queryParams.forceAll = params.forceAll;
    }
    const { data } = await axios.get<WrappedResponse<NpcDto>>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.npcs}`,
        { headers: authHeaders(), params: Object.keys(queryParams).length ? queryParams : undefined }
    );
    return Array.isArray(data) ? data : (data as { value?: NpcDto[] }).value ?? [];
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
    relationId: string
): Promise<void> {
    await axios.delete(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.characters}/${encodeURIComponent(characterId)}${GATEWAY_INTEGRATION_ROUTES.npcs}${GATEWAY_INTEGRATION_ROUTES.npcRelations}/${encodeURIComponent(relationId)}`,
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
): Promise<NpcWithRelationIdDto[]> {
    const { data } = await axios.get<WrappedResponse<NpcWithRelationIdDto>>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.characters}/${encodeURIComponent(characterId)}${GATEWAY_INTEGRATION_ROUTES.npcs}${GATEWAY_INTEGRATION_ROUTES.npcRelationType}/${encodeURIComponent(relationType)}`,
        { headers: authHeaders() }
    );
    const arr = Array.isArray(data) ? data : (data as { value?: NpcWithRelationIdDto[] }).value ?? [];
    return arr;
}

