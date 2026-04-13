<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { PetSkillDto } from "@/api/petsApi.types";

const props = defineProps<{ skills: PetSkillDto[] }>();

const newName = ref("");
const newDescription = ref("");
const editById = reactive<Record<string, { name: string; description: string }>>({});

watch(
  () => props.skills,
  (skills) => {
    skills.forEach((skill) => {
      editById[skill.id] = {
        name: skill.name ?? "",
        description: skill.description ?? "",
      };
    });
  },
  { immediate: true, deep: true }
);

const emit = defineEmits<{
  (e: "create", payload: { name: string; description: string }): void;
  (e: "update", skillId: string, payload: { name: string; description: string }): void;
  (e: "delete", skillId: string): void;
}>();

const createSkill = () => {
  emit("create", { name: newName.value, description: newDescription.value });
  newName.value = "";
  newDescription.value = "";
};
</script>

<template>
  <section class="traits-body">
    <h1 class="sectionHeader">Навыки питомца</h1>
    <div class="section create">
      <input v-model="newName" placeholder="Название навыка" />
      <textarea v-model="newDescription" placeholder="Описание навыка" />
      <button type="button" @click="createSkill">Добавить</button>
    </div>
    <div v-for="skill in skills" :key="skill.id" class="section skill-row">
      <div class="trait-header">
        <div class="trait-name">{{ skill.name }}</div>
      </div>
      <div class="edit-grid">
        <input v-model="editById[skill.id].name" placeholder="Название" />
        <textarea v-model="editById[skill.id].description" placeholder="Описание" />
      </div>
      <div class="actions">
        <button type="button" @click="emit('update', skill.id, editById[skill.id])">
          Обновить
        </button>
        <button type="button" class="danger" @click="emit('delete', skill.id)">Удалить</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.traits-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sectionHeader {
  color: var(--ion-color-light);
  font-size: 22px;
  font-weight: normal;
  margin: 8px 0 4px;
}
.section {
  background-color: var(--ion-color-medium);
  border-radius: 20px;
  padding: 10px;
  overflow: hidden;
}
.create { display: grid; grid-template-columns: 1fr; gap: 8px; }
.skill-row { display: grid; gap: 8px; }
.trait-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.trait-name {
  font-size: 16px;
  font-weight: bold;
}
.edit-grid { display: grid; gap: 8px; }
.actions { display: flex; gap: 8px; }
input, textarea { background: var(--ion-color-dark); color: var(--ion-color-light); border: 1px solid rgba(var(--ion-color-primary-rgb), 0.6); border-radius: 10px; padding: 10px; min-height: 40px; }
textarea { min-height: 72px; resize: vertical; }
button { border: none; border-radius: 10px; background: var(--ion-color-primary); color: var(--ion-color-primary-contrast); padding: 10px; font-weight: 600; min-height: 40px; transition: transform 0.12s ease; }
button:active { transform: scale(0.99); }
.danger { background: var(--ion-color-danger); color: var(--ion-color-light); }
@media (min-width: 768px) {
  .create {
    grid-template-columns: 1fr;
  }
  .skill-row {
    gap: 10px;
  }
}
</style>
