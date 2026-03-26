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
        :class="hpToneClass"
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
      <div class="hp-main" aria-label="Hit points" :style="{ transform: `scale(${hpTextScale})` }">
        <span class="current">{{ currentHp }}</span>
        <span class="sep">/</span>
        <span class="max">{{ maxHp }}</span>
      </div>
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

const hpToneClass = computed(() => {
  if (hpPercent.value <= 25) return 'critical';
  if (hpPercent.value <= 50) return 'warn';
  return 'normal';
});

const dashArray = computed(() => '100 100')
const dashOffset = computed(() => 100 - hpPercent.value)

const hpTextScale = computed(() => {
  const curr = String(currentHp.value ?? '').length;
  const max = String(maxHp.value ?? '').length;
  const total = curr + max + 1; // includes '/'

  // even for typical 3-3 digits we slightly reduce the text for better fit
  if(total <= 5) return 0.8;
  if (total <= 7) return 0.7;
  if (total <= 9) return 0.5;
  if (total <= 11) return 0.82;
  return 0.75;
});

const tempDashArray = computed(() => {
  if (maxHp.value <= 0) return '0 100';
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
  border-radius: 50%;
  overflow: hidden;
  background: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0) 58%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -8px 18px rgba(0, 0, 0, 0.24),
    0 4px 12px rgba(0, 0, 0, 0.22);
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
  stroke: rgba(var(--ion-color-light-rgb), 0.16);
  stroke-width: 3.4;
}

/* Track */
.circle-bg {
  fill: none;
  stroke: rgba(var(--ion-color-light-rgb), 0.1);
  stroke-width: 2.4;
}

/* Main HP */
.circle-hp {
  fill: none;
  stroke: rgba(var(--ion-color-danger-rgb), 0.88);
  stroke-width: 2.8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.45s ease, stroke 0.3s ease;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.28));
}

.circle-hp.normal {
  stroke: rgba(var(--ion-color-danger-rgb), 0.88);
}

.circle-hp.warn {
  stroke: rgba(244, 172, 58, 0.95);
}

.circle-hp.critical {
  stroke: rgba(218, 56, 69, 0.95);
}

/* Temp HP (shield) */
.circle-temp-hp {
  fill: none;
  stroke: rgba(85, 191, 255, 0.96);
  stroke-width: 3.2;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.45s ease;
  filter: drop-shadow(0 1px 2px rgba(63, 164, 255, 0.35));
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
  z-index: 1;
}

.hp-value::before {
  content: '';
  position: absolute;
  width: 64%;
  height: 64%;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02) 42%, rgba(17, 14, 24, 0.55) 100%);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.09);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -10px 18px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(1px);
  pointer-events: none;
}

.hp-value > * {
  position: relative;
  z-index: 1;
}

.hp-value .current {
  /* used inside .hp-main */
}

.hp-main {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  transform-origin: center;
}

.hp-main .current {
  font-size: 13px;
  font-weight: 850;
  color: rgba(var(--ion-color-light-rgb), 0.98);
  letter-spacing: -0.01em;
}

.hp-main .sep {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.55;
  transform: translateY(-0.5px);
}

.hp-main .max {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.78;
  letter-spacing: -0.01em;
}

.hp-value .temp {
  font-size: 8px;
  margin-top: 1px;
  color: rgba(124, 212, 255, 0.98);
  font-weight: 700;
  text-shadow: 0 0 4px rgba(86, 191, 255, 0.35);
}
</style>

