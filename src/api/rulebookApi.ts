/**
 * Rulebook API client (room-scoped).
 * OpenAPI: Rulebook API (Frontend) — /api/rooms/{roomId}/...
 */
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import type {
    AbilityDto,
    BackgroundDto,
    ClazzDto,
    ClazzGroupDto,
    RaceDto,
    RaceGroupDto,
    SkillResponse,
} from "@/api/rulebookApi.types";

function baseUrl(roomId: string): string {
    return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}`;
}

function apiBaseUrl(): string {
    return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}`;
}

function authHeaders(): Record<string, string> {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`,
    };
}

// ——— Races ———

export async function getGroupedRacesForRoom(roomId: string, forceRuleTypeEnum: string | undefined): Promise<RaceGroupDto[]> {
    const {data} = await axios.get<RaceGroupDto[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomRacesGrouped}`,
        {headers: authHeaders(), params: {"forceRuleType": forceRuleTypeEnum}}
    );
    return data;
}

export async function getRacesForRoom(roomId: string, forceRuleTypeEnum: string | undefined): Promise<RaceDto[]> {
    const {data} = await axios.get<RaceDto[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomRaces}`,
        {headers: authHeaders(), params: {"forceRuleType": forceRuleTypeEnum}}
    );
    return data;
}

export async function createRace(roomId: string, body: RaceDto): Promise<RaceDto> {
    const {data} = await axios.put<RaceDto>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomRaces}`,
        body,
        {headers: authHeaders()}
    );
    return data;
}

export async function updateRace(roomId: string, body: RaceDto): Promise<RaceDto> {
    const {data} = await axios.patch<RaceDto>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomRaces}`,
        body,
        {headers: authHeaders()}
    );
    return data;
}

export async function getRootRacesForRoom(roomId: string, forceRuleTypeEnum: string | undefined): Promise<RaceDto[]> {
    const {data} = await axios.get<RaceDto[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomRacesRoot}`,
        {headers: authHeaders(), params: {"forceRuleType": forceRuleTypeEnum}}
    );
    return data;
}

export async function getRaceByCodeForRoom(roomId: string, code: string): Promise<RaceDto> {
    const {data} = await axios.get<RaceDto>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomRaces}/${encodeURIComponent(code)}`,
        {headers: authHeaders()}
    );
    return data;
}

export async function getRaceSubspeciesByCodeForRoom(
    roomId: string,
    code: string, forceRuleTypeEnum: string | undefined
): Promise<RaceDto[]> {
    const {data} = await axios.get<RaceDto[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomRaces}/${encodeURIComponent(code)}/subspecies`,
        {headers: authHeaders(), params: {"forceRuleType": forceRuleTypeEnum}}
    );
    return data;
}

// ——— Classes ———

export async function getClassesForRoom(roomId: string, forceRuleTypeEnum: string | undefined): Promise<ClazzDto[]> {
    const {data} = await axios.get<ClazzDto[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomClasses}`,
        {headers: authHeaders(), params: {"forceRuleType": forceRuleTypeEnum}}
    );
    return data;
}

export async function createClass(roomId: string, body: ClazzDto): Promise<ClazzDto> {
    const {data} = await axios.put<ClazzDto>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomClasses}`,
        body,
        {headers: authHeaders()}
    );
    return data;
}

export async function updateClass(roomId: string, body: ClazzDto): Promise<ClazzDto> {
    const {data} = await axios.patch<ClazzDto>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomClasses}`,
        body,
        {headers: authHeaders()}
    );
    return data;
}

export async function getRootClassesForRoom(roomId: string, forceRuleTypeEnum: string | undefined): Promise<ClazzDto[]> {
    const {data} = await axios.get<ClazzDto[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomClassesRoot}`,
        {headers: authHeaders(), params: {"forceRuleType": forceRuleTypeEnum}}
    );
    return data;
}

export async function getClassByCodeForRoom(
    roomId: string,
    code: string
): Promise<ClazzDto> {
    const {data} = await axios.get<ClazzDto>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomClasses}/${encodeURIComponent(code)}`,
        {headers: authHeaders()}
    );
    return data;
}

export async function getSubClassesByCodeForRoom(
    roomId: string,
    code: string, forceRuleTypeEnum: string | undefined
): Promise<ClazzDto[]> {
    const {data} = await axios.get<ClazzDto[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomClasses}/${encodeURIComponent(code)}/subclasses`,
        {headers: authHeaders(), params: {"forceRuleType": forceRuleTypeEnum}}
    );
    return data;
}

export async function getGroupedClassesForRoom(
    roomId: string
): Promise<ClazzGroupDto[]> {
    const {data} = await axios.get<ClazzGroupDto[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomClassesGrouped}`,
        {headers: authHeaders()}
    );
    return data;
}

// ——— Abilities ———

export async function getAbilitiesForRoom(roomId: string): Promise<AbilityDto[]> {
    const {data} = await axios.get<AbilityDto[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomAbilities}`,
        {headers: authHeaders()}
    );
    return data;
}

// ——— Skills ———

export async function getSkillsForRoom(roomId: string): Promise<SkillResponse[]> {
    const {data} = await axios.get<SkillResponse[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomSkills}`,
        {headers: authHeaders()}
    );
    return data;
}

export async function getSkillByCodeForRoom(
    roomId: string,
    code: string
): Promise<SkillResponse> {
    const {data} = await axios.get<SkillResponse>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomSkillsByCode}/${encodeURIComponent(code)}`,
        {headers: authHeaders()}
    );
    return data;
}

export async function getSkillsByClassForRoom(
    roomId: string,
    classCode: string
): Promise<SkillResponse[]> {
    const {data} = await axios.get<SkillResponse[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.roomSkillsByClassCode}/${encodeURIComponent(classCode)}`,
        {headers: authHeaders()}
    );
    return data;
}

// ——— Background ———

export async function getBackgroundsForRoom(
    roomId: string, forceRuleTypeEnum: string | undefined
): Promise<BackgroundDto[]> {
    const {data} = await axios.get<BackgroundDto[]>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.backgrounds}`,
        {headers: authHeaders(), params: {"forceRuleType": forceRuleTypeEnum}}
    );
    return data;
}

export async function createBackground(
    roomId: string,
    body: BackgroundDto
): Promise<BackgroundDto> {
    const {data} = await axios.put<BackgroundDto>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.backgrounds}`,
        body,
        {headers: authHeaders()}
    );
    return data;
}

export async function updateBackground(
    roomId: string,
    body: BackgroundDto
): Promise<BackgroundDto> {
    const {data} = await axios.patch<BackgroundDto>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.backgrounds}`,
        body,
        {headers: authHeaders()}
    );
    return data;
}

export async function getBackgroundByCodeForRoom(
    roomId: string,
    code: string
): Promise<BackgroundDto> {
    const {data} = await axios.get<BackgroundDto>(
        `${baseUrl(roomId)}${GATEWAY_INTEGRATION_ROUTES.backgrounds}/${encodeURIComponent(code)}`,
        {headers: authHeaders()}
    );
    return data;
}

export async function setRaceHidden(id: string, hidden: boolean): Promise<RaceDto> {
    const {data} = await axios.patch<RaceDto>(
        `${apiBaseUrl()}${GATEWAY_INTEGRATION_ROUTES.roomRaces}/hidden/${encodeURIComponent(id)}`,
        null,
        {headers: authHeaders(), params: {hidden}}
    );
    return data;
}

export async function setClassHidden(id: string, hidden: boolean): Promise<ClazzDto> {
    const {data} = await axios.patch<ClazzDto>(
        `${apiBaseUrl()}${GATEWAY_INTEGRATION_ROUTES.roomClasses}/hidden/${encodeURIComponent(id)}`,
        null,
        {headers: authHeaders(), params: {hidden}}
    );
    return data;
}

export async function setBackgroundHidden(id: string, hidden: boolean): Promise<BackgroundDto> {
    const {data} = await axios.patch<BackgroundDto>(
        `${apiBaseUrl()}${GATEWAY_INTEGRATION_ROUTES.backgrounds}/hidden/${encodeURIComponent(id)}`,
        null,
        {headers: authHeaders(), params: {hidden}}
    );
    return data;
}
