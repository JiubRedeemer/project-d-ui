<template>
  <div class="hp-bar">
    <svg viewBox="0 0 36 36" class="circular-chart">
      <!-- Outer rim -->
      <path
        class="circle-rim"
        d="M18 2.0845
           a 15.9155 15.9155 0 0 1 0 31.831
           a 15.9155 15.9155 0 0 1 0 -31.831"
      />

      <!-- Background track -->
      <path
        class="circle-bg"
        d="M18 2.0845
           a 15.9155 15.9155 0 0 1 0 31.831
           a 15.9155 15.9155 0 0 1 0 -31.831"
      />

      <!-- Current HP -->
      <path
        class="circle-hp"
        :class="{ danger: hpPercent <= 25 }"
        :style="{ strokeDasharray: dashArray, strokeDashoffset: dashOffset }"
        d="M18 2.0845
           a 15.9155 15.9155 0 0 1 0 31.831
           a 15.9155 15.9155 0 0 1 0 -31.831"
      />

      <!-- Temporary HP -->
      <path
        v-if="tempHp > 0"
        class="circle-temp-hp"
        :style="{ strokeDasharray: tempDashArray, strokeDashoffset: tempDashOffset }"
        d="M18 2.0845
           a 15.9155 15.9155 0 0 1 0 31.831
           a 15.9155 15.9155 0 0 1 0 -31.831"
      />
    </svg>

    <div class="hp-value">
      <div class="current">{{ currentHp }}</div>
      <div class="max">/ {{ maxHp }}</div>
      <div v-if="tempHp > 0" class="temp">+{{ tempHp }}</div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { computed } from 'vue'
import { useCharacterStore } from '@/stores/CharacterStore'

const store = useCharacterStore()

const currentHp = computed(() => store.character?.health?.currentHp ?? 0)
const maxHp = computed(() =>
  (store.character?.health?.maxHp ?? 0) +
  (store.character?.health?.bonusValue ?? 0)
)
const tempHp = computed(() => store.character?.health?.tempHp ?? 0)

const hpPercent = computed(() =>
  maxHp.value > 0 ? (currentHp.value / maxHp.value) * 100 : 0
)

const dashArray = computed(() => '100 100')
const dashOffset = computed(() => 100 - hpPercent.value)

const tempDashArray = computed(() => {
  const percent = (tempHp.value / maxHp.value) * 100
  return `${percent} 100`
})

const tempDashOffset = computed(() => -hpPercent.value)
</script>



<style scoped>
.hp-bar {
  position: relative;
  width: 100%;
  height: 100%;
}

/* SVG */
.circular-chart {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

/* Outer rim */
.circle-rim {
  fill: none;
  stroke: #1c1c1c;
  stroke-width: 3.6;
}

/* Track */
.circle-bg {
  fill: none;
  stroke: #2b2b2b;
  stroke-width: 2.4;
}

/* Main HP */
.circle-hp {
  fill: var(--ion-color-dark);
  stroke:  var(--ion-color-danger);
  stroke-width: 2.8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.8s ease;
  filter: drop-shadow(0 0 2px rgba(255, 60, 60, 0.6));
}

/* Low HP warning */
.circle-hp.danger {
  stroke: #8b0000;
  animation: pulse 1.2s infinite;
}

/* Temp HP (shield) */
.circle-temp-hp {
  fill: none;
  stroke: var(--ion-color-warning);
  stroke-width: 3.4;
  stroke-linecap: round;
  filter: drop-shadow(0 0 2px rgba(255, 193, 7, 0.8));
  transition: stroke-dashoffset 0.8s ease;
}

/* Center text */
.hp-value {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  transform: translateZ(0);
}

.hp-value .current {
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

.hp-value .max {
  font-size: 9px;
  opacity: 0.7;
}

.hp-value .temp {
  font-size: 8px;
  color: var(--ion-color-warning);
}

/* Animations */
@keyframes pulse {
  0% { filter: drop-shadow(0 0 2px rgba(139, 0, 0, 0.4)); }
  50% { filter: drop-shadow(0 0 5px rgba(139, 0, 0, 0.9)); }
  100% { filter: drop-shadow(0 0 2px rgba(139, 0, 0, 0.4)); }
}
</style>

