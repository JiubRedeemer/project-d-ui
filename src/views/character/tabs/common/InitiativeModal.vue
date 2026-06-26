<script setup lang="ts">
import { ref, computed } from 'vue';
import { IonIcon, IonModal } from '@ionic/vue';
import { diceOutline } from 'ionicons/icons';
import { useCharacterStore } from '@/stores/CharacterStore';
import { setCombatInitiative } from '@/api/combatApi';

const props = defineProps<{
  isOpen: boolean;
  roomId: string;
  sessionId: string;
  participantId: string;
  participantName: string;
}>();

const emit = defineEmits<{ close: [] }>();

const characterStore = useCharacterStore();
const initiativeValue = ref('');
const rolling = ref(false);
const lastRoll = ref<number | null>(null);
const submitted = ref(false);
const submitting = ref(false);

const diceIcon = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect x="32" y="32" width="448" height="448" rx="48" ry="48" fill="none" stroke="currentColor" stroke-width="32"/><circle fill="currentColor" cx="176" cy="176" r="32"/><circle fill="currentColor" cx="336" cy="176" r="32"/><circle fill="currentColor" cx="176" cy="336" r="32"/><circle fill="currentColor" cx="336" cy="336" r="32"/><circle fill="currentColor" cx="256" cy="256" r="32"/></svg>';

const initiativeBonus = computed(() =>
  (characterStore.character?.initiative ?? 0) + (characterStore.character?.bonusInitiative ?? 0)
);

async function rollD20() {
  if (rolling.value) return;
  rolling.value = true;
  const roll = Math.floor(Math.random() * 20) + 1;
  for (let i = 0; i < 8; i++) {
    lastRoll.value = Math.floor(Math.random() * 20) + 1;
    await new Promise(r => setTimeout(r, 60));
  }
  lastRoll.value = roll;
  await new Promise(r => setTimeout(r, 200));
  rolling.value = false;
  initiativeValue.value = String(roll + initiativeBonus.value);
}

async function submit() {
  const val = parseInt(initiativeValue.value);
  if (isNaN(val) || submitting.value) return;
  submitting.value = true;
  try {
    await setCombatInitiative(props.roomId, props.sessionId, props.participantId, val);
    submitted.value = true;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    :initial-breakpoint="1"
    :breakpoints="[0, 1]"
    style="--height: 65vh"
    @didDismiss="emit('close')"
  >
    <div class="init-modal">
      <div class="init-modal__header">
        <span>⚔️ Бой начался!</span>
      </div>

      <template v-if="!submitted">
        <p class="init-modal__sub">Введите инициативу для <strong>{{ participantName }}</strong></p>

        <div class="bonus-hint" v-if="initiativeBonus !== 0">
          Бонус инициативы: {{ initiativeBonus >= 0 ? '+' : '' }}{{ initiativeBonus }}
        </div>

        <div class="dice-area">
          <button class="dice-btn" :disabled="rolling" @click="rollD20">
            <span v-if="rolling" class="rolling-num">{{ lastRoll }}</span>
            <template v-else>
              <ion-icon :icon="diceIcon"/>
              <span>Бросить d20</span>
            </template>
          </button>
        </div>

        <div class="input-area">
          <label class="input-label">Инициатива</label>
          <input
            type="number"
            v-model="initiativeValue"
            class="init-input"
            placeholder="0"
            @keyup.enter="submit"
          />
        </div>

        <button class="submit-btn" :disabled="!initiativeValue || submitting" @click="submit">
          {{ submitting ? 'Отправляю...' : 'Подтвердить' }}
        </button>
      </template>

      <template v-else>
        <div class="submitted-view">
          <div class="submitted-icon">✅</div>
          <p class="submitted-text">Инициатива <strong>{{ initiativeValue }}</strong> отправлена</p>
          <p class="submitted-sub">Ожидайте начала боя...</p>
        </div>
      </template>
    </div>
  </ion-modal>
</template>

<style scoped>
.init-modal {
  padding: 20px 18px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.init-modal__header {
  font-size: 1.2rem;
  font-weight: 800;
  text-align: center;
  color: var(--ion-color-primary);
}

.init-modal__sub {
  text-align: center;
  font-size: 0.9rem;
  color: var(--ion-color-light);
  margin: 0;
}

.bonus-hint {
  text-align: center;
  font-size: 0.78rem;
  color: var(--ion-color-secondary);
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 6px 12px;
}

.dice-area { display: flex; justify-content: center; }

.dice-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 12px;
  border: 2px solid rgba(var(--ion-color-primary-rgb), 0.4);
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  color: var(--ion-color-primary);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  min-width: 160px;
  transition: background 0.12s;
}
.dice-btn ion-icon { font-size: 1.4rem; }
.dice-btn:not(:disabled):hover { background: rgba(var(--ion-color-primary-rgb), 0.2); }
.dice-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.rolling-num {
  font-size: 1.5rem;
  font-weight: 700;
  animation: flicker 0.06s infinite;
}
@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.input-area { display: flex; flex-direction: column; gap: 6px; }
.input-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ion-color-primary);
}
.init-input {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.4);
  border-radius: 10px;
  color: var(--ion-color-light);
  padding: 12px 16px;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
}

.submit-btn {
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
}
.submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.submit-btn:not(:disabled):hover { opacity: 0.9; }

.submitted-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.submitted-icon { font-size: 3rem; }
.submitted-text { font-size: 1rem; color: var(--ion-color-light); text-align: center; margin: 0; }
.submitted-sub { font-size: 0.82rem; color: var(--ion-color-secondary); text-align: center; margin: 0; }

ion-modal {
  --border-radius: 16px;
  --width: 90%;
  --background: var(--ion-color-dark);
}
</style>
