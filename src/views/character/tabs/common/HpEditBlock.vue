<template>
  <div class="hp-edit-block">
    <header class="block-header">
      <span class="section-label">Изменение HP</span>
      <ion-button
        class="settings-btn"
        fill="clear"
        size="small"
        aria-label="Настройки HP"
        @click="selectEditHp(characterStore.character)"
      >
        <ion-icon :icon="settingsOutline"></ion-icon>
      </ion-button>
    </header>

    <section class="input-section" aria-labelledby="hp-amount-label">
      <p id="hp-amount-label" class="section-label">Количество</p>
      <div class="display-area">
        <output class="display" aria-live="polite" aria-label="Введённое значение">
          {{ inputValue || '0' }}
        </output>
        <button
          type="button"
          class="backspace-btn"
          aria-label="Удалить последний символ"
          :disabled="!inputValue"
          @click="backspace"
        >
          <ion-icon :icon="backspaceOutline"></ion-icon>
        </button>
      </div>

      <div class="potion-section">
        <p class="section-label">Зелье лечения</p>
        <div class="potion-buttons">
          <button
            v-for="potion in potions"
            :key="potion.id"
            type="button"
            class="potion-btn"
            :class="`rarity-${potion.rarity}`"
            :aria-label="`${potion.label}: ${potion.formula}`"
            :title="`${potion.label} (${potion.formula})`"
            @click="rollPotion(potion)"
          >
            <ion-icon :icon="flaskOutline" class="potion-icon" aria-hidden="true"></ion-icon>
            <span class="potion-label">{{ potion.label }}</span>
          </button>
        </div>
      </div>

      <div class="numpad" role="group" aria-label="Цифровая клавиатура">
        <button
          v-for="digit in numpadDigits"
          :key="digit"
          type="button"
          class="digit-btn"
          :class="{ 'digit-btn--wide': digit === '0' }"
          @click="handleClick(digit)"
        >
          {{ digit }}
        </button>
      </div>
    </section>

    <section class="actions-section" aria-labelledby="hp-actions-label">
      <p id="hp-actions-label" class="section-label">Применить</p>
      <div class="action-buttons">
        <button
          type="button"
          class="action-btn action-btn--heal"
          :disabled="!hasValue"
          :aria-disabled="!hasValue"
          aria-label="Лечение: прибавить"
          @click="applyAction('heal')"
        >
          <ion-icon :icon="heartOutline" aria-hidden="true"></ion-icon>
          Лечение
        </button>
        <button
          type="button"
          class="action-btn action-btn--damage"
          :disabled="!hasValue"
          :aria-disabled="!hasValue"
          aria-label="Урон: вычесть"
          @click="applyAction('damage')"
        >
          <ion-icon :icon="flashOutline" aria-hidden="true"></ion-icon>
          Урон
        </button>
        <button
          type="button"
          class="action-btn action-btn--temp"
          :disabled="!hasValue"
          :aria-disabled="!hasValue"
          aria-label="Временные HP: прибавить"
          @click="applyAction('temp')"
        >
          <ion-icon :icon="shieldOutline" aria-hidden="true"></ion-icon>
          Временные
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { IonButton, IonIcon } from '@ionic/vue';
import {
  backspaceOutline,
  flashOutline,
  flaskOutline,
  heartOutline,
  settingsOutline,
  shieldOutline,
} from 'ionicons/icons';
import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import { useRoute } from "vue-router";
import { Character } from "@/components/models/response/Character";
import { useCharacterStore } from "@/stores/CharacterStore";

const characterStore = useCharacterStore();
const emits = defineEmits(["edit-hp-select"]);
const route = useRoute();
const inputValue = ref<string>('');

const numpadDigits = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'];

interface Potion {
  id: string;
  label: string;
  formula: string;
  dice: number;
  sides: number;
  bonus: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary';
}

const potions: Potion[] = [
  { id: 'small', label: 'Малое', formula: '2d4+2', dice: 2, sides: 4, bonus: 2, rarity: 'common' },
  { id: 'medium', label: 'Среднее', formula: '4d4+4', dice: 4, sides: 4, bonus: 4, rarity: 'uncommon' },
  { id: 'large', label: 'Большое', formula: '8d4+8', dice: 8, sides: 4, bonus: 8, rarity: 'very-rare' },
  { id: 'perfect', label: 'Совершенное', formula: '10d4+20', dice: 10, sides: 4, bonus: 20, rarity: 'legendary' },
];

function rollDice(count: number, sides: number, bonus: number): number {
  let sum = 0;
  for (let i = 0; i < count; i++) {
    sum += Math.floor(Math.random() * sides) + 1;
  }
  return sum + bonus;
}

const hasValue = computed(() => Boolean(inputValue.value?.trim()));

const selectEditHp = (character: Character) => {
  emits("edit-hp-select", character);
};

const handleClick = (digit: string) => {
  inputValue.value += digit;
};

const rollPotion = (potion: Potion) => {
  const result = rollDice(potion.dice, potion.sides, potion.bonus);
  inputValue.value = String(result);
};

const applyAction = (type: 'heal' | 'damage' | 'temp') => {
  if (inputValue.value?.trim()) {
    updateCurrentHealth(type.toUpperCase(), Number(inputValue.value));
    inputValue.value = "";
  }
};

const backspace = () => {
  inputValue.value = inputValue.value.slice(0, -1);
};

const updateCurrentHealth = async (type: string, value: number) => {
  const health = characterStore.character?.health;
  if (!health) return;

  // Snapshot for rollback on server error
  const snapshot = { ...health };
  const wasAtZero = health.currentHp <= 0;

  // --- Optimistic store update ---
  if (type === "HEAL") {
    health.currentHp = Math.min(health.currentHp + value, health.maxHp + health.bonusValue);
    if (wasAtZero && health.currentHp > 0) {
      health.deathSaveSuccesses = 0;
      health.deathSaveFailures = 0;
    }
  } else if (type === "DAMAGE") {
    if (health.tempHp >= value) {
      health.tempHp -= value;
    } else {
      const remaining = value - health.tempHp;
      health.currentHp = Math.max(0, health.currentHp - remaining);
      health.tempHp = 0;
    }
    if (wasAtZero && health.currentHp <= 0) {
      health.deathSaveFailures = Math.min((health.deathSaveFailures ?? 0) + 1, 3);
    }
  } else if (type === "TEMP") {
    health.tempHp += value;
  }

  const needsDeathSaveReset  = type === "HEAL" && wasAtZero && health.currentHp > 0;
  const needsDeathSaveFailure = type === "DAMAGE" && wasAtZero && health.currentHp <= 0;

  // --- API call (may be queued if offline) ---
  const baseUrl = `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${route.params.characterId}`;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("accessToken")}` };

  try {
    await axios.patch(`${baseUrl}${GATEWAY_INTEGRATION_ROUTES.health}${GATEWAY_INTEGRATION_ROUTES.updateCurrent}`, { type, value }, { headers });

    if (needsDeathSaveReset) {
      await axios.patch(`${baseUrl}/health/death-saves`, { type: 'RESET' }, { headers });
    } else if (needsDeathSaveFailure) {
      await axios.patch(`${baseUrl}/health/death-saves`, { type: 'FAILURE' }, { headers });
    }
  } catch (e: unknown) {
    const err = e as { response?: unknown };
    if (err.response) {
      // Server rejected — rollback optimistic change
      Object.assign(health, snapshot);
    }
    // Network error: optimistic change stays, request already queued
  }
};
</script>

<style scoped>
/* Layout: clear visual hierarchy, semantic sections */
.hp-edit-block {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 4px;
}

.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.section-label {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ion-color-primary);
  opacity: 0.9;
}

.settings-btn {
  --color: var(--ion-color-primary);
  margin: -4px -4px -4px 0;
  padding: 4px;
  min-width: 40px;
  min-height: 40px;
}

.settings-btn:hover {
  --color: var(--ion-color-primary-tint);
}

/* Input section: proximity grouping */
.input-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Display + backspace: unified input-like design */
.display-area {
  display: flex;
  align-items: stretch;
  background: var(--ion-color-medium-shade);
  border: 1px solid var(--ion-color-primary);
  border-radius: 10px;
  overflow: hidden;
}

.display {
  flex: 1;
  min-height: 48px;
  padding: 12px 12px 12px 16px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--ion-color-light);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.backspace-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  padding: 0 12px;
  margin: 0;
  background: transparent;
  border: none;
  border-left: 1px solid var(--ion-color-primary);
  color: var(--ion-color-light);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.backspace-btn:not(:disabled):hover {
  background: var(--ion-color-medium);
  color: var(--ion-color-primary);
}

.backspace-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.backspace-btn ion-icon {
  font-size: 1.25rem;
}

/* Healing potion calculator */
.potion-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.potion-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.potion-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 44px;
  padding: 4px 6px;
  background: var(--ion-color-medium);
  border: 2px solid;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.potion-icon {
  font-size: 1.125rem;
}

.potion-label {
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.potion-btn:hover {
  background: var(--ion-color-medium-tint);
  filter: brightness(1.15);
}

.potion-btn:active {
  filter: brightness(0.9);
}

.rarity-common {
  border-color: var(--coin-color-silver);
  color: var(--coin-color-silver);;
}

.rarity-uncommon {
  border-color: var(--ion-color-success-shade);
  color: var(--ion-color-success-shade);
}

.rarity-rare {
  border-color: blue;
  color: blue;
}

.rarity-very-rare {
  border-color: var(--ion-color-primary-shade);;
  color: var(--ion-color-primary-shade);;
}

.rarity-legendary {
  border-color: orange;
  color: orange;
}

/* Numpad: 44px touch targets (WCAG) */
.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.digit-btn {
  min-height: 44px;
  background: var(--ion-color-medium);
  border: 1px solid var(--ion-color-primary);
  border-radius: 10px;
  color: var(--ion-color-light);
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.digit-btn:hover {
  background: var(--ion-color-medium-tint);
  border-color: var(--ion-color-primary-tint);
}

.digit-btn:active {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.digit-btn--wide {
  grid-column: 1 / -1;
}

/* Actions: semantic grouping, feedback via disabled state */
.actions-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 48px;
  padding: 12px 8px;
  border: none;
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease;
}

.action-btn ion-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn:not(:disabled):hover {
  filter: brightness(1.1);
}

.action-btn:not(:disabled):active {
  filter: brightness(0.95);
}

.action-btn--heal {
  background: var(--ion-color-success);
  color: var(--ion-color-success-contrast);
}

.action-btn--damage {
  background: var(--ion-color-danger);
  color: var(--ion-color-danger-contrast);
}

.action-btn--temp {
  background: var(--ion-color-secondary);
  color: var(--ion-color-secondary-contrast);
}
</style>
