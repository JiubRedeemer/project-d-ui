<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  onIonViewWillEnter,
  toastController,
} from "@ionic/vue";
import { add, closeCircleOutline, documentTextOutline, eyeOutline, imageOutline } from "ionicons/icons";
import { computed, nextTick, onMounted, ref } from "vue";
import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type { UserFile } from "@/api/fileStorageApi.types";
import {
  downloadUserFileById,
  deleteUserFileById,
  readAllUserFilesByUserId,
  getUserFileDownloadUrl,
  uploadUserFile,
} from "@/api/fileStorageApi";
import Viewer from "viewerjs";
import "viewerjs/dist/viewer.css";

const userId = ref<string>("");
const userFiles = ref<UserFile[]>([]);
const didLoadOnce = ref(false);

const fileInput = ref<HTMLInputElement | null>(null);
const isLoading = ref(false);
const isUploading = ref(false);
const errorMessage = ref<string | null>(null);

const displayedFileName = (storedFilename: string): string => {
  if (!userId.value) return storedFilename;
  if (storedFilename.startsWith(userId.value)) {
    return storedFilename.slice(userId.value.length);
  }
  return storedFilename;
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
    userFiles.value = await readAllUserFilesByUserId(userId.value);
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
  if (didLoadOnce.value) return;
  didLoadOnce.value = true;
  try {
    userId.value = await ensureUserId();
    await refreshFiles();
  } catch (e) {
    console.error("Failed to load files on mount:", e);
  }
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
  const storedFilename = `${currentUserId}${originalName}`; // userId + исходное_название_файла

  isUploading.value = true;
  errorMessage.value = null;

  try {
    await uploadUserFile(currentUserId, file, storedFilename);
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
const pdfViewerBaseUrl = `${import.meta.env.BASE_URL}node-viewerjs/`;
const pdfViewerSrc = computed(() =>
  previewUrl.value ? `${pdfViewerBaseUrl}index.html?type=pdf#${previewUrl.value}` : ""
);

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

async function openPreview(file: UserFile) {
  selectedForPreview.value = file;
  previewUrl.value = null;
  previewType.value = null;
  isPreviewOpen.value = true;
  isPreviewLoading.value = true;
  previewKind.value = detectPreviewKind(file.filename, undefined);
  previewText.value = null;

  try {
    const downloadUrl = getUserFileDownloadUrl(file.id);
    // For image/pdf/unknown we can give viewer actual URL (not blob:) so viewer can HEAD and detect type.
    previewUrl.value = downloadUrl;

    if (previewKind.value === "text") {
      const blob = await downloadUserFileById(file.id);
      previewType.value = blob.type || null;
      previewText.value = await blob.text();
    }

    if (previewKind.value === "image") {
      await nextTick();
      if (imagePreviewEl.value) {
        imageViewer?.destroy();
        imageViewer = new Viewer(imagePreviewEl.value, {
          inline: true,
          button: false,
          navbar: false,
          toolbar: false,
          title: false,
          keyboard: true,
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

async function onDelete(file: UserFile) {
  const ok = window.confirm(`Удалить файл "${displayedFileName(file.filename)}"?`);
  if (!ok) return;

  try {
    await deleteUserFileById(file.id);
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

    <ion-list class="master-files__list">
      <ion-item v-if="isLoading" color="dark">
        <ion-label>Загрузка списка...</ion-label>
      </ion-item>

      <ion-item
        v-else-if="sortedUserFiles.length === 0"
        color="dark"
      >
        <ion-label>Нет файлов</ion-label>
      </ion-item>

      <ion-item
        v-for="f in sortedUserFiles"
        :key="f.id"
        color="dark"
      >
        <ion-icon
          :icon="isLikelyImageFile(f.filename) ? imageOutline : documentTextOutline"
          slot="start"
        />
        <ion-label>
          <div class="master-files__filename">{{ displayedFileName(f.filename) }}</div>
          <div class="master-files__meta">{{ f.uploadedAt }}</div>
        </ion-label>
        <ion-button
          fill="clear"
          slot="end"
          :disabled="isPreviewOpen && isPreviewLoading"
          @click="openPreview(f)"
        >
          <ion-icon :icon="eyeOutline" />
        </ion-button>
        <ion-button fill="clear" slot="end" color="danger" @click="onDelete(f)">
          <ion-icon :icon="closeCircleOutline" />
        </ion-button>
      </ion-item>
    </ion-list>

    <ion-modal :is-open="isPreviewOpen" @didDismiss="closePreview">
      <ion-header>
        <ion-toolbar color="dark">
          <ion-label class="master-files__modal-title">
            {{ displayedPreviewName || "Файл" }}
          </ion-label>
          <ion-button slot="end" color="dark" @click="closePreview">
            <ion-icon :icon="closeCircleOutline" />
          </ion-button>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding" color="dark">
        <div v-if="isPreviewLoading" class="master-files__loading">
          Загрузка файла...
        </div>

        <div v-else>
          <template v-if="previewKind === 'image'">
            <img
              v-if="previewUrl"
              ref="imagePreviewEl"
              :src="previewUrl"
              class="master-files__preview-image"
            />
          </template>

          <template v-else-if="previewKind === 'pdf'">
            <iframe
              v-if="previewUrl"
              :src="pdfViewerSrc"
              class="master-files__preview-frame"
              title="PDF preview"
            />
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
}

.master-files__list {
  background: transparent;
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

.master-files__modal-title {
  font-weight: 600;
}

.master-files__loading {
  color: var(--ion-color-medium);
}

.master-files__preview-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 8px;
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
</style>

