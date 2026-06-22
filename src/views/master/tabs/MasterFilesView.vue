<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonReorder,
  IonReorderGroup,
  IonTitle,
  IonToggle,
  IonToolbar,
  onIonViewWillEnter,
  toastController,
} from "@ionic/vue";
import {
  add,
  chevronBackOutline,
  closeCircleOutline,
  documentTextOutline,
  downloadOutline,
  eyeOutline,
  imageOutline,
  peopleOutline,
  trashOutline,
} from "ionicons/icons";
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import axios from "axios";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type { UserFile } from "@/api/fileStorageApi.types";
import {
  changeUserFileVisible,
  downloadUserFileById,
  deleteUserFileById,
  grantUserFileShare,
  listUserFileShares,
  readAllUserFilesByUserId,
  revokeUserFileShare,
  uploadUserFile,
} from "@/api/fileStorageApi";
import { useRoomStore } from "@/stores/RoomStore";
import { displayStoredUserFilename as displayedFileName } from "@/utils/userFileDisplayName";
import Viewer from "viewerjs";
import "viewerjs/dist/viewer.css";
import {v4 as uuidv4} from "uuid";

const userId = ref<string>("");
const route = useRoute();
const roomStore = useRoomStore();
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

const uploadedAtFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatFileUploadedAt(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return uploadedAtFormatter.format(t);
}

const getFileSizeBytes = (file: UserFile): number | null => {
  const sizeCandidate = (file as any).size ?? (file as any).fileSize ?? (file as any).contentLength;
  if (typeof sizeCandidate !== "number" || !Number.isFinite(sizeCandidate)) return null;
  return sizeCandidate;
};

const isTooLargeForPreview = (file: UserFile): boolean => {
  const size = getFileSizeBytes(file);
  return size !== null && size > MAX_PREVIEW_FILE_SIZE_BYTES;
};

const getFileExtension = (file: UserFile): string => {
  const name = displayedFileName(file.filename);
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return "FILE";
  return name.slice(dot + 1).toUpperCase().slice(0, 4);
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

/** Other room users (by character owner ids), excluding the current user — for individual file shares. */
const roomUsersForShare = computed(() => {
  const map = new Map<string, string>();
  for (const c of roomStore.characters) {
    if (!map.has(c.userId)) {
      map.set(c.userId, c.ownerUsername || c.name);
    }
  }
  const myId = userId.value;
  return [...map.entries()]
    .filter(([id]) => id !== myId)
    .map(([uid, label]) => ({ userId: uid, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "ru", { sensitivity: "base" }));
});

const isShareModalOpen = ref(false);
const shareTargetFile = ref<UserFile | null>(null);
const shareGranteeIds = ref<string[]>([]);
const isShareListLoading = ref(false);
const shareMutatingUserId = ref<string | null>(null);

async function loadRoomCharacters() {
  const id = roomId.value;
  if (!id) return;
  try {
    await roomStore.getCharacters(id);
  } catch (e) {
    console.error("Failed to load room characters:", e);
  }
}

async function openShareModal(file: UserFile) {
  if (file.visible) return;
  await loadRoomCharacters();
  shareTargetFile.value = file;
  isShareModalOpen.value = true;
  isShareListLoading.value = true;
  shareGranteeIds.value = [];
  try {
    const ownerId = await ensureUserId();
    shareGranteeIds.value = await listUserFileShares(file.id, ownerId);
  } catch (e) {
    console.error("Failed to load file shares:", e);
    const toast = await toastController.create({
      message: "Не удалось загрузить список доступа",
      duration: 2000,
      position: "top",
      color: "danger",
    });
    await toast.present();
  } finally {
    isShareListLoading.value = false;
  }
}

function closeShareModal() {
  isShareModalOpen.value = false;
  shareTargetFile.value = null;
  shareGranteeIds.value = [];
}

async function onShareToggle(grantToUserId: string, enabled: boolean) {
  if (!shareTargetFile.value) return;
  const prev = [...shareGranteeIds.value];
  if (enabled) {
    if (!shareGranteeIds.value.includes(grantToUserId)) {
      shareGranteeIds.value = [...shareGranteeIds.value, grantToUserId];
    }
  } else {
    shareGranteeIds.value = shareGranteeIds.value.filter((id) => id !== grantToUserId);
  }
  shareMutatingUserId.value = grantToUserId;
  try {
    const ownerId = await ensureUserId();
    if (enabled) {
      await grantUserFileShare(shareTargetFile.value.id, ownerId, grantToUserId);
    } else {
      await revokeUserFileShare(shareTargetFile.value.id, ownerId, grantToUserId);
    }
  } catch (e) {
    console.error("Share toggle failed:", e);
    shareGranteeIds.value = prev;
    const toast = await toastController.create({
      message: "Не удалось изменить доступ к файлу",
      duration: 2000,
      position: "top",
      color: "danger",
    });
    await toast.present();
  } finally {
    shareMutatingUserId.value = null;
  }
}

function onShareToggleIon(ev: Event, grantToUserId: string) {
  const detail = (ev as CustomEvent<{ checked: boolean }>).detail;
  void onShareToggle(grantToUserId, Boolean(detail?.checked));
}

onIonViewWillEnter(async () => {
  await loadRoomCharacters();
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
    await loadRoomCharacters();
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
    const downloadName = displayedFileName(file.filename);

    if (Capacitor.isNativePlatform()) {
      const fileReader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        fileReader.onloadend = () => {
          const result = typeof fileReader.result === "string" ? fileReader.result : "";
          const payload = result.includes(",") ? result.split(",")[1] : "";
          if (!payload) {
            reject(new Error("Failed to convert blob to base64"));
            return;
          }
          resolve(payload);
        };
        fileReader.onerror = () => reject(fileReader.error ?? new Error("FileReader error"));
        fileReader.readAsDataURL(blob);
      });

      const path = `downloads/${Date.now()}_${downloadName}`;

      try {
        const permissions = await Filesystem.checkPermissions();
        if (permissions.publicStorage !== "granted") {
          await Filesystem.requestPermissions();
        }
      } catch (_e) {
        // Some platforms/directories don't require explicit permission.
      }

      await Filesystem.writeFile({
        path,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      await Filesystem.getUri({ path, directory: Directory.Documents });
      const successToast = await toastController.create({
        message: `Файл сохранен: ${downloadName}`,
        duration: 2000,
        position: "top",
        color: "success",
      });
      await successToast.present();
      return;
    }

    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      URL.revokeObjectURL(url);
    }
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
      <div class="files-heading files-heading--first">
        <span class="files-heading__title">Видимые для всех</span>
        <span class="files-heading__count files-heading__count--public">{{ visibleForAllFiles.length }}</span>
      </div>

      <ion-reorder-group
        class="master-files__groups"
        :disabled="isChangingVisible"
        @ionItemReorder="onIonicReorder"
      >
        <ion-item
          v-for="f in visibleForAllFiles"
          :key="`public-${f.id}`"
          class="master-files__card"
          lines="none"
          color="dark"
        >
          <ion-reorder slot="start" class="master-files__reorder" />
          <div class="master-files__thumb" slot="start">
            <ion-icon
              :icon="isLikelyImageFile(f.filename) ? imageOutline : documentTextOutline"
              aria-hidden="true"
            />
          </div>
          <ion-label class="master-files__label">
            <h2 class="master-files__title" :title="displayedFileName(f.filename)">
              {{ displayedFileName(f.filename) }}
            </h2>
            <p class="master-files__meta">
              <span class="master-files__ext">{{ getFileExtension(f) }}</span>
              {{ formatFileUploadedAt(f.uploadedAt) }}
            </p>
            <p v-if="isTooLargeForPreview(f)" class="master-files__warning">
              Файл слишком велик для просмотра (больше 10 МБ)
            </p>
          </ion-label>
          <div class="master-files__actions" slot="end">
            <ion-button
              class="master-files__action-btn"
              fill="clear"
              size="small"
              title="Скачать"
              @click="downloadFile(f)"
            >
              <ion-icon slot="icon-only" :icon="downloadOutline" />
            </ion-button>
            <ion-button
              class="master-files__action-btn"
              fill="clear"
              size="small"
              title="Просмотр"
              :disabled="(isPreviewOpen && isPreviewLoading) || isTooLargeForPreview(f)"
              @click="openPreview(f)"
            >
              <ion-icon slot="icon-only" :icon="eyeOutline" />
            </ion-button>
            <ion-button
              class="master-files__action-btn master-files__action-btn--delete"
              fill="clear"
              size="small"
              title="Удалить"
              @click="onDelete(f)"
            >
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-button>
          </div>
        </ion-item>

        <ion-item lines="none" class="master-files__section master-files__section--divider" color="dark">
          <ion-label class="master-files__section-inner">
            <div class="files-heading">
              <span class="files-heading__title">Видимые только для меня</span>
              <span class="files-heading__count files-heading__count--private">{{ visibleOnlyForMeFiles.length }}</span>
            </div>
          </ion-label>
        </ion-item>

        <ion-item
          v-for="f in visibleOnlyForMeFiles"
          :key="`private-${f.id}`"
          class="master-files__card master-files__card--private"
          lines="none"
          color="dark"
        >
          <ion-reorder slot="start" class="master-files__reorder" />
          <div class="master-files__thumb master-files__thumb--private" slot="start">
            <ion-icon
              :icon="isLikelyImageFile(f.filename) ? imageOutline : documentTextOutline"
              aria-hidden="true"
            />
          </div>
          <ion-label class="master-files__label">
            <h2 class="master-files__title" :title="displayedFileName(f.filename)">
              {{ displayedFileName(f.filename) }}
            </h2>
            <p class="master-files__meta">
              <span class="master-files__ext master-files__ext--private">{{ getFileExtension(f) }}</span>
              {{ formatFileUploadedAt(f.uploadedAt) }}
            </p>
            <p v-if="isTooLargeForPreview(f)" class="master-files__warning">
              Файл слишком велик для просмотра (больше 10 МБ)
            </p>
          </ion-label>
          <div class="master-files__actions" slot="end">
            <ion-button
              class="master-files__action-btn"
              fill="clear"
              size="small"
              title="Скачать"
              @click="downloadFile(f)"
            >
              <ion-icon slot="icon-only" :icon="downloadOutline" />
            </ion-button>
            <ion-button
              class="master-files__action-btn"
              fill="clear"
              size="small"
              title="Просмотр"
              :disabled="(isPreviewOpen && isPreviewLoading) || isTooLargeForPreview(f)"
              @click="openPreview(f)"
            >
              <ion-icon slot="icon-only" :icon="eyeOutline" />
            </ion-button>
            <ion-button
              class="master-files__action-btn"
              fill="clear"
              size="small"
              title="Доступ для игроков"
              @click="openShareModal(f)"
            >
              <ion-icon slot="icon-only" :icon="peopleOutline" />
            </ion-button>
            <ion-button
              class="master-files__action-btn master-files__action-btn--delete"
              fill="clear"
              size="small"
              title="Удалить"
              @click="onDelete(f)"
            >
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-button>
          </div>
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

    <ion-modal :is-open="isShareModalOpen" @didDismiss="closeShareModal">
      <ion-header>
        <ion-toolbar color="dark">
          <ion-buttons slot="start">
            <ion-button color="light" aria-label="Назад" @click="closeShareModal">
              <ion-icon slot="start" :icon="chevronBackOutline" />
              Назад
            </ion-button>
          </ion-buttons>
          <ion-title>Доступ к файлу</ion-title>
          <ion-buttons slot="end">
            <ion-button color="dark" aria-label="Закрыть" @click="closeShareModal">
              <ion-icon :icon="closeCircleOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding" color="dark">
        <p v-if="shareTargetFile" class="master-files__share-filename">
          {{ displayedFileName(shareTargetFile.filename) }}
        </p>
        <div v-if="isShareListLoading" class="master-files__loading-list">Загрузка...</div>
        <template v-else-if="roomUsersForShare.length === 0">
          <p class="master-files__share-empty">
            Нет других участников комнаты (по списку персонажей). Пригласите игроков или создайте им персонажей.
          </p>
        </template>
        <ion-list v-else lines="full" class="master-files__share-list">
          <ion-item v-for="u in roomUsersForShare" :key="u.userId" color="dark">
            <ion-label>
              <div class="master-files__filename">{{ u.label }}</div>
            </ion-label>
            <ion-toggle
              slot="end"
              :checked="shareGranteeIds.includes(u.userId)"
              :disabled="shareMutatingUserId !== null"
              @ionChange="onShareToggleIon($event, u.userId)"
            />
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>

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
  padding: 0 12px 84px;
  box-sizing: border-box;
}

.master-files__list {
  background: transparent;
  padding: 0;
}

.master-files__groups {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.master-files__section {
  --background: transparent;
  --min-height: 0;
  --padding-top: 8px;
  --padding-bottom: 8px;
  --inner-padding-end: 0;
  --inner-padding-start: 0;
  margin: 0;
}

.master-files__section-inner {
  margin: 0;
  width: 100%;
}

.master-files__section--divider {
  --padding-top: 12px;
}

.files-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 2px;
}

.files-heading--first {
  margin-bottom: 10px;
}

.files-heading__title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.55);
}

.files-heading__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.files-heading__count--public {
  background: rgba(var(--ion-color-primary-rgb), 0.16);
  color: var(--ion-color-primary);
}

.files-heading__count--private {
  background: rgba(var(--ion-color-tertiary-rgb), 0.16);
  color: var(--ion-color-tertiary);
}

.master-files__card {
  --background: linear-gradient(150deg, rgba(var(--ion-color-medium-rgb), 0.92) 0%, rgba(var(--ion-color-dark-rgb), 0.88) 100%);
  --border-radius: 16px;
  --padding-start: 10px;
  --padding-end: 6px;
  --inner-padding-end: 4px;
  --inner-padding-top: 10px;
  --inner-padding-bottom: 10px;
  --min-height: 74px;
  margin: 0;
  border-radius: 16px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.22);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.master-files__card:hover {
  border-color: rgba(var(--ion-color-primary-rgb), 0.4);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.4);
}

.master-files__card--private {
  border-color: rgba(var(--ion-color-tertiary-rgb), 0.18);
}

.master-files__card--private:hover {
  border-color: rgba(var(--ion-color-tertiary-rgb), 0.45);
}

.master-files__reorder {
  margin-inline-end: 2px;
  opacity: 0.45;
}

.master-files__thumb {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-inline-end: 10px;
  background: rgba(var(--ion-color-primary-rgb), 0.14);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.28);
  flex-shrink: 0;
}

.master-files__thumb--private {
  background: rgba(var(--ion-color-tertiary-rgb), 0.14);
  border-color: rgba(var(--ion-color-tertiary-rgb), 0.26);
}

.master-files__thumb ion-icon {
  font-size: 22px;
  color: var(--ion-color-primary);
}

.master-files__thumb--private ion-icon {
  color: var(--ion-color-tertiary);
}

.master-files__ext {
  display: inline-block;
  margin-right: 6px;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  vertical-align: middle;
  background: rgba(var(--ion-color-primary-rgb), 0.16);
  color: var(--ion-color-primary);
}

.master-files__ext--private {
  background: rgba(var(--ion-color-tertiary-rgb), 0.16);
  color: var(--ion-color-tertiary);
}

.master-files__label {
  margin: 0;
  overflow: hidden;
}

.master-files__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
  color: rgba(var(--ion-color-light-rgb), 0.98);
  margin: 0 0 4px 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.master-files__actions {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 0;
  margin-top: 2px;
}

.master-files__action-btn {
  --padding-start: 6px;
  --padding-end: 6px;
  margin: 0;
  opacity: 0.92;
}

.master-files__action-btn::part(native) {
  border-radius: 10px;
}

.master-files__action-btn ion-icon {
  font-size: 22px;
}

.master-files__action-btn--delete {
  opacity: 0.75;
  --color: rgba(var(--ion-color-danger-rgb), 0.85);
}

.master-files__file-input--hidden {
  display: none;
}

.master-files__error {
  margin: 8px 0;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 14px;
  color: var(--ion-color-danger-tint);
  background: rgba(var(--ion-color-danger-rgb), 0.12);
  border: 1px solid rgba(var(--ion-color-danger-rgb), 0.3);
}

.master-files__filename {
  font-weight: 600;
}

.master-files__meta {
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.55);
  margin: 0;
  line-height: 1.35;
}

.master-files__warning {
  margin: 6px 0 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--ion-color-warning);
}

.master-files__modal-title {
  font-weight: 600;
}

.master-files__loading {
  color: var(--ion-color-medium);
}

.master-files__loading-list {
  margin-top: 8px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  padding: 32px 24px;
  text-align: center;
  font-size: 14px;
  letter-spacing: 0.02em;
  border: 1px dashed rgba(var(--ion-color-light-rgb), 0.12);
  border-radius: 16px;
  background: rgba(var(--ion-color-medium-rgb), 0.35);
}

.master-files__empty-group {
  color: rgba(var(--ion-color-light-rgb), 0.42);
  font-size: 13px;
  line-height: 1.45;
  padding: 4px 0;
}

@media (max-width: 380px) {
  .master-files__action-btn ion-icon {
    font-size: 20px;
  }

  .master-files__thumb {
    width: 36px;
    height: 36px;
  }

  .master-files__title {
    font-size: 14px;
  }
}

.master-files__share-filename {
  font-weight: 600;
  margin: 0 0 12px 0;
  font-size: 15px;
  line-height: 1.35;
  color: rgba(var(--ion-color-light-rgb), 0.95);
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow-wrap: anywhere;
}

.master-files__share-empty {
  color: var(--ion-color-medium);
  font-size: 14px;
  line-height: 1.4;
  margin: 0;
}

.master-files__share-list {
  background: transparent;
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
  background: linear-gradient(to top, rgba(0, 0, 0, 0.55) 0%, transparent 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0 max(8px, env(safe-area-inset-bottom, 0));
  pointer-events: none;
}

.add-new-button ion-button {
  pointer-events: auto;
  --box-shadow: 0 8px 28px rgba(var(--ion-color-secondary-rgb), 0.35);
}

@media (min-width: 1024px) {
  .master-files {
    padding: 0 16px 96px;
    max-width: 920px;
    margin-inline: auto;
  }

  .master-files__list {
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.09);
    border-radius: 16px;
    overflow: hidden;
    padding: 12px 14px 16px;
    background: rgba(var(--ion-color-dark-rgb), 0.35);
    backdrop-filter: blur(8px);
  }

  .master-files__groups {
    gap: 12px;
  }

  .master-files__section {
    --padding-start: 0;
    --padding-end: 0;
  }

  .master-files__card {
    --min-height: 64px;
    --border-radius: 12px;
  }

  .master-files__title {
    font-size: 14px;
  }

  .master-files__meta {
    font-size: 11px;
    color: rgba(var(--ion-color-light-rgb), 0.5);
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
    background: transparent;
  }

  .add-new-button ion-button {
    margin: 0;
    --box-shadow: 0 12px 32px rgba(var(--ion-color-secondary-rgb), 0.28);
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

