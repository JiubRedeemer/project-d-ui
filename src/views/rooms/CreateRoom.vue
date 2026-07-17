<script setup lang="ts">
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSpinner,
  IonToggle,
  toastController,
  useIonRouter
} from "@ionic/vue";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {ref} from "vue";
import axios from "axios";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {add, arrowForward} from "ionicons/icons";
import {useRoomCreationStore} from "@/stores/RoomCreationStore";

const ionRouter = useIonRouter();

const roomName = ref("");
const roomDescription = ref("");
const roomIsPublic = ref(false);
const roomImage = ref<File | null>(null);
const isCreating = ref(false);
const previewImage = ref<string | null>(null);
const filePath = ref<string>("");

const fileInput = ref<HTMLInputElement | null>(null);

const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff", "image/svg+xml"];
const roomCreationStore = useRoomCreationStore();
const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0] || null;
  if (file && allowedFormats.includes(file.type)) {
    roomImage.value = file;
    const reader = new FileReader();
    reader.onload = () => {
      previewImage.value = reader.result as string;
    };
    reader.readAsDataURL(file);
  } else {
    alert("Формат файла не поддерживается. Разрешены: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG.");
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const uploadToMinio = async (file: File) => {

  const res = await axios.put(
      `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
      FILE_STORAGE_INTEGRATION_ROUTES.api +
      FILE_STORAGE_INTEGRATION_ROUTES.room_images_bucket +
      FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
      {
        file
      },
      {
        headers: {
          "Content-Type": "multipart/form-data",
        }
      }
  );
  return res.data;

};

async function showValidationErrorToast() {
  const toast = await toastController.create({
    message: TEXTS.fieldCantBeEmptyRoom.rus,
    duration: 1500,
    position: 'top'
  })
  await toast.present();
}

async function showCreationErrorToast() {
  const toast = await toastController.create({
    message: "Не удалось создать комнату. Попробуйте ещё раз.",
    duration: 2000,
    position: 'top'
  })
  await toast.present();
}

/**
 * Комната создаётся сразу: наборы правил включаются уже для существующей комнаты,
 * поэтому сборка происходит следующим шагом.
 */
const createRoom = async () => {
  if (isCreating.value) return;
  if (!roomName.value.trim()) {
    await showValidationErrorToast();
    return;
  }

  isCreating.value = true;
  try {
    if (roomImage.value) filePath.value = await uploadToMinio(roomImage.value);

    roomCreationStore.roomInfo.name = roomName.value;
    roomCreationStore.roomInfo.description = roomDescription.value;
    roomCreationStore.roomInfo.filePath = filePath.value;
    roomCreationStore.roomInfo.isPublic = roomIsPublic.value;
    const roomId = await roomCreationStore.createRoom();
    ionRouter.navigate(`/rooms/create/bundles/${roomId}`, 'forward', 'push');
  } catch (error) {
    console.error("Ошибка создания комнаты", error);
    await showCreationErrorToast();
  } finally {
    isCreating.value = false;
  }
};
</script>


<template>
  <ion-page>
    <RoomsHeader :header-name="HEADERS.rooms.rus"></RoomsHeader>
    <ion-content :fullscreen="true" color="dark">
      <div class="form-wrapper">
        <div class="image-wrapper" @click="triggerFileInput">
          <img v-if="previewImage" :src="previewImage" class="background-large-image" alt="Room Image"/>
          <div v-else class="placeholder-container">
            <ion-icon :icon="add" class="placeholder-icon"></ion-icon>
          </div>
          <div class="background-large-image-overlay"></div>
        </div>
        <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" style="display: none;"/>
        <ion-item color="dark" class="input-block">
          <ion-input :label="TEXTS.roomName.rus" label-placement="floating" fill="outline" color="primary"
                     :placeholder="TEXTS.enterRoomName.rus" :clear-input="true" v-model="roomName"></ion-input>
        </ion-item>
        <ion-item color="dark" class="input-block">
          <ion-input :label="TEXTS.roomDescription.rus" label-placement="floating" fill="outline" color="primary"
                     :placeholder="TEXTS.enterRoomDescription.rus" v-model="roomDescription"></ion-input>
        </ion-item>
        <ion-item color="dark" class="input-block">
          <ion-label>Публичная комната</ion-label>
          <ion-toggle v-model="roomIsPublic" slot="end" color="primary"/>
        </ion-item>
        <p class="rules-hint">
          Правила комнаты собираются из наборов — расы, классы и предыстории вы выберете на следующем шаге.
        </p>
        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
          <ion-fab-button color="primary" :disabled="isCreating" @click="createRoom">
            <ion-spinner v-if="isCreating" name="crescent" color="dark"></ion-spinner>
            <ion-icon v-else :icon="arrowForward" color="dark"></ion-icon>
          </ion-fab-button>
        </ion-fab>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.form-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px;
}

.image-wrapper {
  position: relative;
  width: 100%;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 7%;
  background: rgba(255, 255, 255, 0.1);
}

.background-large-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 7%;
}

.placeholder-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.placeholder-icon {
  font-size: 48px;
  color: white;
}

.background-large-image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 100%);
  color: white;
  text-align: center;
  padding: 20px;
  border-radius: 0 0 7% 7%;
}

.input-block {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.rules-hint {
  width: 100%;
  margin: 0;
  font-size: 13px;
  color: rgba(var(--ion-color-light-rgb), 0.6);
}

@media (min-width: 1024px) {
  .form-wrapper {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px;
    display: grid;
    grid-template-columns: minmax(320px, 430px) minmax(420px, 1fr);
    grid-template-areas:
      "image name"
      "image description"
      "image public"
      "image hint";
    align-items: start;
    column-gap: 22px;
    row-gap: 14px;
  }

  .image-wrapper {
    grid-area: image;
    height: 420px;
    border-radius: 18px;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
    overflow: hidden;
  }

  .background-large-image {
    border-radius: 18px;
  }

  .background-large-image-overlay {
    border-radius: 0;
  }

  .input-block {
    margin: 0;
    border-radius: 12px;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
    --inner-padding-start: 10px;
    --inner-padding-end: 10px;
  }

  .input-block:nth-of-type(1) { grid-area: name; }
  .input-block:nth-of-type(2) { grid-area: description; }
  .input-block:nth-of-type(3) { grid-area: public; }
  .rules-hint { grid-area: hint; }

  ion-fab {
    margin-right: 14px;
    margin-bottom: 14px;
  }
}
</style>
