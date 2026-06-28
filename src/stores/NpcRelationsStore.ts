import { defineStore } from "pinia";
import { getNpcsByCharacterIdAndRelationTypeForRoom } from "@/api/npcApi";
import type { NpcWithRelationIdDto, RelationTypeEnum } from "@/api/npcApi.types";
import { sortNpcsByName } from "@/utils/sortNpcsByName";

type NpcRelationsState = {
  byType: Record<RelationTypeEnum, NpcWithRelationIdDto[]>;
  loading: boolean;
};

const EMPTY_BY_TYPE: Record<RelationTypeEnum, NpcWithRelationIdDto[]> = {
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
  persist: {
    pick: ['byType'],
  },
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
        for (const [k, v] of entries) {
          this.byType[k] = sortNpcsByName(v);
        }
      } catch (e) {
        console.error("Failed to load NPC relations:", e);
        for (const k of Object.keys(EMPTY_BY_TYPE) as RelationTypeEnum[]) {
          this.byType[k] = [];
        }
      } finally {
        this.loading = false;
      }
    },
  },
});


