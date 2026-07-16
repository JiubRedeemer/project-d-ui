/** Organization API client (room-scoped): /api/rooms/{roomId}/organizations */
import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type {
  OrganizationDto,
  OrganizationMembershipDto,
  OrganizationRelationDto,
  SaveOrganizationRelationRequest,
  SaveOrganizationRequest,
} from "@/api/organizationApi.types";

function orgBaseUrl(roomId: string): string {
    return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}/organizations`;
}

function authHeaders(): Record<string, string> {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    };
}

export async function saveOrganizationForRoom(
    roomId: string,
    body: SaveOrganizationRequest
): Promise<OrganizationDto> {
    const { data } = await axios.put<OrganizationDto>(orgBaseUrl(roomId), body, { headers: authHeaders() });
    return data;
}

export async function getOrganizationsForRoom(roomId: string): Promise<OrganizationDto[]> {
    const { data } = await axios.get<OrganizationDto[]>(orgBaseUrl(roomId), { headers: authHeaders() });
    return data ?? [];
}

export async function getOrganizationByIdForRoom(roomId: string, id: string): Promise<OrganizationDto> {
    const { data } = await axios.get<OrganizationDto>(
        `${orgBaseUrl(roomId)}/${encodeURIComponent(id)}`,
        { headers: authHeaders() }
    );
    return data;
}

export async function deleteOrganizationForRoom(roomId: string, id: string): Promise<void> {
    await axios.delete(`${orgBaseUrl(roomId)}/${encodeURIComponent(id)}`, { headers: authHeaders() });
}

export async function getOrganizationMembershipsForCharacter(
    roomId: string,
    characterId: string
): Promise<OrganizationMembershipDto[]> {
    const { data } = await axios.get<OrganizationMembershipDto[]>(
        `${orgBaseUrl(roomId)}/by-character/${encodeURIComponent(characterId)}`,
        { headers: authHeaders() }
    );
    return data ?? [];
}

export async function saveOrganizationRelationForRoom(
    roomId: string,
    body: SaveOrganizationRelationRequest
): Promise<OrganizationRelationDto> {
    const { data } = await axios.put<OrganizationRelationDto>(
        `${orgBaseUrl(roomId)}/relations`,
        body,
        { headers: authHeaders() }
    );
    return data;
}

export async function deleteOrganizationRelationForRoom(roomId: string, relationId: string): Promise<void> {
    await axios.delete(
        `${orgBaseUrl(roomId)}/relations/${encodeURIComponent(relationId)}`,
        { headers: authHeaders() }
    );
}
