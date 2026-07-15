import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type { SpellBundle, SpellDto } from "@/components/models/response/MagicApi";

function bundlesUrl(): string {
  return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.spellBundles}`;
}

function roomBundlesUrl(roomId: string): string {
  return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.spellBundles}`;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  };
}

/** Видимые пользователю наборы: системные + публичные + собственные, с поиском по названию. */
export async function getVisibleSpellBundles(search?: string): Promise<SpellBundle[]> {
  const { data } = await axios.get<SpellBundle[]>(bundlesUrl(), {
    headers: authHeaders(),
    params: search?.trim() ? { search: search.trim() } : undefined,
  });
  return data ?? [];
}

/** Собственные наборы текущего пользователя. */
export async function getOwnSpellBundles(): Promise<SpellBundle[]> {
  const { data } = await axios.get<SpellBundle[]>(`${bundlesUrl()}/own`, { headers: authHeaders() });
  return data ?? [];
}

export async function getSpellBundle(bundleId: string): Promise<SpellBundle> {
  const { data } = await axios.get<SpellBundle>(`${bundlesUrl()}/${bundleId}`, { headers: authHeaders() });
  return data;
}

export async function createSpellBundle(bundle: Partial<SpellBundle>): Promise<SpellBundle> {
  const { data } = await axios.post<SpellBundle>(bundlesUrl(), bundle, { headers: authHeaders() });
  return data;
}

export async function updateSpellBundle(bundleId: string, bundle: Partial<SpellBundle>): Promise<SpellBundle> {
  const { data } = await axios.put<SpellBundle>(`${bundlesUrl()}/${bundleId}`, bundle, { headers: authHeaders() });
  return data;
}

export async function deleteSpellBundle(bundleId: string): Promise<void> {
  await axios.delete(`${bundlesUrl()}/${bundleId}`, { headers: authHeaders() });
}

export async function getSpellBundleSpells(bundleId: string): Promise<SpellDto[]> {
  const { data } = await axios.get<SpellDto[]>(`${bundlesUrl()}/${bundleId}/spells`, { headers: authHeaders() });
  return data ?? [];
}

export async function saveSpellBundleSpell(bundleId: string, spell: SpellDto): Promise<SpellDto> {
  const { data } = await axios.put<SpellDto>(`${bundlesUrl()}/${bundleId}/spells`, spell, { headers: authHeaders() });
  return data;
}

export async function deleteSpellBundleSpell(spellId: string): Promise<void> {
  await axios.delete(`${bundlesUrl()}/spells/${spellId}`, { headers: authHeaders() });
}

/** Импорт копий уже созданных пользователем заклинаний в набор. */
export async function importSpellBundleSpells(bundleId: string, spellIds: string[]): Promise<void> {
  await axios.post(`${bundlesUrl()}/${bundleId}/import`, spellIds, { headers: authHeaders() });
}

/** Все заклинания, созданные текущим пользователем, для импорта в набор. */
export async function getMyCreatedSpells(search?: string): Promise<SpellDto[]> {
  const { data } = await axios.get<SpellDto[]>(`${bundlesUrl()}/my-spells`, {
    headers: authHeaders(),
    params: search?.trim() ? { search: search.trim() } : undefined,
  });
  return data ?? [];
}

/** Покупка публичного набора за кристаллы. */
export async function purchaseSpellBundle(bundleId: string): Promise<SpellBundle> {
  const { data } = await axios.post<SpellBundle>(`${bundlesUrl()}/${bundleId}/purchase`, {}, { headers: authHeaders() });
  return data;
}

export async function getSpellBundlesForRoom(roomId: string, search?: string): Promise<SpellBundle[]> {
  const { data } = await axios.get<SpellBundle[]>(roomBundlesUrl(roomId), {
    headers: authHeaders(),
    params: search?.trim() ? { search: search.trim() } : undefined,
  });
  return data ?? [];
}

/**
 * Заклинания из включённых для комнаты наборов (для поиска мастером и игроком).
 * bundleId — фильтр по конкретному набору; без него отдаются все включённые наборы + пользовательские заклинания.
 */
export async function getRoomSpellsFromBundles(roomId: string, spellClass?: string, bundleId?: string): Promise<SpellDto[]> {
  const params: Record<string, string> = {};
  if (spellClass?.trim()) params.spellClass = spellClass.trim();
  if (bundleId?.trim()) params.bundleId = bundleId.trim();
  const { data } = await axios.get<SpellDto[]>(`${roomBundlesUrl(roomId)}/spells`, {
    headers: authHeaders(),
    params: Object.keys(params).length ? params : undefined,
  });
  return data ?? [];
}

export async function enableSpellBundleForRoom(roomId: string, bundleId: string): Promise<void> {
  await axios.put(`${roomBundlesUrl(roomId)}/${bundleId}`, {}, { headers: authHeaders() });
}

export async function disableSpellBundleForRoom(roomId: string, bundleId: string): Promise<void> {
  await axios.delete(`${roomBundlesUrl(roomId)}/${bundleId}`, { headers: authHeaders() });
}
