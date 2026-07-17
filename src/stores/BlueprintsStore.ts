import { defineStore } from "pinia";
import { getBlueprintsForCharacter } from "@/api/blueprintApi";
import type { BlueprintDto } from "@/api/blueprintApi.types";

type BlueprintsState = {
  blueprints: BlueprintDto[];
  loading: boolean;
  loadedForCharacterId: string | null;
};

export const useBlueprintsStore = defineStore("blueprintsStore", {
  state: (): BlueprintsState => ({
    blueprints: [],
    loading: false,
    loadedForCharacterId: null,
  }),
  getters: {
    /** Есть ли у персонажа доступные чертежи — от этого зависит показ подвкладки. */
    hasBlueprints: (state): boolean => state.blueprints.length > 0,
  },
  actions: {
    async loadForCharacter(roomId: string, characterId: string) {
      this.loading = true;
      try {
        this.blueprints = await getBlueprintsForCharacter(roomId, characterId);
        this.loadedForCharacterId = characterId;
      } catch (e) {
        console.error("Failed to load blueprints:", e);
        this.blueprints = [];
      } finally {
        this.loading = false;
      }
    },
    reset() {
      this.blueprints = [];
      this.loadedForCharacterId = null;
    },
  },
});
