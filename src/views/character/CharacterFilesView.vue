<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useRoute } from "vue-router";
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
  toastController,
} from "@ionic/vue";
import { closeCircleOutline, documentTextOutline, eyeOutline, imageOutline } from "ionicons/icons";
import axios from "axios";
import Viewer from "viewerjs";
import "viewerjs/dist/viewer.css";
import type { UserFile } from "@/api/fileStorageApi.types";
import { downloadUserFileById, readVisibleUserFilesByRoomId } from "@/api/fileStorageApi";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";

const route = useRoute();
const userId = ref<string>("");
const files = ref<UserFile[]>([]);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

const roomId = computed(() => String(route.params.roomId ?? ""));
const selectedForPreview = ref<UserFile | null>(null);
const previewUrl = ref<string | null>(null);
const previewType = ref<string | null>(null);
const isPreviewOpen = ref(false);
const isPreviewLoading = ref(false);
const previewKind = ref<"image" | "pdf" | "text" | "other">("other");
const previewText = ref<string | null>(null);
const imagePreviewEl = ref<HTMLImageElement | null>(null);
let imageViewer: Viewer | null = null;

async function getMyId(): Promise<string> {
  const myIdResponse = await axios.get(`${GATEWAY_INTEGRATION_ROUTES.baseURL}/users/myId`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    },
  });

  const data = myIdResponse.data as unknown;
  if (typeof data === "string") return data;
  if (data && typeof data === "object" && "id" in (data as any)) {
    const id = (data as any).id;
    if (typeof id === "string") return id;
  }
  return String(data ?? "");
}

async function ensureUserId(): Promise<string> {
  if (userId.value) return userId.value;
  userId.value = await getMyId();
  return userId.value;
}

async function loadFiles() {
  const currentRoomId = roomId.value;
  if (!currentRoomId) return;

  isLoading.value = true;
  errorMessage.value = null;
  try {
    const currentUserId = await ensureUserId();
    files.value = await readVisibleUserFilesByRoomId(currentRoomId, currentUserId);
  } catch (e) {
    console.error("Failed to load room files:", e);
    errorMessage.value = "Не удалось загрузить файлы комнаты";
  } finally {
    isLoading.value = false;
  }
}

const sortedFiles = computed(() => {
  const arr = Array.isArray(files.value) ? files.value : [];
  return [...arr].sort((a, b) => {
    const ta = Date.parse(a.uploadedAt);
    const tb = Date.parse(b.uploadedAt);
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });
});

const isLikelyImageFile = (filename: string): boolean => {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".bmp") ||
    lower.endsWith(".svg")
  );
};

const isLikelyPdfFile = (filename: string): boolean => filename.toLowerCase().endsWith(".pdf");
const isLikelyTextFile = (filename: string): boolean => {
  const lower = filename.toLowerCase();
  return lower.endsWith(".txt") || lower.endsWith(".json");
};

const detectPreviewKind = (filename: string, mimeType: string | null | undefined) => {
  if (mimeType?.startsWith("image/") || isLikelyImageFile(filename)) return "image";
  if (mimeType === "application/pdf" || isLikelyPdfFile(filename)) return "pdf";
  if (mimeType === "application/json" || mimeType === "text/plain" || isLikelyTextFile(filename)) return "text";
  return "other";
};

const displayedPreviewName = computed(() => selectedForPreview.value?.filename ?? "");

async function openPreview(file: UserFile) {
  selectedForPreview.value = file;
  previewUrl.value = null;
  previewType.value = null;
  previewText.value = null;
  isPreviewOpen.value = true;
  isPreviewLoading.value = true;
  previewKind.value = detectPreviewKind(file.filename, undefined);

  try {
    const currentUserId = await ensureUserId();
    const rawBlob = await downloadUserFileById(file.id, currentUserId);
    const blob =
      isLikelyPdfFile(file.filename) && rawBlob.type !== "application/pdf"
        ? new Blob([rawBlob], { type: "application/pdf" })
        : rawBlob;

    previewType.value = blob.type || null;
    previewUrl.value = URL.createObjectURL(blob);
    previewKind.value = detectPreviewKind(file.filename, previewType.value);

    if (previewKind.value === "text") {
      previewText.value = await blob.text();
    }

    if (previewKind.value === "image") {
      await nextTick();
      if (imagePreviewEl.value) {
        imageViewer?.destroy();
        imageViewer = new Viewer(imagePreviewEl.value, {
          inline: true,
          backdrop: false,
          button: false,
          navbar: false,
          movable: true,
          zoomable: true,
          zoomOnTouch: true,
          zoomOnWheel: true,
          scalable: false,
          transition: true,
          keyboard: true,
          toggleOnDblclick: true,
          initialCoverage: 0.95,
          minZoomRatio: 0.1,
          maxZoomRatio: 20,
          toolbar: {
            zoomIn: { show: 1, size: "large" },
            zoomOut: { show: 1, size: "large" },
            oneToOne: { show: 1, size: "large" },
            reset: { show: 1, size: "large" },
          },
          title: false,
        });
        imageViewer.show();
      }
    }
  } catch (e) {
    console.error("Failed to open file:", e);
    isPreviewOpen.value = false;
    selectedForPreview.value = null;
    const toast = await toastController.create({
      message: "Не удалось открыть файл",
      duration: 2000,
      position: "top",
      color: "danger",
    });
    await toast.present();
  } finally {
    isPreviewLoading.value = false;
  }
}

function closePreview() {
  isPreviewOpen.value = false;
  imageViewer?.destroy();
  imageViewer = null;
  if (previewUrl.value?.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl.value);
  }
  selectedForPreview.value = null;
  previewUrl.value = null;
  previewType.value = null;
  previewText.value = null;
  previewKind.value = "other";
}

function openInNewTab() {
  if (!previewUrl.value) return;
  window.open(previewUrl.value, "_blank", "noopener,noreferrer");
}

onIonViewWillEnter(loadFiles);
</script>

<template>
  <ion-page>
    <ion-header :translucent="false">
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button />
        </ion-buttons>
        <ion-title>Файлы комнаты</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding" color="dark">
      <div v-if="errorMessage" class="character-files__error">
        {{ errorMessage }}
      </div>
      <ion-list class="character-files__list">
        <ion-item v-if="isLoading" color="dark">
          <ion-label>Загрузка файлов...</ion-label>
        </ion-item>
        <ion-item v-else-if="sortedFiles.length === 0" color="dark">
          <ion-label>Нет доступных файлов</ion-label>
        </ion-item>
        <ion-item v-for="f in sortedFiles" :key="f.id" color="dark">
          <ion-icon
            :icon="isLikelyImageFile(f.filename) ? imageOutline : documentTextOutline"
            slot="start"
          />
          <ion-label>
            <div class="character-files__filename">{{ f.filename }}</div>
            <div class="character-files__meta">{{ f.uploadedAt }}</div>
          </ion-label>
          <ion-button fill="clear" slot="end" @click="openPreview(f)">
            <ion-icon :icon="eyeOutline" />
          </ion-button>
        </ion-item>
      </ion-list>

      <ion-modal :is-open="isPreviewOpen" @didDismiss="closePreview">
        <ion-header v-if="previewKind !== 'image'">
          <ion-toolbar color="dark">
            <ion-label class="character-files__modal-title">
              {{ displayedPreviewName || "Файл" }}
            </ion-label>
            <ion-button slot="end" color="dark" @click="closePreview">
              <ion-icon :icon="closeCircleOutline" />
            </ion-button>
          </ion-toolbar>
        </ion-header>

        <ion-content
          :class="previewKind === 'image' ? 'character-files__preview-content--image' : 'ion-padding'"
          color="dark"
        >
          <ion-button
            v-if="previewKind === 'image' && !isPreviewLoading"
            class="character-files__image-close-button"
            fill="clear"
            color="light"
            @click="closePreview"
          >
            <ion-icon :icon="closeCircleOutline" />
          </ion-button>

          <div v-if="isPreviewLoading" class="character-files__loading">
            Загрузка файла...
          </div>

          <div v-else>
            <template v-if="previewKind === 'image'">
              <div class="character-files__image-lightbox">
                <img
                  v-if="previewUrl"
                  ref="imagePreviewEl"
                  :src="previewUrl"
                  class="character-files__preview-image"
                />
              </div>
            </template>

            <template v-else-if="previewKind === 'pdf'">
              <iframe
                v-if="previewUrl"
                :src="previewUrl"
                class="character-files__preview-frame"
                title="PDF preview"
              />
              <div v-else class="character-files__non-image">
                <p>Тип: {{ previewType || "unknown" }}</p>
                <ion-button @click="openInNewTab">Открыть</ion-button>
              </div>
            </template>

            <template v-else-if="previewKind === 'text'">
              <pre v-if="previewText != null" class="character-files__preview-text">{{ previewText }}</pre>
              <div v-else class="character-files__non-image">
                <p>Тип: {{ previewType || "unknown" }}</p>
                <ion-button @click="openInNewTab">Открыть</ion-button>
              </div>
            </template>

            <template v-else>
              <div class="character-files__non-image">
                <p>Тип: {{ previewType || "unknown" }}</p>
                <ion-button @click="openInNewTab">Открыть</ion-button>
              </div>
            </template>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.character-files__list {
  background: transparent;
}

.character-files__filename {
  font-weight: 600;
}

.character-files__meta {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin-top: 2px;
}

.character-files__error {
  color: var(--ion-color-danger);
  margin-bottom: 8px;
}

.character-files__modal-title {
  font-weight: 600;
}

.character-files__loading {
  color: var(--ion-color-medium);
}

.character-files__preview-content--image {
  --padding-top: 0;
  --padding-bottom: 0;
  --padding-start: 0;
  --padding-end: 0;
}

.character-files__image-lightbox {
  width: 100%;
  min-height: 100%;
  background: #050505;
}

.character-files__image-close-button {
  position: absolute;
  top: max(8px, env(safe-area-inset-top, 0));
  right: 8px;
  z-index: 50;
  --background: rgba(0, 0, 0, 0.35);
  --border-radius: 999px;
}

.character-files__preview-image {
  width: 100%;
  height: calc(100vh - env(safe-area-inset-top, 0) - env(safe-area-inset-bottom, 0));
  object-fit: contain;
  border-radius: 0;
}

:deep(.viewer-container) {
  width: 100%;
  min-height: calc(100vh - env(safe-area-inset-top, 0) - env(safe-area-inset-bottom, 0));
  border-radius: 0;
  background: #050505;
}

:deep(.viewer-canvas) {
  background: #050505;
}

:deep(.viewer-toolbar > ul) {
  transform: scale(0.9);
  margin-bottom: 16px;
}

.character-files__preview-frame {
  width: 100%;
  height: 90vh;
  border: none;
  border-radius: 8px;
  background: transparent;
}

.character-files__preview-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.35;
  max-height: 70vh;
  overflow: auto;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.character-files__non-image p {
  margin: 0 0 12px 0;
}
</style>

