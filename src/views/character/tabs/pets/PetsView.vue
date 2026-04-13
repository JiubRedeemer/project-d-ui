<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import PetCard from "@/views/character/tabs/pets/components/PetCard.vue";
import PetProfileForm from "@/views/character/tabs/pets/components/PetProfileForm.vue";
import PetHpPanel from "@/views/character/tabs/pets/components/PetHpPanel.vue";
import PetAbilitiesEditor from "@/views/character/tabs/pets/components/PetAbilitiesEditor.vue";
import PetSkillsEditor from "@/views/character/tabs/pets/components/PetSkillsEditor.vue";
import { usePetsStore } from "@/stores/PetsStore";
import type {
  CreatePetRequest,
  PetHealthCurrentUpdateType,
  PetProfileUpdateRequest,
  PetSkillRequest,
} from "@/api/petsApi.types";

const route = useRoute();
const petsStore = usePetsStore();

const roomId = computed(() => String(route.params.roomId));
const characterId = computed(() => String(route.params.characterId));
const newPetName = ref("");
const activeSubtab = ref<"list" | "profile" | "combat" | "skills">("list");
const subtabs = [
  { key: "list", label: "Список" },
  { key: "profile", label: "Профиль" },
  { key: "combat", label: "Бой" },
  { key: "skills", label: "Навыки" },
] as const;

const loadPets = async () => {
  await petsStore.fetchPets(roomId.value, characterId.value);
};

onMounted(loadPets);

const createPet = async () => {
  const payload: CreatePetRequest = {
    name: newPetName.value.trim(),
    abilities: ["STR", "DEX", "CON", "INT", "WIS", "CHA"].map((code) => ({ abilityCode: code, bonusValue: 0 })),
    maxHp: 1,
    currentHp: 1,
    isActive: true,
  };
  if (!payload.name) return;
  await petsStore.createPet(roomId.value, characterId.value, payload);
  newPetName.value = "";
};

const selectedPet = computed(() => petsStore.selectedPet);

const onDeletePet = async (petId: string) => {
  const confirmed = window.confirm("Удалить питомца?");
  if (!confirmed) return;
  await petsStore.deletePetLogical(roomId.value, characterId.value, petId);
};

const onSaveProfile = async (payload: PetProfileUpdateRequest) => {
  if (!selectedPet.value) return;
  await petsStore.updateProfile(roomId.value, characterId.value, selectedPet.value.id, payload);
};

const onUpdateCurrentHp = async (type: PetHealthCurrentUpdateType, value: number) => {
  if (!selectedPet.value) return;
  await petsStore.updateCurrentHp(roomId.value, characterId.value, selectedPet.value.id, { type, value });
};

const onUpdateMaxHp = async (value: number) => {
  if (!selectedPet.value) return;
  await petsStore.updateMaxHp(roomId.value, characterId.value, selectedPet.value.id, { bonusValue: value });
};

const onUpdateAbility = async (abilityCode: string, bonusValue: number) => {
  if (!selectedPet.value) return;
  await petsStore.updateAbilityBonus(roomId.value, characterId.value, selectedPet.value.id, abilityCode, { bonusValue });
};

const onCreateSkill = async (payload: PetSkillRequest) => {
  if (!selectedPet.value || !payload.name?.trim()) return;
  await petsStore.createSkill(roomId.value, characterId.value, selectedPet.value.id, payload);
};

const onUpdateSkill = async (skillId: string, payload: PetSkillRequest) => {
  if (!selectedPet.value || !payload.name?.trim()) return;
  await petsStore.updateSkill(roomId.value, characterId.value, selectedPet.value.id, skillId, payload);
};

const onDeleteSkill = async (skillId: string) => {
  if (!selectedPet.value) return;
  await petsStore.deleteSkill(roomId.value, characterId.value, selectedPet.value.id, skillId);
};

const selectPetAndOpen = (petId: string) => {
  petsStore.selectPet(petId);
  activeSubtab.value = "profile";
};
</script>

<template>
  <div class="pets-view">
    <section class="section-card">
      <h2 class="section-title">Питомцы</h2>
      <div class="new-pet">
        <input v-model="newPetName" placeholder="Имя питомца" maxlength="80" />
        <button type="button" @click="createPet">Создать</button>
      </div>
      <div class="subtabs" role="tablist" aria-label="Подвкладки питомцев">
        <button
          v-for="tab in subtabs"
          :key="tab.key"
          type="button"
          class="subtab-btn"
          :class="{ active: activeSubtab === tab.key }"
          @click="activeSubtab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <transition name="subtab-fade" mode="out-in">
      <section v-if="activeSubtab === 'list'" key="list" class="section-card tab-pane">
        <p v-if="petsStore.loading" class="state-line">Загрузка...</p>
        <p v-else-if="petsStore.pets.length === 0" class="empty-state">Нет питомцев. Создайте первого, чтобы начать.</p>
        <div v-else class="pet-cards">
          <PetCard
            v-for="pet in petsStore.pets"
            :key="pet.id"
            :pet="pet"
            :selected="pet.id === petsStore.selectedPetId"
            @select="selectPetAndOpen(pet.id)"
            @delete="onDeletePet(pet.id)"
          />
        </div>
      </section>
      <section v-else-if="activeSubtab === 'profile'" key="profile" class="section-card tab-pane">
        <p v-if="!selectedPet" class="state-line">Сначала выберите питомца во вкладке «Список».</p>
        <PetProfileForm
          v-else
          :pet="selectedPet"
          @save="onSaveProfile"
        />
      </section>
      <section v-else-if="activeSubtab === 'combat'" key="combat" class="section-card tab-pane">
        <p v-if="!selectedPet" class="state-line">Сначала выберите питомца во вкладке «Список».</p>
        <template v-else>
          <PetHpPanel :pet="selectedPet" @current="onUpdateCurrentHp" @max="onUpdateMaxHp" />
          <PetAbilitiesEditor :pet="selectedPet" @save="onUpdateAbility" />
        </template>
      </section>
      <section v-else key="skills" class="section-card tab-pane">
        <p v-if="!selectedPet" class="state-line">Сначала выберите питомца во вкладке «Список».</p>
        <PetSkillsEditor
          v-else
          :skills="selectedPet.skills ?? []"
          @create="onCreateSkill"
          @update="onUpdateSkill"
          @delete="onDeleteSkill"
        />
      </section>
    </transition>

    <section v-if="petsStore.error" class="section-card error-card">
      <p class="error-text">{{ petsStore.error }}</p>
    </section>
  </div>
</template>

<style scoped>
.pets-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.section-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(var(--ion-color-medium-rgb), 0.45);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  border-radius: 14px;
  padding: 12px;
}
.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.new-pet {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}
.subtabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.subtabs::-webkit-scrollbar {
  display: none;
}
.subtab-btn {
  white-space: nowrap;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.35);
  border-radius: 999px;
  background: rgba(var(--ion-color-dark-rgb), 0.35);
  color: var(--ion-color-light);
  padding: 8px 12px;
  font-size: 14px;
  min-height: 40px;
}
.subtab-btn.active {
  border-color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.2);
}
.pet-cards {
  display: grid;
  gap: 8px;
}
.empty-state {
  margin: 0;
  color: rgba(var(--ion-color-light-rgb), 0.75);
  font-size: 14px;
}
input {
  background: var(--ion-color-dark);
  color: var(--ion-color-light);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.6);
  border-radius: 10px;
  padding: 10px;
}
button {
  border: none;
  border-radius: 10px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  padding: 10px 12px;
  font-weight: 600;
  min-height: 40px;
}
.state-line {
  margin: 0;
  font-size: 14px;
  color: rgba(var(--ion-color-light-rgb), 0.86);
}
.tab-pane {
  gap: 12px;
}
.error-card {
  border-color: rgba(var(--ion-color-danger-rgb), 0.45);
}
.error-text {
  margin: 0;
  color: var(--ion-color-danger);
}
.subtab-fade-enter-active,
.subtab-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.subtab-fade-enter-from,
.subtab-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
@media (max-width: 1023px) {
  .pets-view { grid-template-columns: 1fr; }
}
@media (min-width: 1024px) {
  .section-card {
    padding: 14px;
  }
}
</style>
