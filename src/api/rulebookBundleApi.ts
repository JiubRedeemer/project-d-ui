import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type { RulebookBundleContentDto, RulebookBundleDto } from "@/api/rulebookBundleApi.types";
import type { RaceDto, ClazzDto, BackgroundDto } from "@/api/rulebookApi.types";

function apiBase(): string {
  return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}`;
}

function bundlesUrl(): string {
  return `${apiBase()}${GATEWAY_INTEGRATION_ROUTES.rulebookBundles}`;
}

function roomBundlesUrl(roomId: string): string {
  return `${apiBase()}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.rulebookBundles}`;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  };
}

// ── Наборы правил в комнате (вкл/выкл, только мастер) ──
export async function getRulebookBundlesForRoom(roomId: string): Promise<RulebookBundleDto[]> {
  const { data } = await axios.get<RulebookBundleDto[]>(roomBundlesUrl(roomId), { headers: authHeaders() });
  return data ?? [];
}

export async function enableRulebookBundleForRoom(roomId: string, bundleId: string): Promise<void> {
  await axios.put(`${roomBundlesUrl(roomId)}/${bundleId}`, {}, { headers: authHeaders() });
}

export async function disableRulebookBundleForRoom(roomId: string, bundleId: string): Promise<void> {
  await axios.delete(`${roomBundlesUrl(roomId)}/${bundleId}`, { headers: authHeaders() });
}

// ── Точечный выбор элементов набора в комнате ──
export async function getRulebookBundleContentForRoom(roomId: string, bundleId: string): Promise<RulebookBundleContentDto[]> {
  const { data } = await axios.get<RulebookBundleContentDto[]>(`${roomBundlesUrl(roomId)}/${bundleId}/content`, {
    headers: authHeaders(),
  });
  return data ?? [];
}

export async function enableRulebookContentForRoom(roomId: string, contentId: string): Promise<void> {
  await axios.put(`${roomBundlesUrl(roomId)}/content/${contentId}`, {}, { headers: authHeaders() });
}

export async function disableRulebookContentForRoom(roomId: string, contentId: string): Promise<void> {
  await axios.delete(`${roomBundlesUrl(roomId)}/content/${contentId}`, { headers: authHeaders() });
}

// ── Авторство наборов правил ──
export async function getVisibleRulebookBundles(): Promise<RulebookBundleDto[]> {
  const { data } = await axios.get<RulebookBundleDto[]>(`${bundlesUrl()}/visible`, { headers: authHeaders() });
  return data ?? [];
}

export async function getOwnRulebookBundles(): Promise<RulebookBundleDto[]> {
  const { data } = await axios.get<RulebookBundleDto[]>(`${bundlesUrl()}/own`, { headers: authHeaders() });
  return data ?? [];
}

export async function getRulebookBundle(bundleId: string): Promise<RulebookBundleDto> {
  const { data } = await axios.get<RulebookBundleDto>(`${bundlesUrl()}/${bundleId}`, { headers: authHeaders() });
  return data;
}

export async function createRulebookBundle(bundle: Partial<RulebookBundleDto>): Promise<RulebookBundleDto> {
  const { data } = await axios.post<RulebookBundleDto>(bundlesUrl(), bundle, { headers: authHeaders() });
  return data;
}

export async function updateRulebookBundle(bundleId: string, bundle: Partial<RulebookBundleDto>): Promise<RulebookBundleDto> {
  const { data } = await axios.put<RulebookBundleDto>(`${bundlesUrl()}/${bundleId}`, bundle, { headers: authHeaders() });
  return data;
}

export async function deleteRulebookBundle(bundleId: string): Promise<void> {
  await axios.delete(`${bundlesUrl()}/${bundleId}`, { headers: authHeaders() });
}

// ── Контент наборов ──
export async function getBundleRaces(bundleId: string): Promise<RaceDto[]> {
  const { data } = await axios.get<RaceDto[]>(`${bundlesUrl()}/${bundleId}/races`, { headers: authHeaders() });
  return data ?? [];
}

export async function saveBundleRace(bundleId: string, race: RaceDto): Promise<RaceDto> {
  const { data } = await axios.put<RaceDto>(`${bundlesUrl()}/${bundleId}/races`, race, { headers: authHeaders() });
  return data;
}

export async function deleteBundleRace(raceId: string): Promise<void> {
  await axios.delete(`${bundlesUrl()}/races/${raceId}`, { headers: authHeaders() });
}

export async function getBundleClasses(bundleId: string): Promise<ClazzDto[]> {
  const { data } = await axios.get<ClazzDto[]>(`${bundlesUrl()}/${bundleId}/classes`, { headers: authHeaders() });
  return data ?? [];
}

export async function saveBundleClass(bundleId: string, clazz: ClazzDto): Promise<ClazzDto> {
  const { data } = await axios.put<ClazzDto>(`${bundlesUrl()}/${bundleId}/classes`, clazz, { headers: authHeaders() });
  return data;
}

export async function deleteBundleClass(classId: string): Promise<void> {
  await axios.delete(`${bundlesUrl()}/classes/${classId}`, { headers: authHeaders() });
}

export async function getBundleBackgrounds(bundleId: string): Promise<BackgroundDto[]> {
  const { data } = await axios.get<BackgroundDto[]>(`${bundlesUrl()}/${bundleId}/backgrounds`, { headers: authHeaders() });
  return data ?? [];
}

export async function saveBundleBackground(bundleId: string, background: BackgroundDto): Promise<BackgroundDto> {
  const { data } = await axios.put<BackgroundDto>(`${bundlesUrl()}/${bundleId}/backgrounds`, background, { headers: authHeaders() });
  return data;
}

export async function deleteBundleBackground(backgroundId: string): Promise<void> {
  await axios.delete(`${bundlesUrl()}/backgrounds/${backgroundId}`, { headers: authHeaders() });
}
