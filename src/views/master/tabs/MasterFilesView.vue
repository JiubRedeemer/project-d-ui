<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonReorder,
  IonReorderGroup,
  onIonViewWillEnter,
  toastController,
} from "@ionic/vue";
import { add, closeCircleOutline, documentTextOutline, downloadOutline, eyeOutline, imageOutline } from "ionicons/icons";
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type { UserFile } from "@/api/fileStorageApi.types";
import {
  changeUserFileVisible,
  downloadUserFileById,
  deleteUserFileById,
  readAllUserFilesByUserId,
  uploadUserFile,
} from "@/api/fileStorageApi";
import Viewer from "viewerjs";
import "viewerjs/dist/viewer.css";
import {v4 as uuidv4} from "uuid";

const userId = ref<string>("");
const route = useRoute();
const roomId = computed(() => String(route.params.roomId ?? ""));
const userFiles = ref<UserFile[]>([]);
const didLoadOnce = ref(false);
const isDesktop = ref<boolean>(window.innerWidth >= 1024);
const onResize = () => {
  isDesktop.value = window.innerWidth >= 1024;
};

const fileInput = ref<HTMLInputElement | null>(null);
const isLoading = ref(false);
const isUploading = ref(false);
const errorMessage = ref<string | null>(null);
const MAX_PREVIEW_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const displayedFileName = (storedFilename: string): string => {
  const underscoreIndex = storedFilename.indexOf('_');

  if (underscoreIndex === -1) {
    return storedFilename; // если "_" нет — возвращаем как есть
  }

  return storedFilename.slice(underscoreIndex + 1);
};

const getFileSizeBytes = (file: UserFile): number | null => {
  const sizeCandidate = (file as any).size ?? (file as any).fileSize ?? (file as any).contentLength;
  if (typeof sizeCandidate !== "number" || !Number.isFinite(sizeCandidate)) return null;
  return sizeCandidate;
};

const isTooLargeForPreview = (file: UserFile): boolean => {
  const size = getFileSizeBytes(file);
  return size !== null && size > MAX_PREVIEW_FILE_SIZE_BYTES;
};

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

async function refreshFiles() {
  if (!userId.value) return;
  isLoading.value = true;
  errorMessage.value = null;
  try {
    userFiles.value = await readAllUserFilesByUserId(route.params.roomId as string, userId.value);
  } catch (e) {
    console.error("Failed to load user files:", e);
    errorMessage.value = "Не удалось загрузить список файлов";
  } finally {
    isLoading.value = false;
  }
}

const sortedUserFiles = computed(() => {
  const arr = Array.isArray(userFiles.value) ? userFiles.value : [];
  return [...arr].sort((a, b) => {
    const ta = Date.parse(a.uploadedAt);
    const tb = Date.parse(b.uploadedAt);
    // if parsing fails, treat as 0
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });
});

const visibleForAllFiles = computed(() => sortedUserFiles.value.filter((f) => f.visible));
const visibleOnlyForMeFiles = computed(() => sortedUserFiles.value.filter((f) => !f.visible));

onIonViewWillEnter(async () => {
  if (userId.value) {
    await refreshFiles();
    return;
  }
  try {
    userId.value = await getMyId();
    await refreshFiles();
  } catch (e) {
    console.error("Failed to get myId:", e);
    errorMessage.value = "Не удалось получить идентификатор пользователя";
  }
});

onMounted(async () => {
  window.addEventListener("resize", onResize);

  if (didLoadOnce.value) return;
  didLoadOnce.value = true;
  try {
    userId.value = await ensureUserId();
    await refreshFiles();
  } catch (e) {
    console.error("Failed to load files on mount:", e);
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});

async function ensureUserId(): Promise<string> {
  if (userId.value) return userId.value;
  userId.value = await getMyId();
  return userId.value;
}

function triggerFileInput() {
  fileInput.value?.click();
}

async function uploadAndRefresh(file: File) {
  const currentUserId = await ensureUserId();
  const originalName = file.name;
  const storedFilename = `${uuidv4()}_${originalName}`; // userId + исходное_название_файла

  isUploading.value = true;
  errorMessage.value = null;

  try {
    const currentRoomId = roomId.value;
    if (!currentRoomId) {
      throw new Error("Room id is required for file upload");
    }
    await uploadUserFile(currentUserId, currentRoomId, true, file, storedFilename);
    await refreshFiles();
  } catch (e) {
    console.error("Upload failed:", e);
    errorMessage.value = "Ошибка при загрузке файла";
    const toast = await toastController.create({
      message: "Ошибка при загрузке файла",
      duration: 2000,
      position: "top",
      color: "danger",
    });
    await toast.present();
  } finally {
    isUploading.value = false;
  }
}

const selectedForPreview = ref<UserFile | null>(null);
const previewUrl = ref<string | null>(null);
const previewType = ref<string | null>(null);
const isPreviewOpen = ref(false);
const isPreviewLoading = ref(false);
const previewKind = ref<"image" | "pdf" | "text" | "other">("other");
const previewText = ref<string | null>(null);
const imagePreviewEl = ref<HTMLImageElement | null>(null);
let imageViewer: Viewer | null = null;

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

const isLikelyPdfFile = (filename: string): boolean => {
  const lower = filename.toLowerCase();
  return lower.endsWith(".pdf");
};

const isLikelyTextFile = (filename: string): boolean => {
  const lower = filename.toLowerCase();
  return lower.endsWith(".txt") || lower.endsWith(".json");
};

const detectPreviewKind = (filename: string, mimeType: string | null | undefined) => {
  if (mimeType?.startsWith("image/") || isLikelyImageFile(filename)) return "image";
  if (mimeType === "application/pdf" || isLikelyPdfFile(filename)) return "pdf";
  if (mimeType === "application/json" || mimeType === "text/plain" || isLikelyTextFile(filename))
    return "text";
  return "other";
};

const isChangingVisible = ref(false);

async function openPreview(file: UserFile) {
  if (isTooLargeForPreview(file)) {
    const toast = await toastController.create({
      message: "Файл слишком велик для просмотра (больше 10 МБ)",
      duration: 2500,
      position: "top",
      color: "warning",
    });
    await toast.present();
    return;
  }

  selectedForPreview.value = file;
  previewUrl.value = null;
  previewType.value = null;
  isPreviewOpen.value = true;
  isPreviewLoading.value = true;
  previewKind.value = detectPreviewKind(file.filename, undefined);
  previewText.value = null;

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
            zoomIn: {
              show: 1,
              size: "large",
            },
            zoomOut: {
              show: 1,
              size: "large",
            },
            oneToOne: {
              show: 1,
              size: "large",
            },
            reset: {
              show: 1,
              size: "large",
            },
          },
          title: false,
        });
        imageViewer.show();
      }
    }
  } catch (e) {
    console.error("Preview failed:", e);
    selectedForPreview.value = null;
    isPreviewOpen.value = false;
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

async function downloadFile(file: UserFile) {
  try {
    const currentUserId = await ensureUserId();
    const blob = await downloadUserFileById(file.id, currentUserId);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = displayedFileName(file.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Download failed:", e);
    const toast = await toastController.create({
      message: "Не удалось скачать файл",
      duration: 2000,
      position: "top",
      color: "danger",
    });
    await toast.present();
  }
}

function closePreview() {
  isPreviewOpen.value = false;
  imageViewer?.destroy();
  imageViewer = null;
  // We now use direct URLs for image/pdf, only revoke if blob:
  if (previewUrl.value?.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = null;
  previewType.value = null;
  previewKind.value = "other";
  previewText.value = null;
  selectedForPreview.value = null;
}

const displayedPreviewName = computed(() =>
  selectedForPreview.value ? displayedFileName(selectedForPreview.value.filename) : ""
);

function openInNewTab() {
  if (!previewUrl.value) return;
  window.open(previewUrl.value, "_blank", "noopener,noreferrer");
}

async function changeVisibleAndRefresh(file: UserFile, visible: boolean) {
  if (file.visible === visible || isChangingVisible.value) return;

  try {
    const currentUserId = await ensureUserId();
    const currentRoomId = roomId.value;
    if (!currentRoomId) {
      throw new Error("Room id is required for changing visibility");
    }

    isChangingVisible.value = true;
    await changeUserFileVisible(currentUserId, currentRoomId, visible, file.filename);
    await refreshFiles();
  } catch (e) {
    console.error("Change visible failed:", e);
    const toast = await toastController.create({
      message: "Не удалось изменить видимость файла",
      duration: 2000,
      position: "top",
      color: "danger",
    });
    await toast.present();
  } finally {
    isChangingVisible.value = false;
  }
}

async function onIonicReorder(event: CustomEvent<{ from: number; to: number; complete: (listOrReorder?: boolean) => void }>) {
  const from = event.detail.from;
  const to = event.detail.to;
  const dividerIndex = visibleForAllFiles.value.length;

  // Keep backend ordering unchanged; we only use drop zone to switch visibility.
  event.detail.complete(false);

  // Divider is not a file row.
  if (from === dividerIndex) return;

  const sourceFiles = [...visibleForAllFiles.value, ...visibleOnlyForMeFiles.value];
  const sourceIndex = from > dividerIndex ? from - 1 : from;
  const movedFile = sourceFiles[sourceIndex];
  if (!movedFile) return;

  let targetVisible: boolean;
  if (to < dividerIndex) {
    targetVisible = true;
  } else if (to > dividerIndex) {
    targetVisible = false;
  } else {
    // Dropped on divider; interpret as move to opposite group.
    targetVisible = !movedFile.visible;
  }

  await changeVisibleAndRefresh(movedFile, targetVisible);
}

async function onDelete(file: UserFile) {
  const ok = window.confirm(`Удалить файл "${displayedFileName(file.filename)}"?`);
  if (!ok) return;

  try {
    const currentUserId = await ensureUserId();
    await deleteUserFileById(file.id, currentUserId);
    await refreshFiles();
    if (selectedForPreview.value?.id === file.id) closePreview();
  } catch (e) {
    console.error("Delete failed:", e);
    const toast = await toastController.create({
      message: "Ошибка при удалении файла",
      duration: 2000,
      position: "top",
      color: "danger",
    });
    await toast.present();
  }
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  if (!file) return;

  try {
    await uploadAndRefresh(file);
  } finally {
    // allow uploading the same file again
    if (fileInput.value) fileInput.value.value = "";
  }
}
</script>

<template>
  <div class="master-files">
    <input
      ref="fileInput"
      type="file"
      class="master-files__file-input--hidden"
      accept=".json,.txt,.pdf,.jpeg,.jpg,.png,application/json,text/plain,application/pdf,image/jpeg,image/png"
      @change="onFileSelected"
    />

    <div v-if="errorMessage" class="master-files__error">
      {{ errorMessage }}
    </div>

    <div v-if="isLoading" class="master-files__loading-list">
      Загрузка списка...
    </div>

    <div v-else-if="sortedUserFiles.length === 0" class="master-files__loading-list">
      Нет файлов
    </div>

    <ion-list v-else class="master-files__list">
      <ion-item lines="none" class="master-files__group-header" color="dark">
        <ion-label class="master-files__group-title">Видимые для всех</ion-label>
      </ion-item>

      <ion-reorder-group
        class="master-files__groups"
        :disabled="isChangingVisible"
        @ionItemReorder="onIonicReorder"
      >
        <ion-item
          v-for="f in visibleForAllFiles"
          :key="`public-${f.id}`"
          color="dark"
        >
          <ion-reorder slot="start" />
          <ion-icon
            :icon="isLikelyImageFile(f.filename) ? imageOutline : documentTextOutline"
            slot="start"
          />
          <ion-label>
            <div class="master-files__filename">{{ displayedFileName(f.filename) }}</div>
            <div class="master-files__meta">{{ f.uploadedAt }}</div>
            <div v-if="isTooLargeForPreview(f)" class="master-files__warning">
              Файл слишком велик для просмотра (больше 10 МБ)
            </div>
          </ion-label>
          <ion-button fill="clear" slot="end" @click="downloadFile(f)">
            <ion-icon :icon="downloadOutline" />
          </ion-button>
          <ion-button
            fill="clear"
            slot="end"
            :disabled="(isPreviewOpen && isPreviewLoading) || isTooLargeForPreview(f)"
            :title="isTooLargeForPreview(f) ? 'Файл слишком велик для просмотра (больше 10 МБ)' : ''"
            @click="openPreview(f)"
          >
            <ion-icon :icon="eyeOutline" />
          </ion-button>
          <ion-button fill="clear" slot="end" color="danger" @click="onDelete(f)">
            <ion-icon :icon="closeCircleOutline" />
          </ion-button>
        </ion-item>

        <ion-item lines="full" class="master-files__group-divider" color="dark">
          <ion-label class="master-files__group-title">Видимые только для меня</ion-label>
        </ion-item>

        <ion-item
          v-for="f in visibleOnlyForMeFiles"
          :key="`private-${f.id}`"
          color="dark"
        >
          <ion-reorder slot="start" />
          <ion-icon
            :icon="isLikelyImageFile(f.filename) ? imageOutline : documentTextOutline"
            slot="start"
          />
          <ion-label>
            <div class="master-files__filename">{{ displayedFileName(f.filename) }}</div>
            <div class="master-files__meta">{{ f.uploadedAt }}</div>
            <div v-if="isTooLargeForPreview(f)" class="master-files__warning">
              Файл слишком велик для просмотра (больше 10 МБ)
            </div>
          </ion-label>
          <ion-button fill="clear" slot="end" @click="downloadFile(f)">
            <ion-icon :icon="downloadOutline" />
          </ion-button>
          <ion-button
            fill="clear"
            slot="end"
            :disabled="(isPreviewOpen && isPreviewLoading) || isTooLargeForPreview(f)"
            :title="isTooLargeForPreview(f) ? 'Файл слишком велик для просмотра (больше 10 МБ)' : ''"
            @click="openPreview(f)"
          >
            <ion-icon :icon="eyeOutline" />
          </ion-button>
          <ion-button fill="clear" slot="end" color="danger" @click="onDelete(f)">
            <ion-icon :icon="closeCircleOutline" />
          </ion-button>
        </ion-item>
      </ion-reorder-group>

      <ion-item
        v-if="visibleForAllFiles.length === 0"
        lines="none"
        color="dark"
      >
        <ion-label class="master-files__empty-group">
          В верхней группе нет файлов. Перетащите сюда из нижней.
        </ion-label>
      </ion-item>
      <ion-item
        v-if="visibleOnlyForMeFiles.length === 0"
        lines="none"
        color="dark"
      >
        <ion-label class="master-files__empty-group">
          В нижней группе нет файлов. Перетащите сюда из верхней.
        </ion-label>
      </ion-item>
    </ion-list>

    <ion-modal
      :is-open="isPreviewOpen"
      @didDismiss="closePreview"
      :class="{ 'master-files__preview-modal--desktop': isDesktop }"
    >
      <ion-header v-if="previewKind !== 'image'">
        <ion-toolbar color="dark">
          <ion-label class="master-files__modal-title">
            {{ displayedPreviewName || "Файл" }}
          </ion-label>
          <ion-button slot="end" color="dark" @click="closePreview">
            <ion-icon :icon="closeCircleOutline" />
          </ion-button>
        </ion-toolbar>
      </ion-header>

      <ion-content
        :class="previewKind === 'image' ? 'master-files__preview-content--image' : 'ion-padding'"
        :scroll-y="previewKind !== 'image'"
        color="dark"
      >
        <ion-button
          v-if="previewKind === 'image' && !isPreviewLoading"
          class="master-files__image-close-button"
          fill="clear"
          color="light"
          @click="closePreview"
        >
          <ion-icon :icon="closeCircleOutline" />
        </ion-button>

        <div v-if="isPreviewLoading" class="master-files__loading">
          Загрузка файла...
        </div>

        <div v-else>
          <template v-if="previewKind === 'image'">
            <div class="master-files__image-lightbox">
              <img
                v-if="previewUrl"
                ref="imagePreviewEl"
                :src="previewUrl"
                class="master-files__preview-image"
              />
            </div>
          </template>

          <template v-else-if="previewKind === 'pdf'">
            <object
              v-if="previewUrl"
              :data="previewUrl"
              type="application/pdf"
              class="master-files__preview-frame"
            >
              <div class="master-files__non-image">
                <p>Не удалось встроенно отобразить PDF</p>
                <ion-button @click="openInNewTab">Открыть PDF</ion-button>
              </div>
            </object>
            <div v-else class="master-files__non-image">
              <p>Тип: {{ previewType || "unknown" }}</p>
              <ion-button @click="openInNewTab">Открыть</ion-button>
            </div>
          </template>

          <template v-else-if="previewKind === 'text'">
            <pre v-if="previewText != null" class="master-files__preview-text">{{ previewText }}</pre>
            <div v-else class="master-files__non-image">
              <p>Тип: {{ previewType || "unknown" }}</p>
              <ion-button @click="openInNewTab">Открыть</ion-button>
            </div>
          </template>

          <template v-else>
            <div class="master-files__non-image">
              <p>Тип: {{ previewType || "unknown" }}</p>
              <ion-button @click="openInNewTab">Открыть</ion-button>
            </div>
          </template>
        </div>
      </ion-content>
    </ion-modal>

    <div class="add-new-button">
      <ion-button
        size="large"
        shape="round"
        color="secondary"
        :disabled="isUploading"
        @click="triggerFileInput"
      >
        <ion-icon slot="icon-only" :icon="add" />
      </ion-button>
    </div>
  </div>
</template>

<style scoped>
.master-files {
  width: 100%;
  padding-bottom: 84px;
}

.master-files__list {
  background: transparent;
}

.master-files__groups {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.master-files__group {
  border: 1px dashed rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  padding: 8px;
}

.master-files__group-title {
  font-size: 13px;
  font-weight: 700;
  margin: 4px 8px 8px;
  color: var(--ion-color-medium);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.master-files__file-input--hidden {
  display: none;
}

.master-files__error {
  color: var(--ion-color-danger);
  margin: 8px 0;
  padding: 0 8px;
}

.master-files__filename {
  font-weight: 600;
}

.master-files__meta {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin-top: 2px;
}

.master-files__warning {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ion-color-warning);
}

.master-files__modal-title {
  font-weight: 600;
}

.master-files__loading {
  color: var(--ion-color-medium);
}

.master-files__loading-list {
  color: var(--ion-color-medium);
  padding: 8px;
}

.master-files__empty-group {
  color: var(--ion-color-medium);
  font-size: 12px;
}

.master-files__preview-content--image {
  --padding-top: 0;
  --padding-bottom: 0;
  --padding-start: 0;
  --padding-end: 0;
}

.master-files__image-lightbox {
  width: 100%;
  min-height: 100%;
  background: #050505;
  touch-action: none;
}

.master-files__image-close-button {
  position: absolute;
  top: max(8px, env(safe-area-inset-top, 0));
  right: 8px;
  z-index: 50;
  --background: rgba(0, 0, 0, 0.35);
  --border-radius: 999px;
}

.master-files__preview-image {
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
  touch-action: none;
}

:deep(.viewer-toolbar > ul) {
  transform: scale(0.9);
  margin-bottom: 16px;
}

.master-files__preview-frame {
  width: 100%;
  height: 90vh;
  border: none;
  border-radius: 8px;
  background: transparent;
}

.master-files__preview-text {
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

.master-files__non-image p {
  margin: 0 0 12px 0;
}

.add-new-button {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0 max(8px, env(safe-area-inset-bottom, 0));
}

@media (min-width: 1024px) {
  .master-files {
    padding-bottom: 96px;
  }

  .master-files__list {
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
    border-radius: 14px;
    overflow: hidden;
    background: rgba(var(--ion-color-medium-rgb), 0.15);
  }

  .master-files__group-header,
  .master-files__group-divider {
    --min-height: 40px;
  }

  .master-files__group-title {
    font-size: 12px;
    margin: 0;
    color: var(--ion-color-light-shade);
  }

  .master-files__list ion-item {
    --min-height: 58px;
    --inner-padding-top: 6px;
    --inner-padding-bottom: 6px;
    --border-color: rgba(var(--ion-color-light-rgb), 0.08);
  }

  .master-files__filename {
    font-size: 14px;
  }

  .master-files__meta {
    font-size: 11px;
  }

  .master-files__loading-list {
    padding: 14px 10px;
  }

  .add-new-button {
    left: auto;
    right: 22px;
    bottom: 18px;
    width: auto;
    padding: 0;
    justify-content: flex-end;
    pointer-events: none;
  }

  .add-new-button ion-button {
    pointer-events: auto;
    margin: 0;
    --box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
  }

  ion-modal.master-files__preview-modal--desktop {
    --width: min(1160px, 92vw);
    --height: min(86vh, 920px);
    --border-radius: 14px;
    --background: var(--ion-color-dark);
  }

  .master-files__preview-frame {
    height: min(78vh, 820px);
  }

  .master-files__preview-text {
    max-height: min(68vh, 760px);
    font-size: 13px;
    line-height: 1.45;
  }
}
</style>

