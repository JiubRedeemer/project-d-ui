<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  toastController,
} from "@ionic/vue";
import {trashOutline} from "ionicons/icons";
import {computed, ref, watch} from "vue";
import {deleteCharacterState, getStatesForRoom, saveCharacterState} from "@/api/statesApi";
import type {StateDto} from "@/api/statesApi.types";
import type {Character} from "@/components/models/response/Character";
import {useRoomStore} from "@/stores/RoomStore";

const props = defineProps<{
  isOpen: boolean;
  roomId: string;
  character: Character | null;
}>();

const emit = defineEmits<{ (e: "close"): void }>();

const roomStore = useRoomStore();
const roomStates = ref<StateDto[]>([]);
const loadingRoomStates = ref(false);
const addingState = ref(false);
const selectedCode = ref("");

const characterStates = computed(() =>
    roomStore.characters.find(c => c.id === props.character?.id)?.states ?? []
);

const activeStateCodes = computed(() => new Set(characterStates.value.map(s => s.stateCode)));
const availableToAdd = computed(() =>
    roomStates.value.filter(s => s.code && !activeStateCodes.value.has(s.code))
);

function stateLabel(code: string | null | undefined): string {
  return roomStates.value.find(s => s.code === code)?.name ?? code ?? "—";
}

function stateDesc(code: string | null | undefined): string | null {
  return roomStates.value.find(s => s.code === code)?.description ?? null;
}

function patchCharacter(fn: (c: Character) => void) {
  const idx = roomStore.characters.findIndex(c => c.id === props.character?.id);
  if (idx !== -1) fn(roomStore.characters[idx]);
}

async function addState(code: string) {
  if (!code || addingState.value || !props.character) return;
  addingState.value = true;
  try {
    const saved = await saveCharacterState(props.roomId, props.character.id, {
      characterId: props.character.id,
      stateCode: code,
    });
    patchCharacter(c => {
      if (!c.states) c.states = [];
      c.states.push(saved);
    });
    selectedCode.value = "";
  } catch {
    const t = await toastController.create({message: "Ошибка при добавлении состояния", duration: 2000, color: "danger"});
    await t.present();
  } finally {
    addingState.value = false;
  }
}

async function removeState(stateId: string | null | undefined, stateCode: string | null | undefined) {
  if (!stateId || !props.character) return;
  try {
    await deleteCharacterState(props.roomId, props.character.id, stateId);
    patchCharacter(c => { c.states = c.states.filter(s => s.id !== stateId); });
  } catch {
    const t = await toastController.create({message: "Ошибка при удалении состояния", duration: 2000, color: "danger"});
    await t.present();
  }
}

watch(() => props.isOpen, async (open) => {
  if (!open || roomStates.value.length) return;
  loadingRoomStates.value = true;
  try {
    roomStates.value = await getStatesForRoom(props.roomId);
  } finally {
    loadingRoomStates.value = false;
  }
});
</script>

<template>
  <ion-modal :is-open="isOpen" @didDismiss="emit('close')" :initial-breakpoint="1" :breakpoints="[0, 1]">
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>{{ character?.name }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('close')">Закрыть</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" color="dark">
      <div v-if="loadingRoomStates" class="modal-loading">
        <ion-spinner name="crescent" color="primary"/>
      </div>

      <div v-else class="modal-body">
        <p class="modal-section-label">Активные состояния</p>

        <div v-if="characterStates.length" class="states-list">
          <div
              v-for="state in characterStates"
              :key="state.id ?? state.stateCode"
              class="state-card"
          >
            <div class="state-card__header">
              <span class="state-card__name">{{ stateLabel(state.stateCode) }}</span>
              <ion-button fill="clear" size="small" color="danger" @click="removeState(state.id, state.stateCode)">
                <ion-icon slot="icon-only" :icon="trashOutline"/>
              </ion-button>
            </div>
            <p v-if="stateDesc(state.stateCode)" class="state-card__desc">{{ stateDesc(state.stateCode) }}</p>
          </div>
        </div>
        <p v-else class="states-empty">Нет активных состояний</p>

        <div v-if="availableToAdd.length" class="add-row">
          <p class="modal-section-label">Добавить состояние</p>
          <ion-select
              v-model="selectedCode"
              interface="popover"
              placeholder="Выбрать состояние..."
              class="states-select"
              :disabled="addingState"
              @ion-change="addState($event.detail.value)"
          >
            <ion-select-option v-for="s in availableToAdd" :key="s.code" :value="s.code">
              {{ s.name ?? s.code }}
            </ion-select-option>
          </ion-select>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.modal-loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modal-section-label {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.add-row {
  margin-top: 8px;
}

.states-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.state-card {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  border-left: 3px solid var(--ion-color-danger);
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.92) 100%);
}

.state-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.state-card__name {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.state-card__desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: rgba(var(--ion-color-light-rgb), 0.7);
  white-space: pre-wrap;
}

.states-empty {
  margin: 0;
  font-size: 13px;
  color: rgba(var(--ion-color-light-rgb), 0.4);
}

.states-select {
  width: 100%;
  --padding-start: 12px;
  --padding-end: 12px;
  background: rgba(var(--ion-color-medium-rgb), 0.7);
  border-radius: 10px;
  border: 1px dashed rgba(var(--ion-color-danger-rgb), 0.4);
  color: var(--ion-color-danger);
  font-size: 14px;
  min-height: 40px;
}
</style>
