<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  fillPercent: number;
  tiltX?: number;
  tiltY?: number;
  tone?: 'normal' | 'warn' | 'critical';
}>(), {
  tiltX: 0,
  tiltY: 0,
  tone: 'normal',
});

const clampedFill = computed(() => Math.min(100, Math.max(0, props.fillPercent)));

const bodyStyle = computed(() => ({
  height: `${Math.max(clampedFill.value, 7)}%`,
  transform: `rotate(${props.tiltX * 0.7}deg) translateX(${props.tiltX * 0.45}px)`,
}));
</script>

<template>
  <div class="hp-liquid" aria-hidden="true">
    <div class="hp-liquid__body" :class="`hp-liquid__body--${tone}`" :style="bodyStyle">
      <div class="hp-liquid__surface">
        <svg class="hp-liquid__wave hp-liquid__wave--back" viewBox="0 0 1200 60" preserveAspectRatio="none">
          <path d="M0,22 C75,10 225,10 300,22 C375,34 525,34 600,22 C675,10 825,10 900,22 C975,34 1125,34 1200,22 V60 H0 Z"/>
        </svg>
        <svg class="hp-liquid__wave hp-liquid__wave--front" viewBox="0 0 1200 60" preserveAspectRatio="none">
          <path d="M0,26 C75,16 225,16 300,26 C375,36 525,36 600,26 C675,16 825,16 900,26 C975,36 1125,36 1200,26 V60 H0 Z"/>
        </svg>
        <span class="hp-liquid__crest"></span>
      </div>

      <span class="hp-liquid__bubble hp-liquid__bubble--a"></span>
      <span class="hp-liquid__bubble hp-liquid__bubble--b"></span>
      <span class="hp-liquid__bubble hp-liquid__bubble--c"></span>

      <span class="hp-liquid__shine"></span>
    </div>
  </div>
</template>

<style scoped>
.hp-liquid {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

.hp-liquid__body {
  position: absolute;
  left: -70%;
  bottom: -2px;
  width: 240%;
  min-height: 16%;
  transform-origin: center bottom;
  will-change: transform, height;
  transition: height 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.12s linear;
}

/* Solid skirt extending far below the block so tilting never reveals gaps */
.hp-liquid__body::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 200px;
  background: inherit;
}

.hp-liquid__body--normal {
  background: linear-gradient(180deg,
    rgba(var(--ion-color-danger-rgb), 0.92) 0%,
    rgba(var(--ion-color-danger-rgb), 0.66) 100%);
}

.hp-liquid__body--normal::after {
  background: rgba(var(--ion-color-danger-rgb), 0.66);
}

.hp-liquid__body--warn {
  background: linear-gradient(180deg,
    rgba(244, 172, 58, 0.95) 0%,
    rgba(214, 132, 30, 0.7) 100%);
}

.hp-liquid__body--warn::after {
  background: rgba(214, 132, 30, 0.7);
}

.hp-liquid__body--critical {
  background: linear-gradient(180deg,
    rgba(224, 64, 78, 0.98) 0%,
    rgba(150, 24, 36, 0.8) 100%);
}

.hp-liquid__body--critical::after {
  background: rgba(150, 24, 36, 0.8);
}

.hp-liquid__surface {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  animation: hp-bob 3.4s ease-in-out infinite;
}

.hp-liquid__wave {
  position: absolute;
  top: -9px;
  left: 0;
  width: 200%;
  height: 16px;
}

.hp-liquid__wave path {
  fill: currentColor;
}

.hp-liquid__wave--back {
  color: rgba(255, 94, 94, 0.16);
  animation: hp-wave-scroll 5.6s linear infinite;
}

.hp-liquid__wave--front {
  color: rgba(255, 183, 183, 0.3);
  animation: hp-wave-scroll 3.6s linear infinite reverse;
}

/* Highlight strip riding the liquid surface */
.hp-liquid__crest {
  position: absolute;
  left: 0;
  right: 0;
  top: -2px;
  height: 2px;
  background: linear-gradient(90deg,
    transparent,
  rgba(255, 26, 26, 0.55) 50%,
    transparent);
  filter: blur(0.4px);
  opacity: 0.8;
}

/* Sweeping gloss across the liquid */
.hp-liquid__shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg,
    transparent 30%,
  rgba(246, 133, 133, 0.18) 48%,
  rgba(243, 13, 13, 0.04) 56%,
    transparent 70%);
  background-size: 220% 100%;
  animation: hp-shine 5.2s ease-in-out infinite;
  mix-blend-mode: screen;
}

.hp-liquid__bubble {
  position: absolute;
  bottom: 4px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%,
    rgba(255, 255, 255, 0.7),
  rgba(255, 122, 122, 0.34) 70%);
  opacity: 0;
  will-change: transform, opacity;
}

.hp-liquid__bubble--a {
  left: 32%;
  width: 4px;
  height: 4px;
  animation: hp-bubble 4.2s ease-in 0.4s infinite;
}

.hp-liquid__bubble--b {
  left: 54%;
  width: 3px;
  height: 3px;
  animation: hp-bubble 5.1s ease-in 1.6s infinite;
}

.hp-liquid__bubble--c {
  left: 71%;
  width: 5px;
  height: 5px;
  animation: hp-bubble 4.8s ease-in 2.7s infinite;
}

@keyframes hp-wave-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes hp-bob {
  0%, 100% { transform: translateY(0.6px); }
  50% { transform: translateY(-1.2px); }
}

@keyframes hp-shine {
  0%, 100% { background-position: 130% 0; }
  50% { background-position: -30% 0; }
}

@keyframes hp-bubble {
  0% { transform: translateY(0) scale(0.6); opacity: 0; }
  15% { opacity: 0.7; }
  80% { opacity: 0.5; }
  100% { transform: translateY(-22px) scale(1); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .hp-liquid__surface,
  .hp-liquid__wave,
  .hp-liquid__shine,
  .hp-liquid__bubble {
    animation: none;
  }
}
</style>
