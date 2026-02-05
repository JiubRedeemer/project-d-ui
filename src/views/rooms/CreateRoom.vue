<script setup lang="ts">
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonInput,
  IonItem,
  IonPage,
  toastController,
  } from "@ionic/vue";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {ref} from "vue";
import axios from "axios";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {add, checkmark} from "ionicons/icons";
import {useAppRouter} from "@/composables/useAppRouter";

const { navigate, isDesktop } = useAppRouter();

const roomName = ref("");
const roomDescription = ref("");
const roomImage = ref<File | null>(null);
const previewImage = ref<string | null>(null);
const filePath = ref<string>("");

const fileInput = ref<HTMLInputElement | null>(null);

const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff", "image/svg+xml"];

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

const createRoom = async () => {
  if (!roomName.value.trim() || !roomImage.value) {
    await showValidationErrorToast();
    return;
  }

  filePath.value = await uploadToMinio(roomImage.value);


  try {
    const res = await axios.put(GATEWAY_INTEGRATION_ROUTES.baseURL +
        GATEWAY_INTEGRATION_ROUTES.api +
        GATEWAY_INTEGRATION_ROUTES.rooms, {
      name: roomName.value,
      description: roomDescription.value,
      filePath: filePath.value,
    }, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      }
    });

    if (res.status == 200) {
      navigate("/rooms", "forward", "push");
    }
  } catch (error) {
    console.error("Ошибка создания комнаты", error);
  }
};
</script>


<template>
  <ion-page>
    <RoomsHeader v-if="!isDesktop" :header-name="HEADERS.rooms.rus"></RoomsHeader>
    <ion-content :fullscreen="!isDesktop" color="dark">
      <!-- Desktop template -->
      <div v-if="isDesktop" class="desktop-content">
        <div class="desktop-card">
          <h1 class="desktop-title">Создать комнату</h1>
          <div class="desktop-image-wrapper" @click="triggerFileInput">
            <img v-if="previewImage" :src="previewImage" class="desktop-preview-img" alt="Room Image"/>
            <div v-else class="desktop-placeholder-img">
              <ion-icon :icon="add" class="placeholder-icon"></ion-icon>
            </div>
          </div>
          <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" style="display: none;"/>
          <ion-item color="dark" class="desktop-input-item" lines="none">
            <ion-input
                :label="TEXTS.roomName.rus"
                label-placement="floating"
                fill="outline"
                color="primary"
                :placeholder="TEXTS.enterRoomName.rus"
                :clear-input="true"
                v-model="roomName"
            ></ion-input>
          </ion-item>
          <ion-item color="dark" class="desktop-input-item" lines="none">
            <ion-input
                :label="TEXTS.roomDescription.rus"
                label-placement="floating"
                fill="outline"
                color="primary"
                :placeholder="TEXTS.enterRoomDescription.rus"
                v-model="roomDescription"
            ></ion-input>
          </ion-item>
          <ion-button expand="block" color="primary" @click="createRoom" class="desktop-submit">
            <ion-icon :icon="checkmark" slot="start"></ion-icon>
            Создать
          </ion-button>
        </div>
      </div>
      <!-- Mobile template -->
      <div v-else class="form-wrapper">
        <div class="image-wrapper" @click="triggerFileInput">
          <img v-if="previewImage" :src="previewImage" class="background-large-image" alt="Room Image"/>
          <div v-else class="placeholder-container">
            <ion-icon :icon="add" class="placeholder-icon"></ion-icon>
          </div>
          <div class="background-large-image-overlay"></div>
        </div>
        <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" style="display: none;"/>
        <ion-item color="dark" class="input-block">
          <ion-input
              :label="TEXTS.roomName.rus"
              label-placement="floating"
              fill="outline"
              color="primary"
              :placeholder="TEXTS.enterRoomName.rus"
              :clear-input="true"
              v-model="roomName"
          ></ion-input>
        </ion-item>
        <ion-item color="dark" class="input-block">
          <ion-input
              :label="TEXTS.roomDescription.rus"
              label-placement="floating"
              fill="outline"
              color="primary"
              :placeholder="TEXTS.enterRoomDescription.rus"
              v-model="roomDescription"
          ></ion-input>
        </ion-item>
        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
          <ion-fab-button color="primary" @click="createRoom">
            <ion-icon :icon="checkmark" color="dark"></ion-icon>
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

/* Desktop template */
.desktop-content {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--desktop-content-padding);
}
.desktop-card {
  max-width: var(--desktop-card-max-width);
  width: 100%;
  background: var(--ion-color-medium);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}
.desktop-title {
  margin: 0 0 20px 0;
  font-size: 1.25rem;
}
.desktop-image-wrapper {
  width: 100%;
  height: 200px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-bottom: 20px;
  overflow: hidden;
}
.desktop-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.desktop-placeholder-img {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.desktop-input-item {
  margin-bottom: 8px;
  --padding-start: 0;
  --inner-padding-end: 0;
}
.desktop-submit {
  margin-top: 16px;
}
</style>
