import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type {
    ChargesRefillEnum,
    RefillRestRequest,
    SpellDto,
    SpellBookDto,
    SpellBookItemDto,
    SpellCellDto,
    ImportResult,
} from "@/components/models/response/MagicApi";

function baseUrl() {
    return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}`;
}

function authHeaders() {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    };
}

// ——— Spells ———

export async function listSpells(
    spellClass?: string,
    rootSpellClass?: string
): Promise<SpellDto[]> {
    const params =
        spellClass != null || rootSpellClass != null
            ? {
                  ...(spellClass != null ? { spellClass } : {}),
                  ...(rootSpellClass != null ? { rootSpellClass } : {}),
              }
            : undefined;
    const { data } = await axios.get<SpellDto[]>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spells}`,
        { headers: authHeaders(), params }
    );
    return data;
}

export async function createSpell(body: SpellDto): Promise<SpellDto> {
    const { data } = await axios.post<SpellDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spells}`,
        body,
        { headers: authHeaders() }
    );
    return data;
}

export async function importSpells(): Promise<ImportResult> {
    const { data } = await axios.post<ImportResult>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellsImport}`,
        undefined,
        { headers: authHeaders() }
    );
    return data;
}

export async function getSpellById(id: string): Promise<SpellDto> {
    const { data } = await axios.get<SpellDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spells}/${id}`,
        { headers: authHeaders() }
    );
    return data;
}

export async function updateSpell(id: string, body: SpellDto): Promise<SpellDto> {
    const { data } = await axios.put<SpellDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spells}/${id}`,
        body,
        { headers: authHeaders() }
    );
    return data;
}

export async function deleteSpell(id: string): Promise<void> {
    await axios.delete(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spells}/${id}`,
        { headers: authHeaders() }
    );
}

// ——— Spell Books ———

export async function listSpellBooks(): Promise<SpellBookDto[]> {
    const { data } = await axios.get<SpellBookDto[]>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBooks}`,
        { headers: authHeaders() }
    );
    return data;
}

export async function createSpellBook(body: SpellBookDto): Promise<SpellBookDto> {
    const { data } = await axios.post<SpellBookDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBooks}`,
        body,
        { headers: authHeaders() }
    );
    return data;
}

export async function getSpellBookByRoomAndCharacter(
    roomId: string,
    characterId: string
): Promise<SpellBookDto> {
    const { data } = await axios.get<SpellBookDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBooksByRoomCharacter}`,
        { headers: authHeaders(), params: { roomId, characterId } }
    );
    return data;
}

export async function getSpellBookById(spellBookId: string): Promise<SpellBookDto> {
    const { data } = await axios.get<SpellBookDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBooks}/${spellBookId}`,
        { headers: authHeaders() }
    );
    return data;
}

export async function updateSpellBook(
    spellBookId: string,
    body: SpellBookDto
): Promise<SpellBookDto> {
    const { data } = await axios.put<SpellBookDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBooks}/${spellBookId}`,
        body,
        { headers: authHeaders() }
    );
    return data;
}

export async function deleteSpellBook(spellBookId: string): Promise<void> {
    await axios.delete(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBooks}/${spellBookId}`,
        { headers: authHeaders() }
    );
}

export async function addSpellToBook(
    spellBookId: string,
    spellId: string
): Promise<SpellBookDto> {
    const { data } = await axios.post<SpellBookDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBooks}/${spellBookId}/spells/${spellId}`,
        undefined,
        { headers: authHeaders() }
    );
    return data;
}

export async function removeSpellFromBook(
    spellBookId: string,
    spellId: string
): Promise<SpellBookDto> {
    const { data } = await axios.delete<SpellBookDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBooks}/${spellBookId}/spells/${spellId}`,
        { headers: authHeaders() }
    );
    return data;
}

export async function setSpellInUse(
    spellBookId: string,
    spellId: string,
    inUse: boolean
): Promise<SpellBookItemDto> {
    const { data } = await axios.patch<SpellBookItemDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBooks}/${spellBookId}/spells/${spellId}/in-use`,
        undefined,
        { headers: authHeaders(), params: { inUse } }
    );
    return data;
}

export async function createSpellCellForBook(
    spellBookId: string,
    body: SpellCellDto
): Promise<SpellCellDto> {
    const { data } = await axios.post<SpellCellDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBooks}/${spellBookId}/spell-cells`,
        body,
        { headers: authHeaders() }
    );
    return data;
}

export async function refillRest(
    spellBookId: string,
    body: RefillRestRequest
): Promise<SpellBookDto> {
    const { data } = await axios.post<SpellBookDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBooks}/${spellBookId}/rest`,
        body,
        { headers: authHeaders() }
    );
    return data;
}

export async function refillRestByCharacter(
    roomId: string,
    characterId: string,
    restType: ChargesRefillEnum
): Promise<SpellBookDto> {
    const { data } = await axios.post<SpellBookDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBooksByRoomCharacter}/rest`,
        undefined,
        { headers: authHeaders(), params: { roomId, characterId, restType } }
    );
    return data;
}

// ——— Spell Book Items ———

export async function listSpellBookItems(): Promise<SpellBookItemDto[]> {
    const { data } = await axios.get<SpellBookItemDto[]>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBookItems}`,
        { headers: authHeaders() }
    );
    return data;
}

export async function createSpellBookItem(
    body: SpellBookItemDto
): Promise<SpellBookItemDto> {
    const { data } = await axios.post<SpellBookItemDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBookItems}`,
        body,
        { headers: authHeaders() }
    );
    return data;
}

export async function getSpellBookItemById(id: string): Promise<SpellBookItemDto> {
    const { data } = await axios.get<SpellBookItemDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBookItems}/${id}`,
        { headers: authHeaders() }
    );
    return data;
}

export async function updateSpellBookItem(
    id: string,
    body: SpellBookItemDto
): Promise<SpellBookItemDto> {
    const { data } = await axios.put<SpellBookItemDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBookItems}/${id}`,
        body,
        { headers: authHeaders() }
    );
    return data;
}

export async function deleteSpellBookItem(id: string): Promise<void> {
    await axios.delete(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBookItems}/${id}`,
        { headers: authHeaders() }
    );
}

export async function setSpellBookItemInUse(
    id: string,
    inUse: boolean
): Promise<SpellBookItemDto> {
    const { data } = await axios.patch<SpellBookItemDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellBookItems}/${id}/in-use`,
        undefined,
        { headers: authHeaders(), params: { inUse } }
    );
    return data;
}

// ——— Spell Cells ———

export async function listSpellCells(): Promise<SpellCellDto[]> {
    const { data } = await axios.get<SpellCellDto[]>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellCells}`,
        { headers: authHeaders() }
    );
    return data;
}

export async function createSpellCell(body: SpellCellDto): Promise<SpellCellDto> {
    const { data } = await axios.post<SpellCellDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellCells}`,
        body,
        { headers: authHeaders() }
    );
    return data;
}

export async function getSpellCellById(id: string): Promise<SpellCellDto> {
    const { data } = await axios.get<SpellCellDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellCells}/${id}`,
        { headers: authHeaders() }
    );
    return data;
}

export async function updateSpellCell(
    id: string,
    body: SpellCellDto
): Promise<SpellCellDto> {
    const { data } = await axios.put<SpellCellDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellCells}/${id}`,
        body,
        { headers: authHeaders() }
    );
    return data;
}

export async function deleteSpellCell(id: string): Promise<void> {
    await axios.delete(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellCells}/${id}`,
        { headers: authHeaders() }
    );
}

/** Use one charge from spell cell (currentCount - 1). Returns 400 if no charges left. */
export async function useSpellCell(id: string): Promise<SpellCellDto> {
    const { data } = await axios.post<SpellCellDto>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.spellCells}/${id}/use`,
        undefined,
        { headers: authHeaders() }
    );
    return data;
}
