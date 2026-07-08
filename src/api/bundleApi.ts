import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type { Item, ItemBundle } from "@/components/models/response/InventoryResponse";

function bundlesUrl(): string {
  return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.bundles}`;
}

function roomBundlesUrl(roomId: string): string {
  return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.bundles}`;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  };
}

/** Видимые пользователю наборы: системные + публичные + собственные, с поиском по названию. */
export async function getVisibleBundles(search?: string): Promise<ItemBundle[]> {
  const { data } = await axios.get<ItemBundle[]>(bundlesUrl(), {
    headers: authHeaders(),
    params: search?.trim() ? { search: search.trim() } : undefined,
  });
  return data ?? [];
}

/** Собственные наборы текущего пользователя. */
export async function getOwnBundles(): Promise<ItemBundle[]> {
  const { data } = await axios.get<ItemBundle[]>(`${bundlesUrl()}/own`, {
    headers: authHeaders(),
  });
  return data ?? [];
}

export async function getBundle(bundleId: string): Promise<ItemBundle> {
  const { data } = await axios.get<ItemBundle>(`${bundlesUrl()}/${bundleId}`, {
    headers: authHeaders(),
  });
  return data;
}

export async function createBundle(bundle: Partial<ItemBundle>): Promise<ItemBundle> {
  const { data } = await axios.post<ItemBundle>(bundlesUrl(), bundle, { headers: authHeaders() });
  return data;
}

export async function updateBundle(bundleId: string, bundle: Partial<ItemBundle>): Promise<ItemBundle> {
  const { data } = await axios.put<ItemBundle>(`${bundlesUrl()}/${bundleId}`, bundle, { headers: authHeaders() });
  return data;
}

export async function deleteBundle(bundleId: string): Promise<void> {
  await axios.delete(`${bundlesUrl()}/${bundleId}`, { headers: authHeaders() });
}

export async function getBundleItems(bundleId: string): Promise<Item[]> {
  const { data } = await axios.get<Item[]>(`${bundlesUrl()}/${bundleId}/items`, {
    headers: authHeaders(),
  });
  return data ?? [];
}

export async function saveBundleItem(bundleId: string, item: Item): Promise<Item> {
  const { data } = await axios.put<Item>(`${bundlesUrl()}/${bundleId}/items`, item, { headers: authHeaders() });
  return data;
}

export async function deleteBundleItem(itemId: string): Promise<void> {
  await axios.delete(`${bundlesUrl()}/items/${itemId}`, { headers: authHeaders() });
}

/** Импорт копий уже созданных пользователем предметов в набор. */
export async function importBundleItems(bundleId: string, itemIds: string[]): Promise<void> {
  await axios.post(`${bundlesUrl()}/${bundleId}/import`, itemIds, { headers: authHeaders() });
}

/** Все предметы, созданные текущим пользователем (из любых комнат), для импорта в набор. */
export async function getMyCreatedItems(search?: string): Promise<Item[]> {
  const { data } = await axios.get<Item[]>(`${bundlesUrl()}/my-items`, {
    headers: authHeaders(),
    params: search?.trim() ? { search: search.trim() } : undefined,
  });
  return data ?? [];
}

/** Покупка публичного набора за кристаллы. */
export async function purchaseBundle(bundleId: string): Promise<ItemBundle> {
  const { data } = await axios.post<ItemBundle>(`${bundlesUrl()}/${bundleId}/purchase`, {}, { headers: authHeaders() });
  return data;
}

export async function getBundlesForRoom(roomId: string, search?: string): Promise<ItemBundle[]> {
  const { data } = await axios.get<ItemBundle[]>(roomBundlesUrl(roomId), {
    headers: authHeaders(),
    params: search?.trim() ? { search: search.trim() } : undefined,
  });
  return data ?? [];
}

export async function enableBundleForRoom(roomId: string, bundleId: string): Promise<void> {
  await axios.put(`${roomBundlesUrl(roomId)}/${bundleId}`, {}, { headers: authHeaders() });
}

export async function disableBundleForRoom(roomId: string, bundleId: string): Promise<void> {
  await axios.delete(`${roomBundlesUrl(roomId)}/${bundleId}`, { headers: authHeaders() });
}
