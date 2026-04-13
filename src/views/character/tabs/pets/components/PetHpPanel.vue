<script setup lang="ts">
import { ref } from "vue";
import type { PetDto, PetHealthCurrentUpdateType } from "@/api/petsApi.types";

defineProps<{ pet: PetDto }>();

const delta = ref(1);
const maxHp = ref(1);

const emit = defineEmits<{
  (e: "current", type: PetHealthCurrentUpdateType, value: number): void;
  (e: "max", value: number): void;
}>();

const submitCurrent = (type: PetHealthCurrentUpdateType) => {
  emit("current", type, Number(delta.value) || 0);
};
</script>

<template>
  <section class="panel">
    <h3>Здоровье</h3>
    <p class="stat">Текущее: <strong>{{ pet.currentHp ?? 0 }} / {{ pet.maxHp ?? 1 }}</strong></p>
    <div class="row">
      <input v-model.number="delta" type="number" min="0" placeholder="Значение" />
      <button type="button" @click="submitCurrent('ADD')">+ HP</button>
      <button type="button" @click="submitCurrent('SUBTRACT')">- HP</button>
      <button type="button" @click="submitCurrent('SET')">Set HP</button>
    </div>
    <div class="row">
      <input v-model.number="maxHp" type="number" min="1" placeholder="Макс. HP" />
      <button type="button" @click="emit('max', Number(maxHp) || 1)">Set Max HP</button>
    </div>
  </section>
</template>

<style scoped>
.panel { background: rgba(var(--ion-color-medium-rgb), 0.9); border-radius: 12px; padding: 12px; }
.panel h3 { margin: 0; font-size: 17px; }
.row { display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 8px; }
.stat { margin: 0; }
input { background: var(--ion-color-dark); color: var(--ion-color-light); border: 1px solid rgba(var(--ion-color-primary-rgb), 0.6); border-radius: 10px; padding: 10px; }
button { border: none; border-radius: 10px; background: var(--ion-color-primary); color: var(--ion-color-primary-contrast); padding: 10px; font-weight: 600; min-height: 40px; transition: transform 0.12s ease; }
button:active { transform: scale(0.99); }
@media (min-width: 768px) {
  .row {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .row:last-child {
    grid-template-columns: 1fr auto;
  }
}
</style>
