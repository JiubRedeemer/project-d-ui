import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type { ShopDto, ShopItemDto } from "@/api/shopApi.types";

function roomShopsUrl(roomId: string): string {
  return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.shops}`;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  };
}

export async function getShopsForRoom(roomId: string): Promise<ShopDto[]> {
  const { data } = await axios.get<ShopDto[]>(roomShopsUrl(roomId), { headers: authHeaders() });
  return data ?? [];
}

export async function getShop(roomId: string, shopId: string): Promise<ShopDto> {
  const { data } = await axios.get<ShopDto>(`${roomShopsUrl(roomId)}/${shopId}`, { headers: authHeaders() });
  return data;
}

export async function createShop(roomId: string, shop: Partial<ShopDto>): Promise<ShopDto> {
  const { data } = await axios.post<ShopDto>(roomShopsUrl(roomId), shop, { headers: authHeaders() });
  return data;
}

export async function updateShop(roomId: string, shopId: string, shop: Partial<ShopDto>): Promise<ShopDto> {
  const { data } = await axios.put<ShopDto>(`${roomShopsUrl(roomId)}/${shopId}`, shop, { headers: authHeaders() });
  return data;
}

export async function deleteShop(roomId: string, shopId: string): Promise<void> {
  await axios.delete(`${roomShopsUrl(roomId)}/${shopId}`, { headers: authHeaders() });
}

export async function getShopItems(roomId: string, shopId: string): Promise<ShopItemDto[]> {
  const { data } = await axios.get<ShopItemDto[]>(`${roomShopsUrl(roomId)}/${shopId}/items`, {
    headers: authHeaders(),
  });
  return data ?? [];
}

export async function saveShopItem(roomId: string, shopId: string, item: ShopItemDto): Promise<ShopItemDto> {
  const { data } = await axios.put<ShopItemDto>(`${roomShopsUrl(roomId)}/${shopId}/items`, item, {
    headers: authHeaders(),
  });
  return data;
}

export async function deleteShopItem(roomId: string, shopItemId: string): Promise<void> {
  await axios.delete(`${roomShopsUrl(roomId)}/items/${shopItemId}`, { headers: authHeaders() });
}
