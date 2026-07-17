/** Blueprint API client (room-scoped): /api/rooms/{roomId}/blueprints */
import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type { BlueprintDto } from "@/api/blueprintApi.types";

function blueprintBaseUrl(roomId: string): string {
    return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}/blueprints`;
}

function authHeaders(): Record<string, string> {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    };
}

/** Чертежи, доступные персонажу: по его классу и не выше его уровня. */
export async function getBlueprintsForCharacter(
    roomId: string,
    characterId: string
): Promise<BlueprintDto[]> {
    const { data } = await axios.get<BlueprintDto[]>(
        `${blueprintBaseUrl(roomId)}/character/${encodeURIComponent(characterId)}`,
        { headers: authHeaders() }
    );
    return data ?? [];
}

/** Все чертежи комнаты (справочник мастера). */
export async function getBlueprintsForRoom(
    roomId: string,
    params?: { groupCode?: string; maxLevel?: number }
): Promise<BlueprintDto[]> {
    const { data } = await axios.get<BlueprintDto[]>(blueprintBaseUrl(roomId), {
        headers: authHeaders(),
        params: params && Object.keys(params).length ? params : undefined,
    });
    return data ?? [];
}
