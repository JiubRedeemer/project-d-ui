import { defineStore } from "pinia";
import type { SpellBookDto, SpellDto } from "@/components/models/response/MagicApi";
import {
    getSpellBookByRoomAndCharacter,
} from "@/api/magicApi";

export const useMagicStore = defineStore("magicStore", {
    state: () => ({
        spellBook: null as SpellBookDto | null,
        editingSpell: null as SpellDto | null,
    }),
    actions: {
        async updateSpellBookInStore(roomId: string, characterId: string): Promise<void> {
            try {
                this.spellBook = await getSpellBookByRoomAndCharacter(
                    roomId,
                    characterId
                );
            } catch (error) {
                console.error("Failed to load spell book:", error);
                this.spellBook = null;
            }
        },
        setSpellBook(spellBook: SpellBookDto | null) {
            this.spellBook = spellBook;
        },
        setEditingSpell(spell: SpellDto | null) {
            this.editingSpell = spell;
        },
    },
});
