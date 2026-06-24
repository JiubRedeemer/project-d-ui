<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import type {StateDto} from "@/api/statesApi.types";

defineProps<{
  state: StateDto | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{ (e: "close"): void }>();
</script>

<template>
  <ion-modal :is-open="isOpen" @didDismiss="emit('close')" :initial-breakpoint="1" :breakpoints="[0, 1]">
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Состояние</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('close')">Закрыть</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding" color="dark">
      <div v-if="state" class="state-modal">
        <h2 class="state-modal__name">{{ state.name ?? state.code }}</h2>
        <p v-if="state.code" class="state-modal__code">{{ state.code }}</p>
        <p v-if="state.description" class="state-modal__description">{{ state.description }}</p>
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.state-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.state-modal__name {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.state-modal__code {
  margin: 0;
  font-size: 12px;
  font-family: monospace;
  color: var(--ion-color-medium);
}

.state-modal__description {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: rgba(var(--ion-color-light-rgb), 0.85);
  white-space: pre-line;
}
</style>
