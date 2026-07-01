import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";

export interface ItemTagDto {
  id: string;
  name: string;
  description?: string;
  roomId?: string;
}

function baseUrl(roomId: string): string {
  return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.items}/tags`;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  };
}

export async function getTagsForRoom(roomId: string): Promise<ItemTagDto[]> {
  const { data } = await axios.get<ItemTagDto[]>(baseUrl(roomId), {
    headers: authHeaders(),
  });
  return data ?? [];
}

export async function createTagForRoom(
  roomId: string,
  name: string
): Promise<ItemTagDto> {
  const { data } = await axios.post<ItemTagDto>(
    baseUrl(roomId),
    { name },
    { headers: authHeaders() }
  );
  return data;
}

export async function updateTagDescription(
  roomId: string,
  tagId: string,
  description: string
): Promise<ItemTagDto> {
  const { data } = await axios.patch<ItemTagDto>(
    `${baseUrl(roomId)}/${tagId}`,
    { description },
    { headers: authHeaders() }
  );
  return data;
}
