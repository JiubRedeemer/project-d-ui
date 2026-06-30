<script setup lang="ts">
import { IonModal, IonButton, IonIcon, IonInput } from "@ionic/vue";
import { closeOutline } from "ionicons/icons";
import { ref, watch } from "vue";
import type { ChargesRefillEnum } from "@/components/models/response/MagicApi";

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "submit", payload: { name: string; maxCount: number; refillRestType: ChargesRefillEnum }): void;
}>();

const name = ref("");
const maxCount = ref(1);
const refillRestType = ref<ChargesRefillEnum>("LONG_REST");

watch(() => props.isOpen, (v) => {
  if (v) {
    name.value = "";
    maxCount.value = 1;
    refillRestType.value = "LONG_REST";
  }
});

function submit() {
  const trimmed = name.value.trim();
  if (!trimmed) return;
  emit("submit", {
    name: trimmed,
    maxCount: Math.max(1, maxCount.value),
    refillRestType: refillRestType.value,
  });
}
</script>

<template>
  <ion-modal
    :is-open="props.isOpen"
    @didDismiss="emit('close')"
    :can-dismiss="true"
    :handle="false"
    :initial-breakpoint="1"
    :breakpoints="[0, 1]"
  >
    <div class="modal-layout spellbook-theme">
      <div class="handle-bar" aria-hidden="true" />

      <div class="modal-header">
        <div class="modal-title">Новый ресурс</div>
        <button class="close-btn" @click="emit('close')">
          <ion-icon :icon="closeOutline" />
        </button>
      </div>

      <div class="modal-body">

        <!-- Название -->
        <div class="field-group">
          <div class="field-label">Название</div>
          <div class="input-wrapper">
            <ion-input
              v-model="name"
              class="styled-input"
              placeholder="Ци, Ярость, Канал Божества…"
              :maxlength="40"
              @keyup.enter="submit"
              autofocus
            />
          </div>
        </div>

        <!-- Максимум зарядов -->
        <div class="field-group">
          <div class="field-label">Количество зарядов</div>
          <div class="counter-row">
            <button class="counter-btn" @click="maxCount = Math.max(1, maxCount - 1)">−</button>
            <div class="counter-value">{{ maxCount }}</div>
            <button class="counter-btn" @click="maxCount++">+</button>
          </div>
        </div>

        <!-- Тип восстановления -->
        <div class="field-group">
          <div class="field-label">Восстанавливается после</div>
          <div class="rest-options">
            <button
              class="rest-option"
              :class="{ active: refillRestType === 'SHORT_REST' }"
              @click="refillRestType = 'SHORT_REST'"
            >
              <div class="rest-option-icon">🌙</div>
              <div class="rest-option-text">
                <div class="rest-option-title">Короткий отдых</div>
                <div class="rest-option-sub">1 час</div>
              </div>
            </button>
            <button
              class="rest-option"
              :class="{ active: refillRestType === 'LONG_REST' }"
              @click="refillRestType = 'LONG_REST'"
            >
              <div class="rest-option-icon">☀️</div>
              <div class="rest-option-text">
                <div class="rest-option-title">Длинный отдых</div>
                <div class="rest-option-sub">8 часов</div>
              </div>
            </button>
          </div>
        </div>

      </div>

      <div class="modal-footer">
        <ion-button
          expand="block"
          color="secondary"
          shape="round"
          class="submit-btn"
          :disabled="!name.trim()"
          @click="submit"
        >
          Добавить ресурс
        </ion-button>
      </div>
    </div>
  </ion-modal>
</template>

<style scoped>
.modal-layout {
  display: flex;
  flex-direction: column;
  padding: 0 0 env(safe-area-inset-bottom, 0);
  background: var(--ion-background-color, #1a1a2e);
}

.handle-bar {
  width: 40px;
  height: 5px;
  border-radius: 999px;
  margin: 10px auto 0;
  background: rgba(var(--ion-color-light-rgb), 0.22);
  flex-shrink: 0;
}

/* ── Header ── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 8px;
  flex-shrink: 0;
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--ion-color-light);
  letter-spacing: 0.01em;
}

.close-btn {
  background: rgba(var(--ion-color-light-rgb), 0.08);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(var(--ion-color-light-rgb), 0.55);
  cursor: pointer;
  font-size: 1.1rem;
  transition: background 0.15s, color 0.15s;
}
.close-btn:active {
  background: rgba(var(--ion-color-light-rgb), 0.15);
  color: var(--ion-color-light);
}

/* ── Body ── */
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 12px 20px 4px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(var(--ion-color-primary-rgb), 0.85);
}

/* ── Text input ── */
.input-wrapper {
  background: rgba(var(--ion-color-light-rgb), 0.07);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.input-wrapper:focus-within {
  border-color: rgba(var(--ion-color-primary-rgb), 0.5);
  background: rgba(var(--ion-color-primary-rgb), 0.05);
}

.styled-input {
  --background: transparent;
  --color: var(--ion-color-light);
  --placeholder-color: rgba(var(--ion-color-light-rgb), 0.35);
  --padding-start: 14px;
  --padding-end: 14px;
  --padding-top: 10px;
  --padding-bottom: 10px;
  font-size: 0.95rem;
}

/* ── Counter ── */
.counter-row {
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(var(--ion-color-light-rgb), 0.07);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  border-radius: 12px;
  overflow: hidden;
  align-self: flex-start;
  min-width: 140px;
}

.counter-btn {
  background: transparent;
  border: none;
  color: var(--ion-color-light);
  font-size: 1.4rem;
  width: 44px;
  height: 44px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s;
  flex-shrink: 0;
}
.counter-btn:active {
  background: rgba(var(--ion-color-light-rgb), 0.1);
}

.counter-value {
  flex: 1;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ion-color-light);
  border-left: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
  border-right: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
  height: 44px;
  line-height: 44px;
}

/* ── Rest options ── */
.rest-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.rest-option {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(var(--ion-color-light-rgb), 0.05);
  border: 1.5px solid rgba(var(--ion-color-light-rgb), 0.1);
  border-radius: 14px;
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  text-align: left;
}
.rest-option:active {
  background: rgba(var(--ion-color-light-rgb), 0.1);
}
.rest-option.active {
  border-color: rgba(var(--ion-color-primary-rgb), 0.7);
  background: rgba(var(--ion-color-primary-rgb), 0.1);
}

.rest-option-icon {
  font-size: 1.5rem;
  line-height: 1;
  flex-shrink: 0;
}

.rest-option-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rest-option-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ion-color-light);
  line-height: 1.2;
}

.rest-option-sub {
  font-size: 0.72rem;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

/* ── Footer ── */
.modal-footer {
  padding: 16px 20px 20px;
  flex-shrink: 0;
}

.submit-btn {
  --border-radius: 14px;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
}
</style>
