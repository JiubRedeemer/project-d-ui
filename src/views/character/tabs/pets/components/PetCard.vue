<script setup lang="ts">
import type { PetDto } from "@/api/petsApi.types";

defineProps<{
  pet: PetDto;
  selected: boolean;
}>();

const emit = defineEmits<{
  (e: "select"): void;
  (e: "delete"): void;
}>();
</script>

<template>
  <article class="pet-card" :class="{ selected }" @click="emit('select')">
    <div class="pet-card__head">
      <h3>{{ pet.name }}</h3>
      <button class="pet-card__delete" type="button" @click.stop="emit('delete')">Удалить</button>
    </div>
    <p class="pet-card__meta">
      HP: {{ pet.currentHp ?? 0 }}/{{ pet.maxHp ?? 1 }}
    </p>
    <div class="pet-card__foot">
      <span class="pet-type">{{ pet.creatureType || "Тип не указан" }}</span>
      <span class="pet-status" :class="{ active: pet.isActive }">{{ pet.isActive ? "Активен" : "Не активен" }}</span>
    </div>
  </article>
</template>

<style scoped>
.pet-card {
  background: rgba(var(--ion-color-medium-rgb), 0.9);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.15);
  border-radius: 14px;
  padding: 12px;
  cursor: pointer;
  min-height: 104px;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.pet-card:active {
  transform: scale(0.99);
}
.pet-card.selected {
  border-color: var(--ion-color-primary);
}
.pet-card__head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.pet-card__head h3 {
  margin: 0;
  font-size: 16px;
  line-height: 1.25;
}
.pet-card__delete {
  border: none;
  border-radius: 10px;
  background: rgba(var(--ion-color-danger-rgb), 0.9);
  color: var(--ion-color-light);
  padding: 8px 10px;
  min-height: 40px;
}
.pet-card__meta {
  margin: 6px 0 0;
  font-size: 14px;
}
.pet-card__foot {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.pet-type, .pet-status {
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 999px;
  background: rgba(var(--ion-color-dark-rgb), 0.5);
}
.pet-status.active {
  background: rgba(var(--ion-color-success-rgb), 0.25);
}
</style>
