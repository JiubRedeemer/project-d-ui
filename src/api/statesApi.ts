import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type { CharacterStateDto, StateDto } from "@/api/statesApi.types";

function baseUrl(roomId: string): string {
    return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}`;
}

function authHeaders(): Record<string, string> {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    };
}

export async function getStatesForRoom(roomId: string): Promise<StateDto[]> {
    const { data } = await axios.get<StateDto[]>(
        `${baseUrl(roomId)}/states`,
        { headers: authHeaders() }
    );
    return data;
}

export async function getStateByCodeForRoom(roomId: string, code: string): Promise<StateDto> {
    const { data } = await axios.get<StateDto>(
        `${baseUrl(roomId)}/states/byCode/${encodeURIComponent(code)}`,
        { headers: authHeaders() }
    );
    return data;
}

// ——— Character states ———

function characterStatesBase(roomId: string, characterId: string): string {
    return `${baseUrl(roomId)}/characters/${characterId}/character-states`;
}

export async function getCharacterStates(roomId: string, characterId: string): Promise<CharacterStateDto[]> {
    const { data } = await axios.get<CharacterStateDto[]>(
        characterStatesBase(roomId, characterId),
        { headers: authHeaders() }
    );
    return data;
}

export async function saveCharacterState(roomId: string, characterId: string, body: CharacterStateDto): Promise<CharacterStateDto> {
    const { data } = await axios.put<CharacterStateDto>(
        characterStatesBase(roomId, characterId),
        body,
        { headers: authHeaders() }
    );
    return data;
}

export async function deleteCharacterState(roomId: string, characterId: string, characterStateId: string): Promise<void> {
    await axios.delete(
        `${characterStatesBase(roomId, characterId)}/${characterStateId}`,
        { headers: authHeaders() }
    );
}
