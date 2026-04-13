import { defineStore } from "pinia";
import {
  createPetForRoom,
  createPetSkillForRoom,
  deletePetLogicalByIdForRoom,
  deletePetSkillForRoom,
  getPetsByCharacterIdForRoom,
  updatePetAbilityBonusForRoom,
  updatePetCurrentHpForRoom,
  updatePetMaxHpForRoom,
  updatePetProfileForRoom,
  updatePetSkillForRoom,
} from "@/api/petsApi";
import type {
  BonusValueUpdateRequest,
  CreatePetRequest,
  PetDto,
  PetHealthCurrentUpdateRequest,
  PetProfileUpdateRequest,
  PetSkillDto,
  PetSkillRequest,
} from "@/api/petsApi.types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const usePetsStore = defineStore("petsStore", {
  state: () => ({
    pets: [] as PetDto[],
    selectedPetId: null as string | null,
    loading: false,
    error: null as string | null,
  }),
  getters: {
    selectedPet: (state): PetDto | null => state.pets.find((pet) => pet.id === state.selectedPetId) ?? null,
  },
  actions: {
    setError(error: unknown) {
      this.error = error instanceof Error ? error.message : "Unknown pets error";
    },
    selectPet(petId: string | null) {
      this.selectedPetId = petId;
    },
    upsertPet(pet: PetDto) {
      const index = this.pets.findIndex((item) => item.id === pet.id);
      if (index === -1) {
        this.pets.push(pet);
        return;
      }
      this.pets[index] = pet;
    },
    async fetchPets(roomId: string, characterId: string): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        this.pets = await getPetsByCharacterIdForRoom(roomId, characterId);
        if (!this.selectedPetId || !this.pets.some((pet) => pet.id === this.selectedPetId)) {
          this.selectedPetId = this.pets[0]?.id ?? null;
        }
      } catch (error) {
        this.setError(error);
        this.pets = [];
        this.selectedPetId = null;
      } finally {
        this.loading = false;
      }
    },
    async createPet(roomId: string, characterId: string, payload: CreatePetRequest): Promise<PetDto | null> {
      this.error = null;
      try {
        const pet = await createPetForRoom(roomId, characterId, payload);
        this.pets.push(pet);
        this.selectedPetId = pet.id;
        return pet;
      } catch (error) {
        this.setError(error);
        return null;
      }
    },
    async deletePetLogical(roomId: string, characterId: string, petId: string): Promise<boolean> {
      this.error = null;
      try {
        await deletePetLogicalByIdForRoom(roomId, characterId, petId);
        this.pets = this.pets.filter((pet) => pet.id !== petId);
        if (this.selectedPetId === petId) {
          this.selectedPetId = this.pets[0]?.id ?? null;
        }
        return true;
      } catch (error) {
        this.setError(error);
        return false;
      }
    },
    async updateProfile(roomId: string, characterId: string, petId: string, payload: PetProfileUpdateRequest): Promise<boolean> {
      this.error = null;
      try {
        await updatePetProfileForRoom(roomId, characterId, petId, payload);
        const pet = this.pets.find((item) => item.id === petId);
        if (pet) {
          Object.assign(pet, payload);
        }
        return true;
      } catch (error) {
        this.setError(error);
        return false;
      }
    },
    async updateCurrentHp(roomId: string, characterId: string, petId: string, payload: PetHealthCurrentUpdateRequest): Promise<boolean> {
      if (payload.value < 0) {
        this.error = "HP value must be non-negative";
        return false;
      }

      this.error = null;
      try {
        await updatePetCurrentHpForRoom(roomId, characterId, petId, payload);
        const pet = this.pets.find((item) => item.id === petId);
        if (!pet) return true;

        const currentHp = pet.currentHp ?? 0;
        const maxHp = Math.max(1, pet.maxHp ?? 1);
        const nextValue =
          payload.type === "ADD"
            ? currentHp + payload.value
            : payload.type === "SUBTRACT"
              ? currentHp - payload.value
              : payload.value;

        pet.currentHp = clamp(nextValue, 0, maxHp);
        return true;
      } catch (error) {
        this.setError(error);
        return false;
      }
    },
    async updateMaxHp(roomId: string, characterId: string, petId: string, payload: BonusValueUpdateRequest): Promise<boolean> {
      if (payload.bonusValue < 1) {
        this.error = "Max HP must be at least 1";
        return false;
      }

      this.error = null;
      try {
        await updatePetMaxHpForRoom(roomId, characterId, petId, payload);
        const pet = this.pets.find((item) => item.id === petId);
        if (pet) {
          pet.maxHp = payload.bonusValue;
          pet.currentHp = clamp(pet.currentHp ?? 0, 0, payload.bonusValue);
        }
        return true;
      } catch (error) {
        this.setError(error);
        return false;
      }
    },
    async updateAbilityBonus(
      roomId: string,
      characterId: string,
      petId: string,
      abilityCode: string,
      payload: BonusValueUpdateRequest
    ): Promise<boolean> {
      this.error = null;
      try {
        await updatePetAbilityBonusForRoom(roomId, characterId, petId, abilityCode, payload);
        const pet = this.pets.find((item) => item.id === petId);
        if (!pet) return true;

        const abilities = pet.abilities ?? [];
        const index = abilities.findIndex((ability) => ability.abilityCode === abilityCode);
        if (index === -1) {
          abilities.push({
            id: `${petId}-${abilityCode}`,
            petId,
            abilityCode,
            bonusValue: payload.bonusValue,
          });
        } else {
          abilities[index].bonusValue = payload.bonusValue;
        }
        pet.abilities = abilities;
        return true;
      } catch (error) {
        this.setError(error);
        return false;
      }
    },
    async createSkill(roomId: string, characterId: string, petId: string, payload: PetSkillRequest): Promise<PetSkillDto | null> {
      this.error = null;
      try {
        const created = await createPetSkillForRoom(roomId, characterId, petId, payload);
        const pet = this.pets.find((item) => item.id === petId);
        if (pet) {
          pet.skills = [...(pet.skills ?? []), created];
        }
        return created;
      } catch (error) {
        this.setError(error);
        return null;
      }
    },
    async updateSkill(
      roomId: string,
      characterId: string,
      petId: string,
      skillId: string,
      payload: PetSkillRequest
    ): Promise<PetSkillDto | null> {
      this.error = null;
      try {
        const updated = await updatePetSkillForRoom(roomId, characterId, petId, skillId, payload);
        const pet = this.pets.find((item) => item.id === petId);
        if (pet?.skills) {
          pet.skills = pet.skills.map((skill) => (skill.id === skillId ? updated : skill));
        }
        return updated;
      } catch (error) {
        this.setError(error);
        return null;
      }
    },
    async deleteSkill(roomId: string, characterId: string, petId: string, skillId: string): Promise<boolean> {
      this.error = null;
      try {
        await deletePetSkillForRoom(roomId, characterId, petId, skillId);
        const pet = this.pets.find((item) => item.id === petId);
        if (pet?.skills) {
          pet.skills = pet.skills.filter((skill) => skill.id !== skillId);
        }
        return true;
      } catch (error) {
        this.setError(error);
        return false;
      }
    },
  },
});
