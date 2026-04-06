<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonIcon,
  IonInput,
  IonModal,
  IonTextarea,
  IonToolbar,
  toastController,
} from "@ionic/vue";
import {checkmarkOutline, close} from "ionicons/icons";
import {ref} from "vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {useCharacterStore} from "@/stores/CharacterStore";

const route = useRoute();
const characterStore = useCharacterStore();

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const traitName = ref("");
const traitDescription = ref("");

function resetForm() {
  traitName.value = "";
  traitDescription.value = "";
}

function closeModal() {
  resetForm();
  emit("close");
}

async function saveTrait() {
  const name = traitName.value?.trim();
  if (!name) {
    const toast = await toastController.create({
      message: "Введите название владения",
      duration: 1500,
      position: "top",
      color: "warning",
    });
    await toast.present();
    return;
  }

  const roomId = String(route.params.roomId);
  const characterId = String(route.params.characterId);

  try {
    await axios.put(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterId}/traits`,
      {
        name,
        description: (traitDescription.value ?? "").trim(),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );

    await characterStore.updateCharacterInStoreById(roomId, characterId);

    const toast = await toastController.create({
      message: "Владение создано",
      duration: 1500,
      position: "top",
      color: "success",
    });
    await toast.present();

    resetForm();
    emit("saved");
    emit("close");
  } catch (error) {
    console.error("Ошибка при создании владения:", error);
    const toast = await toastController.create({
      message: "Ошибка при создании владения",
      duration: 2000,
      position: "top",
      color: "danger",
    });
    await toast.present();
  }
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="closeModal"
    :can-dismiss="true"
    :expand-to-scroll="false"
    :handle="false"
    :initial-breakpoint="1"
    :breakpoints="[0, 1]"
  >
    <div class="block trait-modal-layout">
      <div class="sheet-top-zone">
        <div class="sheet-top-zone-handle" aria-hidden="true" />
        <ion-toolbar color="dark">
          <div class="toolbar-title">Новое владение</div>
          <ion-buttons slot="end">
            <ion-button @click="closeModal">
              <ion-icon :icon="close" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </div>

      <ion-content class="trait-ion-content" :scroll-y="true">
        <div class="modal-content">
          <div class="input-block">
            <ion-input
              v-model="traitName"
              type="text"
              fill="outline"
              color="primary"
              label="Название"
              label-placement="floating"
              placeholder="Введите название владения"
              class="input-block"
              shape="round"
            />
          </div>
          <div class="input-block">
            <ion-textarea
              v-model="traitDescription"
              fill="outline"
              color="primary"
              label="Описание"
              label-placement="floating"
              placeholder="Введите описание владения"
              :rows="4"
              :auto-grow="true"
              class="input-block"
              shape="round"
            />
          </div>
        </div>
      </ion-content>

      <div class="footer">
        <ion-button fill="outline" shape="round" @click="closeModal">Отмена</ion-button>
        <ion-button color="primary" shape="round" @click="saveTrait">
          <ion-icon slot="start" :icon="checkmarkOutline" />
          Сохранить
        </ion-button>
      </div>
    </div>
  </ion-modal>
</template>

<style scoped>
.block {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: min(90vh, 850px);
  max-height: min(90vh, 850px);
  overflow: hidden;
}

.trait-modal-layout {
  min-height: 0;
}

.sheet-top-zone {
  flex-shrink: 0;
}

.sheet-top-zone-handle {
  width: 40px;
  height: 5px;
  border-radius: 999px;
  margin: 10px auto 6px;
  background: rgba(var(--ion-color-light-rgb), 0.28);
}

.toolbar-title {
  font-size: 1.25rem;
  padding: 12px 16px;
}

.trait-ion-content {
  flex: 1;
  min-height: 0;
  --background: transparent;
}

.modal-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}

.input-block {
  width: 100%;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  width: 100%;
  box-sizing: border-box;
  background: rgba(var(--ion-color-dark-rgb), 0.92);
  border-top: 1px solid rgba(var(--ion-color-primary-rgb), 0.12);
}

ion-modal {
  --border-radius: 10px;
  --height: min(90vh, 850px);
  --width: 90%;
  --background: var(--ion-color-dark);
}
</style>
