<template>
  <div class="death-save-block">

    <!-- Title + status + reset -->
    <div class="ds-header">
      <span class="ds-title">Спасброски смерти</span>
      <span class="ds-status" :class="statusClass">{{ statusText }}</span>
      <button class="ds-reset-btn" :disabled="isDead" @click="reset" title="Сбросить">
        <ion-icon :icon="refreshOutline"/>
      </button>
    </div>

    <!-- Dots + roll button in one row -->
    <div class="ds-main">
      <div class="ds-dots-group">
        <button
          v-for="i in 3" :key="'s' + i"
          :class="['ds-dot', 'ds-dot--success', { 'ds-dot--filled': i <= successes }]"
          :disabled="isDead || isStabilized"
          @click="handleSuccess(i)"
          :aria-label="`Успех ${i}`"
        >
          <ion-icon :icon="i <= successes ? heart : heartOutline"/>
        </button>
        <span class="ds-dots-sep"/>
        <button
          v-for="i in 3" :key="'f' + i"
          :class="['ds-dot', 'ds-dot--failure', { 'ds-dot--filled': i <= failures }]"
          :disabled="isDead || isStabilized"
          @click="handleFailure(i)"
          :aria-label="`Провал ${i}`"
        >
          <ion-icon :icon="i <= failures ? skull : skullOutline"/>
        </button>
      </div>

      <button
        class="ds-roll-btn"
        :disabled="isDead || isStabilized || rolling"
        @click="rollD20"
      >
        <span v-if="rolling" class="ds-roll-result--rolling">{{ lastRoll }}</span>
        <template v-else><ion-icon :icon="diceOutline"/> d20</template>
      </button>
    </div>

    <div v-if="lastRollMessage" class="ds-last-roll" :class="lastRollClass">
      {{ lastRollMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { IonIcon } from '@ionic/vue';
import { heart, heartOutline, refreshOutline } from 'ionicons/icons';
import axios from 'axios';
import { GATEWAY_INTEGRATION_ROUTES } from '@/config/integrationRoutes';
import { useRoute } from 'vue-router';
import { useCharacterStore } from '@/stores/CharacterStore';

// ionicons doesn't have skull — using text fallback via CSS
const skull = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M256 32C132.3 32 32 132.3 32 256c0 71.1 32.7 134.8 84.2 177.8V448h279.6v-14.2C447.3 390.8 480 327.1 480 256 480 132.3 379.7 32 256 32zm-80 304a48 48 0 110-96 48 48 0 010 96zm80 64h-80v-32h160v32h-80zm80-64a48 48 0 110-96 48 48 0 010 96z"/></svg>';
const skullOutline = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-width="32" d="M256 48C141.1 48 48 141.1 48 256c0 68.5 31.5 129.8 81 170.3V432h254v-5.7C433.5 385.8 464 324.5 464 256 464 141.1 370.9 48 256 48z"/><circle fill="currentColor" cx="176" cy="272" r="44"/><circle fill="currentColor" cx="336" cy="272" r="44"/><path fill="currentColor" d="M176 368h32v48h-32zm64 0h32v48h-32zm64 0h32v48h-32z"/></svg>';
const diceOutline = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect x="32" y="32" width="448" height="448" rx="48" ry="48" fill="none" stroke="currentColor" stroke-width="32"/><circle fill="currentColor" cx="176" cy="176" r="32"/><circle fill="currentColor" cx="336" cy="176" r="32"/><circle fill="currentColor" cx="176" cy="336" r="32"/><circle fill="currentColor" cx="336" cy="336" r="32"/><circle fill="currentColor" cx="256" cy="256" r="32"/></svg>';

const route = useRoute();
const characterStore = useCharacterStore();

const rolling = ref(false);
const lastRoll = ref<number | null>(null);
const lastRollMessage = ref('');
const lastRollClass = ref('');

const successes = computed(() => characterStore.character?.health?.deathSaveSuccesses ?? 0);
const failures = computed(() => characterStore.character?.health?.deathSaveFailures ?? 0);

const isDead = computed(() => failures.value >= 3);
const isStabilized = computed(() => successes.value >= 3);

const statusText = computed(() => {
  if (isDead.value) return 'Мёртв';
  if (isStabilized.value) return 'Стабилизирован';
  return 'Без сознания';
});

const statusClass = computed(() => ({
  'ds-status--dead': isDead.value,
  'ds-status--stable': isStabilized.value,
  'ds-status--dying': !isDead.value && !isStabilized.value,
}));

async function patchDeathSave(type: 'SUCCESS' | 'FAILURE' | 'RESET') {
  const url = `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${route.params.characterId}/health/death-saves`;
  await axios.patch(url, { type }, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
  });
}

function applyLocalSuccess() {
  if (characterStore.character?.health) {
    characterStore.character.health.deathSaveSuccesses = Math.min(successes.value + 1, 3);
  }
}

function applyLocalFailure() {
  if (characterStore.character?.health) {
    characterStore.character.health.deathSaveFailures = Math.min(failures.value + 1, 3);
  }
}

async function handleSuccess(slot: number) {
  // clicking filled slot removes it, clicking empty adds up to that slot
  const newVal = slot === successes.value ? slot - 1 : slot;
  const diff = newVal - successes.value;
  if (diff > 0) {
    for (let i = 0; i < diff; i++) {
      applyLocalSuccess();
      await patchDeathSave('SUCCESS');
    }
  } else if (diff < 0) {
    // reset and re-add
    if (characterStore.character?.health) characterStore.character.health.deathSaveSuccesses = newVal;
    await patchDeathSave('RESET');
    for (let i = 0; i < newVal; i++) await patchDeathSave('SUCCESS');
    // also restore failures
    const f = failures.value;
    if (characterStore.character?.health) characterStore.character.health.deathSaveFailures = f;
    for (let i = 0; i < f; i++) await patchDeathSave('FAILURE');
  }
}

async function handleFailure(slot: number) {
  const newVal = slot === failures.value ? slot - 1 : slot;
  const diff = newVal - failures.value;
  if (diff > 0) {
    for (let i = 0; i < diff; i++) {
      applyLocalFailure();
      await patchDeathSave('FAILURE');
    }
  } else if (diff < 0) {
    if (characterStore.character?.health) characterStore.character.health.deathSaveFailures = newVal;
    await patchDeathSave('RESET');
    const s = successes.value;
    if (characterStore.character?.health) characterStore.character.health.deathSaveSuccesses = s;
    for (let i = 0; i < s; i++) await patchDeathSave('SUCCESS');
    for (let i = 0; i < newVal; i++) await patchDeathSave('FAILURE');
  }
}

async function rollD20() {
  if (rolling.value || isDead.value || isStabilized.value) return;
  rolling.value = true;
  lastRollMessage.value = '';

  // animate roll
  const roll = Math.floor(Math.random() * 20) + 1;
  for (let i = 0; i < 8; i++) {
    lastRoll.value = Math.floor(Math.random() * 20) + 1;
    await new Promise(r => setTimeout(r, 60));
  }
  lastRoll.value = roll;
  await new Promise(r => setTimeout(r, 200));
  rolling.value = false;

  if (roll === 20) {
    lastRollMessage.value = `🎲 ${roll} — Критический успех! +1 HP`;
    lastRollClass.value = 'ds-last-roll--crit';
    await reset();
    // heal to 1 HP via parent — emit event
    emit('critSuccess');
  } else if (roll === 1) {
    lastRollMessage.value = `🎲 ${roll} — Критический провал! 2 провала`;
    lastRollClass.value = 'ds-last-roll--fail';
    applyLocalFailure();
    await patchDeathSave('FAILURE');
    if (failures.value < 3) {
      applyLocalFailure();
      await patchDeathSave('FAILURE');
    }
  } else if (roll >= 10) {
    lastRollMessage.value = `🎲 ${roll} — Успех`;
    lastRollClass.value = 'ds-last-roll--success';
    applyLocalSuccess();
    await patchDeathSave('SUCCESS');
  } else {
    lastRollMessage.value = `🎲 ${roll} — Провал`;
    lastRollClass.value = 'ds-last-roll--fail';
    applyLocalFailure();
    await patchDeathSave('FAILURE');
  }
}

async function reset() {
  if (characterStore.character?.health) {
    characterStore.character.health.deathSaveSuccesses = 0;
    characterStore.character.health.deathSaveFailures = 0;
  }
  await patchDeathSave('RESET');
}

const emit = defineEmits<{ critSuccess: [] }>();
</script>

<style scoped>
.death-save-block {
  background: rgba(180, 30, 30, 0.1);
  border: 1px solid rgba(180, 30, 30, 0.3);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Header row ── */
.ds-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ds-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ion-color-primary);
  opacity: 0.9;
  flex: 1;
}

.ds-status {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 999px;
}

.ds-status--dying  { background: rgba(220,80,80,0.15);  color: #e07070; border: 1px solid rgba(220,80,80,0.35); }
.ds-status--stable { background: rgba(60,200,100,0.15); color: #6cda8c; border: 1px solid rgba(60,200,100,0.35); }
.ds-status--dead   { background: rgba(100,100,100,0.15); color: #888;   border: 1px solid rgba(100,100,100,0.35); }

.ds-reset-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: var(--ion-color-secondary);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
}

.ds-reset-btn:not(:disabled):hover { background: rgba(255,255,255,0.07); color: var(--ion-color-light); }
.ds-reset-btn:disabled { opacity: 0.3; cursor: not-allowed; }

/* ── Main row: dots + roll ── */
.ds-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ds-dots-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.ds-dots-sep {
  width: 1px;
  height: 20px;
  background: rgba(255,255,255,0.12);
  flex-shrink: 0;
  margin: 0 2px;
}

.ds-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1.5px solid;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.12s, transform 0.1s;
  flex-shrink: 0;
}

.ds-dot:not(:disabled):hover { transform: scale(1.12); }
.ds-dot:disabled { opacity: 0.4; cursor: not-allowed; }

.ds-dot--success              { border-color: rgba(60,200,100,0.3);  color: rgba(60,200,100,0.4); }
.ds-dot--success.ds-dot--filled { border-color: #6cda8c; color: #6cda8c; background: rgba(60,200,100,0.12); }

.ds-dot--failure              { border-color: rgba(220,80,80,0.3);   color: rgba(220,80,80,0.4); }
.ds-dot--failure.ds-dot--filled { border-color: #e07070; color: #e07070; background: rgba(220,80,80,0.12); }

.ds-roll-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 14px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.4);
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  color: var(--ion-color-primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.12s;
}

.ds-roll-btn:not(:disabled):hover { background: rgba(var(--ion-color-primary-rgb), 0.2); }
.ds-roll-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.ds-roll-result--rolling {
  font-weight: 700;
  animation: ds-flicker 0.06s infinite;
}

@keyframes ds-flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ── Last roll result ── */
.ds-last-roll {
  font-size: 0.78rem;
  font-weight: 600;
  text-align: center;
  padding: 4px 8px;
  border-radius: 6px;
}

.ds-last-roll--success { background: rgba(60,200,100,0.12); color: #6cda8c; }
.ds-last-roll--fail    { background: rgba(220,80,80,0.12);  color: #e07070; }
.ds-last-roll--crit    { background: rgba(255,215,0,0.15);  color: #ffd700; }
</style>
