<script setup lang="ts">
import { IonModal } from "@ionic/vue";
import { computed, watch } from "vue";
import type { DiceRollResult } from "@/composables/useDice";

const props = defineProps<{
  isOpen: boolean;
  title: string;
  subtitle?: string;
  result: DiceRollResult | null;
  mode: "attack" | "damage";
}>();

const emit = defineEmits<{ (e: "close"): void }>();

let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

watch(() => props.isOpen, (open) => {
  if (autoCloseTimer) clearTimeout(autoCloseTimer);
  if (open) autoCloseTimer = setTimeout(() => emit("close"), 6000);
});

const isCrit = computed(() => props.result?.isCrit ?? false);
const isFail = computed(() => props.result?.isCritFail ?? false);

const accentColor = computed(() =>
  props.mode === "attack" ? "var(--ion-color-secondary-rgb)" : "var(--ion-color-danger-rgb)"
);
</script>

<template>
  <ion-modal
    :is-open="props.isOpen"
    @didDismiss="emit('close')"
    :can-dismiss="true"
    :handle="false"
    :initial-breakpoint="0.33"
    :breakpoints="[0, 0.33]"
  >
    <div
      class="sheet spellbook-theme"
      :class="[`sheet--${mode}`, { 'sheet--crit': isCrit, 'sheet--fail': isFail }]"
      @click="emit('close')"
    >
      <div class="handle-bar" />

      <div v-if="result" class="inner">

        <!-- Хедер -->
        <div class="sheet-header">
          <span class="sheet-title">{{ title }}</span>
        </div>

        <!-- Кубики -->
        <div class="dice-row">
          <div
            v-for="(die, i) in result.dice"
            :key="i"
            class="die"
            :class="{
              'die--d20':   die.sides === 20,
              'die--nat20': die.sides === 20 && die.value === 20,
              'die--nat1':  die.sides === 20 && die.value === 1,
              'die--damage': mode === 'damage',
            }"
            :style="{ animationDelay: `${i * 60}ms` }"
          >
            <span class="die-label">d{{ die.sides }}</span>
            <span class="die-val">{{ die.value }}</span>
          </div>

          <div
            v-if="result.flat !== 0"
            class="flat-bonus"
            :style="{ animationDelay: `${result.dice.length * 60}ms` }"
          >
            {{ result.flat > 0 ? `+${result.flat}` : result.flat }}
          </div>
        </div>

        <!-- Крит/фейл / итог -->
        <div class="result-row">
          <div v-if="isCrit" class="crit-badge">✦ Натуральная 20!</div>
          <div v-else-if="isFail" class="fail-badge">Натуральная 1</div>

          <div
            class="total"
            :class="{
              'total--crit':   isCrit,
              'total--fail':   isFail,
              'total--damage': mode === 'damage' && !isCrit && !isFail,
            }"
            :style="{ animationDelay: `${result.dice.length * 60 + 80}ms` }"
          >{{ result.total }}</div>
        </div>

      </div>
    </div>
  </ion-modal>
</template>

<style scoped>
.sheet {
  height: 100%;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  user-select: none;
  background: var(--ion-background-color, #1a1a2e);
  --accent: v-bind(accentColor);
}

.handle-bar {
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: rgba(var(--ion-color-light-rgb), 0.18);
  margin: 8px auto 4px;
  flex-shrink: 0;
}

.inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  padding: 2px 20px 8px;
}

/* ── Header ── */
.sheet-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.sheet-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(var(--ion-color-light-rgb), 0.75);
  letter-spacing: 0.01em;
}

.sheet-subtitle {
  font-size: 0.75rem;
  color: rgba(var(--ion-color-light-rgb), 0.4);
}

/* ── Dice row ── */
.dice-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.die {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 10px;
  background: rgba(var(--ion-color-light-rgb), 0.06);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
  animation: pop-in 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  flex-shrink: 0;
}

.die--d20 {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: rgba(var(--ion-color-secondary-rgb), 0.08);
  border-color: rgba(var(--ion-color-secondary-rgb), 0.25);
}

.die--damage {
  background: rgba(var(--ion-color-danger-rgb), 0.08);
  border-color: rgba(var(--ion-color-danger-rgb), 0.2);
}

.die--nat20 {
  background: rgba(212, 175, 55, 0.12) !important;
  border-color: rgba(212, 175, 55, 0.65) !important;
  animation: pop-in 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) both,
             crit-pulse 1.8s ease-in-out 0.5s infinite alternate;
}

.die--nat1 {
  background: rgba(var(--ion-color-danger-rgb), 0.12) !important;
  border-color: rgba(var(--ion-color-danger-rgb), 0.55) !important;
}

.die-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.3);
  line-height: 1;
}

.die-val {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--ion-color-light);
  line-height: 1;
}

.die--nat20 .die-val { color: #d4af37; }
.die--nat1  .die-val { color: var(--ion-color-danger); }

.flat-bonus {
  font-size: 1.1rem;
  font-weight: 700;
  color: rgba(var(--ion-color-light-rgb), 0.4);
  animation: pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

/* ── Result ── */
.result-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.crit-badge {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #d4af37;
  animation: fade-in 0.3s ease 0.3s both;
}

.fail-badge {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ion-color-danger);
  animation: fade-in 0.3s ease 0.3s both;
}

.total {
  font-size: 2.8rem;
  font-weight: 800;
  color: var(--ion-color-light);
  line-height: 1;
  letter-spacing: -0.03em;
  animation: total-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.total--crit {
  color: #d4af37;
  text-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
  animation: total-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both,
             crit-pulse 1.8s ease-in-out 0.6s infinite alternate;
}

.total--fail   { color: var(--ion-color-danger); }
.total--damage { color: var(--ion-color-danger-tint); }

/* ── Keyframes ── */
@keyframes pop-in {
  from { opacity: 0; transform: scale(0.5) rotate(-8deg); }
  to   { opacity: 1; transform: scale(1) rotate(0deg); }
}

@keyframes total-in {
  from { opacity: 0; transform: scale(0.65); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes crit-pulse {
  from { text-shadow: 0 0 6px rgba(212, 175, 55, 0.3); }
  to   { text-shadow: 0 0 24px rgba(212, 175, 55, 0.75), 0 0 8px rgba(212, 175, 55, 0.4); }
}
</style>
