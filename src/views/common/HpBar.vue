<template>
  <div class="hp-bar">
    <svg viewBox="0 0 36 36" class="circular-chart">
      <!-- Фон -->
      <path
          class="circle-bg"
          d="M18 2.0845
           a 15.9155 15.9155 0 0 1 0 31.831
           a 15.9155 15.9155 0 0 1 0 -31.831"
      />
      <!-- Текущее здоровье -->
      <path
          class="circle-hp"
          :style="{ strokeDasharray: dashArray, strokeDashoffset: dashOffset }"
          d="M18 2.0845
           a 15.9155 15.9155 0 0 1 0 31.831
           a 15.9155 15.9155 0 0 1 0 -31.831"
      />
      <!-- Временное здоровье -->
      <path
          class="circle-temp-hp"
          v-if="tempHp > 0"
          :style="{ strokeDasharray: tempDashArray, strokeDashoffset: tempDashOffset }"
          d="M18 2.0845
           a 15.9155 15.9155 0 0 1 0 31.831
           a 15.9155 15.9155 0 0 1 0 -31.831"
      />
    </svg>
    <div class="hp-value">
      {{ currentHp }}
      {{ maxHp }}
      <br>
      <span v-if="tempHp > 0">(+{{ tempHp }})</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCharacterStore } from '@/stores/CharacterStore'

const characterStore = useCharacterStore()

const currentHp = computed(() => characterStore.character?.health?.currentHp ?? 0)
const maxHp = computed(() => characterStore.character?.health?.maxHp + characterStore.character?.health?.bonusValue)
const tempHp = computed(() => characterStore.character?.health?.tempHp ?? 0)

const dashArray = computed(() => "100, 100")
const dashOffset = computed(() => {
  const percentage = (currentHp.value / maxHp.value) * 100
  return 100 - percentage
})

const tempDashArray = computed(() => {
  const percentage = (tempHp.value / maxHp.value) * 100
  return `${percentage}, 100`
})

const tempDashOffset = computed(() => {
  return (currentHp.value / maxHp.value) * -100
})
</script>


<style scoped>
.hp-bar {
  position: relative;
  width: 100%;
  height: 100%;
}

.circular-chart {
  width: 100%;
  height: 100%;
}

.circle-hp {
  fill: none;
  stroke:  var(--ion-color-danger);
  stroke-width: 2;
  stroke-linecap: round;
  transition: stroke-dashoffset 2s;
}

.circle-temp-hp {
  fill: none;
  stroke: var(--ion-color-warning);
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset 2s;
}

.hp-value {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  text-align: center;
}
</style>
