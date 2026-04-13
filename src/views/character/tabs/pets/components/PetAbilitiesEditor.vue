<script setup lang="ts">
import { reactive, watch } from "vue";
import type { PetDto } from "@/api/petsApi.types";

const ABILITY_CODES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

const props = defineProps<{ pet: PetDto }>();
const values = reactive<Record<string, number>>({});

const syncValues = () => {
  ABILITY_CODES.forEach((code) => {
    values[code] = props.pet.abilities?.find((ability) => ability.abilityCode === code)?.bonusValue ?? 0;
  });
};
syncValues();
watch(() => props.pet.id, syncValues);

const emit = defineEmits<{
  (e: "save", abilityCode: string, bonusValue: number): void;
}>();
</script>

<template>
  <section class="abilities-body">
    <h1 class="sectionHeader">Характеристики питомца</h1>
    <div v-for="code in ABILITY_CODES" :key="code" class="section ability-row">
      <div class="ability-left">
        <span class="ability-code">{{ code }}</span>
      </div>
      <div class="ability-right">
        <input v-model.number="values[code]" type="number" />
        <button type="button" @click="emit('save', code, Number(values[code]) || 0)">Сохранить</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.abilities-body {
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
  border-radius: 15px;
  padding: 10px;
}
.ability-row {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 10px;
  align-items: center;
}
.ability-left {
  display: flex;
  justify-content: center;
}
.ability-right {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}
.ability-code {
  text-align: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
input {
  background: var(--ion-color-dark);
  color: var(--ion-color-light);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.6);
  border-radius: 10px;
  padding: 10px;
  min-height: 40px;
}
button { border: none; border-radius: 10px; background: var(--ion-color-primary); color: var(--ion-color-primary-contrast); padding: 10px; font-weight: 600; min-height: 40px; transition: transform 0.12s ease; }
button:active { transform: scale(0.99); }
@media (max-width: 480px) {
  .ability-row {
    grid-template-columns: 1fr;
  }
  .ability-left {
    justify-content: flex-start;
  }
  .ability-right {
    grid-template-columns: 1fr;
  }
}
</style>
