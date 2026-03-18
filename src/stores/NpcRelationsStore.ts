import { defineStore } from "pinia";
import { getNpcsByCharacterIdAndRelationTypeForRoom } from "@/api/npcApi";
import type { NpcDto, RelationTypeEnum } from "@/api/npcApi.types";

type NpcRelationsState = {
  byType: Record<RelationTypeEnum, NpcDto[]>;
  loading: boolean;
};

const EMPTY_BY_TYPE: Record<RelationTypeEnum, NpcDto[]> = {
  FRIEND: [],
  ENEMY: [],
  RULER: [],
  PET: [],
  OTHER: [],
};

export const useNpcRelationsStore = defineStore("npcRelationsStore", {
  state: (): NpcRelationsState => ({
    byType: { ...EMPTY_BY_TYPE },
    loading: false,
  }),
  actions: {
    async loadAll(roomId: string, characterId: string) {
      this.loading = true;
      try {
        const types: RelationTypeEnum[] = ["FRIEND", "ENEMY", "RULER", "PET", "OTHER"];
        const entries = await Promise.all(
          types.map(
            async (t) =>
              [t, await getNpcsByCharacterIdAndRelationTypeForRoom(roomId, characterId, t)] as const
          )
        );
        const next: Record<RelationTypeEnum, NpcDto[]> = { ...EMPTY_BY_TYPE };
        for (const [k, v] of entries) next[k] = v;
        this.byType = next;
      } catch (e) {
        console.error("Failed to load NPC relations:", e);
        this.byType = { ...EMPTY_BY_TYPE };
      } finally {
        this.loading = false;
      }
    },
  },
});


