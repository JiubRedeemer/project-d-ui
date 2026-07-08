<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonPage,
  IonTextarea,
  IonToggle,
  IonToolbar,
  onIonViewDidEnter,
  toastController,
  useIonRouter,
} from "@ionic/vue";
import {computed, ref} from "vue";
import axios from "axios";
import {add, addOutline, closeOutline, cloudUploadOutline, createOutline, trashOutline} from "ionicons/icons";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import type {Item, ItemBundle} from "@/components/models/response/InventoryResponse";
import {
  createBundle,
  deleteBundle,
  deleteBundleItem,
  getBundleItems,
  getMyCreatedItems,
  getOwnBundles,
  importBundleItems,
  updateBundle,
} from "@/api/bundleApi";

const ionRouter = useIonRouter();
const bundles = ref<ItemBundle[]>([]);
const isLoading = ref(false);

// ── Форма создания/редактирования бандла ─────────────
const showForm = ref(false);
const editingBundleId = ref<string | null>(null);
const formName = ref("");
const formDescription = ref("");
const formImgUrl = ref("");
const formIsPublic = ref(false);
const formPrice = ref<number | undefined>(undefined);
const formPreviewImage = ref<string | null>(null);
const formFileInput = ref<HTMLInputElement | null>(null);
const isSaving = ref(false);

const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff", "image/svg+xml"];

// ── Управление предметами выбранного бандла ──────────
const selectedBundle = ref<ItemBundle | null>(null);
const bundleItems = ref<Item[]>([]);
const itemsLoading = ref(false);

// ── Импорт своих предметов ───────────────────────────
const showImportModal = ref(false);
const importSearch = ref("");
const importCandidates = ref<Item[]>([]);
const importSelectedIds = ref<Set<string>>(new Set());
const importLoading = ref(false);
const isImporting = ref(false);

const bundleImageUrl = (imgUrl: string | undefined | null) =>
    imgUrl?.trim()
        ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
        : null;

async function loadBundles() {
  isLoading.value = true;
  try {
    bundles.value = await getOwnBundles();
  } catch (e) {
    console.error("Не удалось загрузить наборы", e);
  } finally {
    isLoading.value = false;
  }
}

onIonViewDidEnter(() => {
  void loadBundles();
});

function openCreateForm() {
  editingBundleId.value = null;
  formName.value = "";
  formDescription.value = "";
  formImgUrl.value = "";
  formIsPublic.value = false;
  formPrice.value = undefined;
  formPreviewImage.value = null;
  showForm.value = true;
}

function openEditForm(bundle: ItemBundle) {
  editingBundleId.value = bundle.id;
  formName.value = bundle.name;
  formDescription.value = bundle.description ?? "";
  formImgUrl.value = bundle.imgUrl ?? "";
  formIsPublic.value = bundle.isPublic ?? false;
  formPrice.value = bundle.priceCrystals || undefined;
  formPreviewImage.value = null;
  showForm.value = true;
}

function triggerFormFileInput() {
  formFileInput.value?.click();
}

async function handleFormFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] || null;
  if (!file || !allowedFormats.includes(file.type)) {
    alert("Формат файла не поддерживается. Разрешены: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    formPreviewImage.value = reader.result as string;
  };
  reader.readAsDataURL(file);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userFilename", `bundle-${editingBundleId.value ?? crypto.randomUUID()}`);
  const res = await axios.put(
      `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
      formData,
      {headers: {"Content-Type": "multipart/form-data"}}
  );
  formImgUrl.value = res.data;
}

async function submitForm() {
  if (!formName.value.trim() || isSaving.value) return;
  isSaving.value = true;
  const payload: Partial<ItemBundle> = {
    name: formName.value.trim(),
    description: formDescription.value.trim(),
    imgUrl: formImgUrl.value || undefined,
    isPublic: formIsPublic.value,
    priceCrystals: formIsPublic.value ? (formPrice.value ?? 0) : 0,
  };
  try {
    if (editingBundleId.value) {
      const updated = await updateBundle(editingBundleId.value, payload);
      const idx = bundles.value.findIndex(b => b.id === editingBundleId.value);
      if (idx >= 0) bundles.value[idx] = updated;
    } else {
      const created = await createBundle(payload);
      bundles.value.push(created);
    }
    showForm.value = false;
  } catch (e) {
    console.error("Не удалось сохранить набор", e);
  } finally {
    isSaving.value = false;
  }
}

async function removeBundle(bundle: ItemBundle) {
  if (!confirm(`Удалить набор «${bundle.name}»? Это затронет все комнаты, где он подключён.`)) return;
  try {
    await deleteBundle(bundle.id);
    bundles.value = bundles.value.filter(b => b.id !== bundle.id);
    if (selectedBundle.value?.id === bundle.id) selectedBundle.value = null;
  } catch (e) {
    console.error("Не удалось удалить набор", e);
  }
}

async function openBundleItems(bundle: ItemBundle) {
  selectedBundle.value = bundle;
  itemsLoading.value = true;
  try {
    bundleItems.value = await getBundleItems(bundle.id);
  } catch (e) {
    console.error("Не удалось загрузить предметы набора", e);
  } finally {
    itemsLoading.value = false;
  }
}

async function removeItem(item: Item) {
  if (!confirm(`Удалить предмет «${item.name?.rus}» из набора?`)) return;
  try {
    await deleteBundleItem(item.id);
    bundleItems.value = bundleItems.value.filter(i => i.id !== item.id);
  } catch (e) {
    console.error("Не удалось удалить предмет", e);
  }
}

function createItemFromScratch() {
  if (!selectedBundle.value) return;
  ionRouter.navigate(`/bundles/${selectedBundle.value.id}/items/add`, "forward", "push");
}

async function openImportModal() {
  showImportModal.value = true;
  importSelectedIds.value = new Set();
  await loadImportCandidates();
}

async function loadImportCandidates() {
  importLoading.value = true;
  try {
    importCandidates.value = await getMyCreatedItems(importSearch.value);
  } catch (e) {
    console.error("Не удалось загрузить предметы для импорта", e);
  } finally {
    importLoading.value = false;
  }
}

function toggleImportSelection(itemId: string) {
  const next = new Set(importSelectedIds.value);
  if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
  importSelectedIds.value = next;
}

async function submitImport() {
  if (!selectedBundle.value || importSelectedIds.value.size === 0 || isImporting.value) return;
  isImporting.value = true;
  try {
    await importBundleItems(selectedBundle.value.id, [...importSelectedIds.value]);
    showImportModal.value = false;
    await openBundleItems(selectedBundle.value);
    const toast = await toastController.create({
      message: "Предметы импортированы в набор",
      duration: 1200,
      position: "top",
    });
    await toast.present();
  } catch (e) {
    console.error("Не удалось импортировать предметы", e);
  } finally {
    isImporting.value = false;
  }
}

const itemImageUrl = (imgUrl: string | undefined | null) =>
    imgUrl?.trim()
        ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
        : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";

const formPriceDisplay = computed({
  get: () => formPrice.value,
  set: (v: number | undefined) => {
    formPrice.value = v != null && v < 0 ? 0 : v;
  },
});
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button default-href="/profile" text=""/>
        </ion-buttons>
        <div class="header-title">Мои наборы предметов</div>
      </ion-toolbar>
    </ion-header>

    <ion-content color="dark" class="ion-padding">
      <div class="bundles-page">
        <ion-button size="small" fill="outline" shape="round" @click="showForm ? showForm = false : openCreateForm()">
          <ion-icon slot="start" :icon="showForm ? closeOutline : addOutline"/>
          {{ showForm ? "Отменить" : "Создать набор" }}
        </ion-button>

        <!-- Форма создания/редактирования -->
        <div v-if="showForm" class="bundle-form">
          <div class="bundle-form__header">
            <button type="button" class="bundle-avatar" @click="triggerFormFileInput">
              <img v-if="formPreviewImage" :src="formPreviewImage" class="bundle-avatar__img" alt=""/>
              <img v-else-if="formImgUrl" :src="bundleImageUrl(formImgUrl) ?? undefined" class="bundle-avatar__img" alt=""/>
              <div v-else class="bundle-avatar__placeholder">
                <ion-icon :icon="cloudUploadOutline"/>
                <span>Фото</span>
              </div>
              <input ref="formFileInput" type="file" accept="image/*" class="bundle-avatar__input" @change="handleFormFileUpload"/>
            </button>
            <div class="bundle-form__fields">
              <ion-input v-model="formName" type="text" placeholder="Название набора" class="bundle-form__input"/>
              <ion-textarea v-model="formDescription" placeholder="Описание" :rows="2" class="bundle-form__input"/>
            </div>
          </div>

          <div class="bundle-form__row">
            <span>Публичный набор</span>
            <ion-toggle v-model="formIsPublic"/>
          </div>
          <div v-if="formIsPublic" class="bundle-form__row">
            <span>Цена (кристаллы, 0 — бесплатно)</span>
            <ion-input
                v-model="formPriceDisplay"
                type="number"
                inputmode="numeric"
                :min="0"
                placeholder="0"
                class="bundle-form__price"
            />
          </div>

          <ion-button size="small" shape="round" :disabled="!formName.trim() || isSaving" @click="submitForm">
            Сохранить
          </ion-button>
        </div>

        <!-- Список бандлов -->
        <div v-if="isLoading" class="bundles-empty">Загрузка...</div>
        <div v-else-if="!bundles.length && !showForm" class="bundles-empty">У вас пока нет наборов</div>

        <div class="bundles-list">
          <div
              v-for="bundle in bundles"
              :key="bundle.id"
              :class="['bundle-card', { 'bundle-card--selected': selectedBundle?.id === bundle.id }]"
              @click="openBundleItems(bundle)"
          >
            <img v-if="bundleImageUrl(bundle.imgUrl)" :src="bundleImageUrl(bundle.imgUrl) ?? undefined" class="bundle-card__img" alt=""/>
            <div v-else class="bundle-card__img bundle-card__img--placeholder">📦</div>
            <div class="bundle-card__body">
              <div class="bundle-card__name">{{ bundle.name }}</div>
              <div v-if="bundle.description" class="bundle-card__description">{{ bundle.description }}</div>
              <div class="bundle-card__meta">
                <span v-if="bundle.isPublic" class="bundle-badge bundle-badge--public">
                  Публичный{{ (bundle.priceCrystals ?? 0) > 0 ? ` · ${bundle.priceCrystals} 💎` : " · бесплатно" }}
                </span>
                <span v-else class="bundle-badge">Приватный</span>
              </div>
            </div>
            <div class="bundle-card__actions" @click.stop>
              <ion-button size="small" fill="clear" @click="openEditForm(bundle)">
                <ion-icon slot="icon-only" :icon="createOutline"/>
              </ion-button>
              <ion-button size="small" fill="clear" color="danger" @click="removeBundle(bundle)">
                <ion-icon slot="icon-only" :icon="trashOutline"/>
              </ion-button>
            </div>
          </div>
        </div>

        <!-- Предметы выбранного бандла -->
        <div v-if="selectedBundle" class="bundle-items">
          <div class="bundle-items__header">
            <h3 class="bundle-items__title">Предметы: {{ selectedBundle.name }}</h3>
            <div class="bundle-items__actions">
              <ion-button size="small" fill="outline" shape="round" @click="createItemFromScratch">
                <ion-icon slot="start" :icon="add"/>
                Создать
              </ion-button>
              <ion-button size="small" fill="outline" shape="round" @click="openImportModal">
                <ion-icon slot="start" :icon="cloudUploadOutline"/>
                Импорт
              </ion-button>
            </div>
          </div>

          <div v-if="itemsLoading" class="bundles-empty">Загрузка...</div>
          <div v-else-if="!bundleItems.length" class="bundles-empty">Набор пуст</div>
          <div v-else class="items-list">
            <div v-for="item in bundleItems" :key="item.id" class="item-row">
              <img :src="itemImageUrl(item.imgUrl)" class="item-row__img" alt=""/>
              <div class="item-row__body">
                <div class="item-row__name">{{ item.name?.rus }}</div>
                <div class="item-row__meta">{{ item.typeName }}<span v-if="item.subtypeName"> · {{ item.subtypeName }}</span></div>
              </div>
              <ion-button size="small" fill="clear" color="danger" @click="removeItem(item)">
                <ion-icon slot="icon-only" :icon="trashOutline"/>
              </ion-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Модалка импорта -->
      <Teleport to="body">
        <div v-if="showImportModal" class="import-overlay" @click.self="showImportModal = false">
          <div class="import-modal">
            <div class="import-modal__header">
              <span>Импорт моих предметов</span>
              <button class="import-modal__close" @click="showImportModal = false">
                <ion-icon :icon="closeOutline"/>
              </button>
            </div>
            <div class="import-modal__search">
              <ion-input
                  v-model="importSearch"
                  type="text"
                  placeholder="Поиск по названию..."
                  @keydown.enter="loadImportCandidates"
                  @ionBlur="loadImportCandidates"
              />
            </div>
            <div class="import-modal__body">
              <div v-if="importLoading" class="bundles-empty">Загрузка...</div>
              <div v-else-if="!importCandidates.length" class="bundles-empty">Предметов не найдено</div>
              <div
                  v-for="item in importCandidates"
                  :key="item.id"
                  :class="['import-item', { 'import-item--selected': importSelectedIds.has(item.id) }]"
                  @click="toggleImportSelection(item.id)"
              >
                <img :src="itemImageUrl(item.imgUrl)" class="item-row__img" alt=""/>
                <div class="item-row__body">
                  <div class="item-row__name">{{ item.name?.rus }}</div>
                  <div class="item-row__meta">{{ item.typeName }}</div>
                </div>
                <span class="import-item__check">{{ importSelectedIds.has(item.id) ? "✓" : "" }}</span>
              </div>
            </div>
            <div class="import-modal__footer">
              <ion-button
                  expand="block"
                  shape="round"
                  :disabled="importSelectedIds.size === 0 || isImporting"
                  @click="submitImport"
              >
                Импортировать ({{ importSelectedIds.size }})
              </ion-button>
            </div>
          </div>
        </div>
      </Teleport>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.header-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--ion-color-light);
  padding-left: 6px;
}

.bundles-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 700px;
  margin: 0 auto;
}

.bundle-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  background: var(--ion-color-medium);
}

.bundle-form__header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.bundle-form__fields {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bundle-form__input {
  --background: rgba(var(--ion-color-dark-rgb), 0.35);
  --padding-start: 10px;
  --padding-end: 10px;
  border-radius: 10px;
}

.bundle-form__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 14px;
  color: var(--ion-color-light);
}

.bundle-form__price {
  max-width: 110px;
  --background: rgba(var(--ion-color-dark-rgb), 0.35);
  --padding-start: 10px;
  --padding-end: 10px;
  border-radius: 10px;
  text-align: right;
}

.bundle-avatar {
  position: relative;
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px dashed rgba(var(--ion-color-light-rgb), 0.3);
  background: rgba(var(--ion-color-dark-rgb), 0.35);
  cursor: pointer;
  padding: 0;
}

.bundle-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bundle-avatar__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 100%;
  color: rgba(var(--ion-color-light-rgb), 0.45);
  font-size: 10px;
}

.bundle-avatar__input {
  display: none;
}

.bundles-empty {
  padding: 20px 0;
  text-align: center;
  color: rgba(var(--ion-color-light-rgb), 0.5);
}

.bundles-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bundle-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--ion-color-medium);
  cursor: pointer;
  border: 1px solid transparent;
}

.bundle-card--selected {
  border-color: var(--ion-color-primary);
}

.bundle-card__img {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
}

.bundle-card__img--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: rgba(var(--ion-color-dark-rgb), 0.35);
}

.bundle-card__body {
  flex: 1;
  min-width: 0;
}

.bundle-card__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ion-color-light);
}

.bundle-card__description {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.6);
}

.bundle-card__meta {
  margin-top: 4px;
}

.bundle-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(var(--ion-color-light-rgb), 0.1);
  color: rgba(var(--ion-color-light-rgb), 0.7);
}

.bundle-badge--public {
  background: rgba(var(--ion-color-primary-rgb), 0.15);
  color: var(--ion-color-primary);
}

.bundle-card__actions {
  display: flex;
  flex-shrink: 0;
}

.bundle-items {
  padding: 14px;
  border-radius: 16px;
  background: var(--ion-color-medium);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bundle-items__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.bundle-items__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.bundle-items__actions {
  display: flex;
  gap: 6px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(var(--ion-color-dark-rgb), 0.35);
}

.item-row__img {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.item-row__body {
  flex: 1;
  min-width: 0;
}

.item-row__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-row__meta {
  font-size: 11px;
  color: rgba(var(--ion-color-light-rgb), 0.55);
}

/* ── Импорт ──────────────────────────────────── */
.import-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.import-modal {
  width: 100%;
  max-width: 680px;
  max-height: 80vh;
  background: #1a1a2e;
  border-radius: 20px 20px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.import-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 10px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.import-modal__close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  padding: 4px;
}

.import-modal__search {
  padding: 0 20px 8px;
}

.import-modal__search ion-input {
  --background: rgba(255, 255, 255, 0.06);
  --padding-start: 12px;
  --padding-end: 12px;
  border-radius: 12px;
}

.import-modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.import-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid transparent;
  cursor: pointer;
}

.import-item--selected {
  border-color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.1);
}

.import-item__check {
  width: 20px;
  color: var(--ion-color-primary);
  font-weight: 700;
  flex-shrink: 0;
  text-align: center;
}

.import-modal__footer {
  padding: 10px 20px calc(12px + env(safe-area-inset-bottom, 0px));
}
</style>
