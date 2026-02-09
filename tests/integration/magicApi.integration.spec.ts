/**
 * Real integration tests for Magic API client.
 * Requires backend running and VITE_TEST_ACCESS_TOKEN set.
 * importSpells is excluded (mutates external TTG data).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
    listSpells,
    createSpell,
    getSpellById,
    updateSpell,
    deleteSpell,
    listSpellBooks,
    createSpellBook,
    getSpellBookByRoomAndCharacter,
    getSpellBookById,
    updateSpellBook,
    deleteSpellBook,
    addSpellToBook,
    removeSpellFromBook,
    setSpellInUse,
    listSpellBookItems,
    createSpellBookItem,
    getSpellBookItemById,
    updateSpellBookItem,
    deleteSpellBookItem,
    setSpellBookItemInUse,
    listSpellCells,
    createSpellCell,
    getSpellCellById,
    updateSpellCell,
    deleteSpellCell,
} from "@/api/magicApi";
import type { SpellDto, SpellBookDto, SpellBookItemDto, SpellCellDto } from "@/components/models/response/MagicApi";

const hasToken = typeof process.env.VITE_TEST_ACCESS_TOKEN === "string" && process.env.VITE_TEST_ACCESS_TOKEN.length > 0;

beforeAll(() => {
    if (hasToken) {
        const token = process.env.VITE_TEST_ACCESS_TOKEN!;
        const storage: Storage = {
            getItem: (key: string) => (key === "accessToken" ? token : null),
            setItem: () => {},
            removeItem: () => {},
            clear: () => {},
            key: () => null,
            length: 0,
        };
        Object.defineProperty(globalThis, "localStorage", { value: storage, writable: true });
    }
});

describe.skipIf(!hasToken)(
    "Magic API client (real HTTP). Set VITE_TEST_ACCESS_TOKEN and run backend to run these tests.",
    () => {
    describe("Spells", () => {
        it("listSpells returns an array", async () => {
            const result = await listSpells();
            expect(Array.isArray(result)).toBe(true);
        });

        it("listSpells with spellClass returns an array", async () => {
            const result = await listSpells("WIZARD");
            expect(Array.isArray(result)).toBe(true);
        });

        it.skip("importSpells - excluded from real tests (mutates TTG import)", async () => {
            // importSpells() not run in real tests
        });

        it("createSpell, getSpellById, updateSpell, deleteSpell round-trip", async () => {
            const createBody: SpellDto = {
                name: { en: "Integration Test Spell" },
                level: "0",
                spellClass: "WIZARD",
            };
            const created = await createSpell(createBody);
            expect(created).toBeDefined();
            expect(created.id).toBeDefined();

            const fetched = await getSpellById(created.id!);
            expect(fetched).toBeDefined();
            expect(fetched.id).toBe(created.id);

            const updated = await updateSpell(created.id!, { ...fetched, level: "1" });
            expect(updated).toBeDefined();
            expect(updated.level).toBe("1");

            await deleteSpell(created.id!);
            await expect(getSpellById(created.id!)).rejects.toThrow();
        });
    });

    describe("Spell Books", () => {
        it("listSpellBooks returns an array", async () => {
            const result = await listSpellBooks();
            expect(Array.isArray(result)).toBe(true);
        });

        it("getSpellBookByRoomAndCharacter returns spell book or throws", async () => {
            const roomId = "00000000-0000-0000-0000-000000000001";
            const characterId = "00000000-0000-0000-0000-000000000002";
            try {
                const result = await getSpellBookByRoomAndCharacter(roomId, characterId);
                expect(result).toBeDefined();
                expect(typeof result.id).toBe("string");
            } catch (e: unknown) {
                expect(e).toBeDefined();
            }
        });

        it("createSpellBook, getSpellBookById, updateSpellBook, deleteSpellBook round-trip", async () => {
            const createBody: SpellBookDto = {
                characterId: "00000000-0000-0000-0000-000000000002",
                roomId: "00000000-0000-0000-0000-000000000001",
                manaMax: 10,
                manaCurrent: 10,
            };
            const created = await createSpellBook(createBody);
            expect(created).toBeDefined();
            expect(created.id).toBeDefined();

            const fetched = await getSpellBookById(created.id!);
            expect(fetched).toBeDefined();
            expect(fetched.id).toBe(created.id);

            const updated = await updateSpellBook(created.id!, { ...fetched, manaMax: 20 });
            expect(updated).toBeDefined();
            expect(updated.manaMax).toBe(20);

            await deleteSpellBook(created.id!);
            await expect(getSpellBookById(created.id!)).rejects.toThrow();
        });
    });

    describe("Spell Books – add/remove spell and in-use", () => {
        let spellId: string;
        let bookId: string;

        beforeAll(async () => {
            const spell = await createSpell({
                name: { en: "Helper Spell for Book" },
                level: "0",
                spellClass: "WIZARD",
            });
            spellId = spell.id!;
            const book = await createSpellBook({
                characterId: "00000000-0000-0000-0000-000000000002",
                roomId: "00000000-0000-0000-0000-000000000001",
                manaMax: 10,
                manaCurrent: 10,
            });
            bookId = book.id!;
        });

        afterEach(async () => {
            try {
                await removeSpellFromBook(bookId, spellId);
            } catch {
                // ignore if not in book
            }
        });

        afterAll(async () => {
            try {
                await deleteSpellBook(bookId);
                await deleteSpell(spellId);
            } catch {
                // ignore cleanup errors
            }
        });

        it("addSpellToBook and removeSpellFromBook", async () => {
            const afterAdd = await addSpellToBook(bookId, spellId);
            expect(afterAdd).toBeDefined();
            expect(Array.isArray(afterAdd.spells)).toBe(true);
            const hasSpell = afterAdd.spells?.some((s) => s.spellId === spellId);
            expect(hasSpell).toBe(true);

            const afterRemove = await removeSpellFromBook(bookId, spellId);
            expect(afterRemove).toBeDefined();
            const stillHasSpell = afterRemove.spells?.some((s) => s.spellId === spellId);
            expect(stillHasSpell).toBe(false);
        });

        it("setSpellInUse", async () => {
            await addSpellToBook(bookId, spellId);
            const item = await setSpellInUse(bookId, spellId, true);
            expect(item).toBeDefined();
            expect(item.inUse).toBe(true);
            await setSpellInUse(bookId, spellId, false);
        });
    });

    describe("Spell Book Items", () => {
        it("listSpellBookItems returns an array", async () => {
            const result = await listSpellBookItems();
            expect(Array.isArray(result)).toBe(true);
        });

        it("createSpellBookItem, getSpellBookItemById, updateSpellBookItem, deleteSpellBookItem round-trip", async () => {
            const spell = await createSpell({
                name: { en: "Item Test Spell" },
                level: "0",
                spellClass: "WIZARD",
            });
            const book = await createSpellBook({
                characterId: "00000000-0000-0000-0000-000000000002",
                roomId: "00000000-0000-0000-0000-000000000001",
                manaMax: 10,
                manaCurrent: 10,
            });
            const createBody: SpellBookItemDto = {
                spellBookId: book.id!,
                spellId: spell.id!,
                inUse: false,
            };
            const created = await createSpellBookItem(createBody);
            expect(created).toBeDefined();
            expect(created.id).toBeDefined();

            const fetched = await getSpellBookItemById(created.id!);
            expect(fetched).toBeDefined();
            expect(fetched.id).toBe(created.id);

            const updated = await updateSpellBookItem(created.id!, { ...fetched, inUse: true });
            expect(updated).toBeDefined();
            expect(updated.inUse).toBe(true);

            await deleteSpellBookItem(created.id!);
            await deleteSpellBook(book.id!);
            await deleteSpell(spell.id!);
            await expect(getSpellBookItemById(created.id!)).rejects.toThrow();
        });

        it("setSpellBookItemInUse", async () => {
            const spell = await createSpell({
                name: { en: "InUse Test Spell" },
                level: "0",
                spellClass: "WIZARD",
            });
            const book = await createSpellBook({
                characterId: "00000000-0000-0000-0000-000000000002",
                roomId: "00000000-0000-0000-0000-000000000001",
                manaMax: 10,
                manaCurrent: 10,
            });
            const item = await createSpellBookItem({
                spellBookId: book.id!,
                spellId: spell.id!,
                inUse: false,
            });
            const updated = await setSpellBookItemInUse(item.id!, true);
            expect(updated).toBeDefined();
            expect(updated.inUse).toBe(true);
            await deleteSpellBookItem(item.id!);
            await deleteSpellBook(book.id!);
            await deleteSpell(spell.id!);
        });
    });

    describe("Spell Cells", () => {
        it("listSpellCells returns an array", async () => {
            const result = await listSpellCells();
            expect(Array.isArray(result)).toBe(true);
        });

        it("createSpellCell, getSpellCellById, updateSpellCell, deleteSpellCell round-trip", async () => {
            const book = await createSpellBook({
                characterId: "00000000-0000-0000-0000-000000000002",
                roomId: "00000000-0000-0000-0000-000000000001",
                manaMax: 10,
                manaCurrent: 10,
            });
            const createBody: SpellCellDto = {
                spellBookId: book.id!,
                level: 1,
                maxCount: 4,
                currentCount: 4,
                refillRestType: "LONG_REST",
            };
            const created = await createSpellCell(createBody);
            expect(created).toBeDefined();
            expect(created.id).toBeDefined();

            const fetched = await getSpellCellById(created.id!);
            expect(fetched).toBeDefined();
            expect(fetched.id).toBe(created.id);

            const updated = await updateSpellCell(created.id!, { ...fetched, currentCount: 2 });
            expect(updated).toBeDefined();
            expect(updated.currentCount).toBe(2);

            await deleteSpellCell(created.id!);
            await deleteSpellBook(book.id!);
            await expect(getSpellCellById(created.id!)).rejects.toThrow();
        });
    });
});
