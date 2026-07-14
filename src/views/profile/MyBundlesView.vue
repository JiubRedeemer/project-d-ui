<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
  IonToggle,
  IonToolbar,
  onIonViewDidEnter,
  toastController,
  useIonRouter,
} from "@ionic/vue";
import {computed, ref} from "vue";
import axios from "axios";
import MyRulebookBundlesPanel from "@/views/profile/MyRulebookBundlesPanel.vue";
import type {RulebookBundleCategory} from "@/api/rulebookBundleApi.types";
import {
  add,
  addOutline,
  checkmarkCircle,
  closeOutline,
  cloudUploadOutline,
  createOutline,
  cubeOutline,
  diamondOutline,
  layersOutline,
  lockClosedOutline,
  searchOutline,
  trashOutline,
} from "ionicons/icons";
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
const subTab = ref<"items" | RulebookBundleCategory>("items");
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

const publicCount = computed(() => bundles.value.filter(b => b.isPublic).length);

function getRarityClass(rarity: string | undefined) {
  switch (rarity) {
    case "UNCOMMON": return "rarity-uncommon";
    case "RARE": return "rarity-rare";
    case "VERY_RARE": return "rarity-very-rare";
    case "LEGENDARY": return "rarity-legendary";
    default: return "rarity-common";
  }
}
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
      <ion-segment v-model="subTab" class="mybundles-subtabs" mode="ios" scrollable>
        <ion-segment-button value="items"><ion-label>Предметы</ion-label></ion-segment-button>
        <ion-segment-button value="RACE"><ion-label>Расы</ion-label></ion-segment-button>
        <ion-segment-button value="CLAZZ"><ion-label>Классы</ion-label></ion-segment-button>
        <ion-segment-button value="BACKGROUND"><ion-label>Предыстории</ion-label></ion-segment-button>
      </ion-segment>

      <MyRulebookBundlesPanel v-if="subTab !== 'items'" :category="subTab" />

      <div v-else class="bundles-page">
        <!-- Hero -->
        <div class="bundles-hero">
          <div class="bundles-hero__icon">
            <ion-icon :icon="layersOutline"/>
          </div>
          <div class="bundles-hero__text">
            <h2 class="bundles-hero__title">Мои наборы</h2>
            <p class="bundles-hero__subtitle">
              Всего <b>{{ bundles.length }}</b><template v-if="publicCount"> · публичных <b>{{ publicCount }}</b></template>
            </p>
          </div>
          <ion-button
              class="hero-create-btn"
              size="small"
              shape="round"
              @click="showForm ? showForm = false : openCreateForm()"
          >
            <ion-icon slot="start" :icon="showForm ? closeOutline : addOutline"/>
            {{ showForm ? "Отменить" : "Создать" }}
          </ion-button>
        </div>

        <!-- Форма создания/редактирования -->
        <Transition name="form-slide">
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
              <span class="bundle-form__row-label">Публичный набор</span>
              <ion-toggle v-model="formIsPublic"/>
            </div>
            <div v-if="formIsPublic" class="bundle-form__row bundle-form__row--price">
              <span class="bundle-form__row-label">
                <ion-icon :icon="diamondOutline"/>
                Цена <span class="bundle-form__hint">(0 — бесплатно)</span>
              </span>
              <ion-input
                  v-model="formPriceDisplay"
                  type="number"
                  inputmode="numeric"
                  :min="0"
                  placeholder="0"
                  class="bundle-form__price"
              />
            </div>

            <ion-button
                class="bundle-form__save"
                expand="block"
                shape="round"
                :disabled="!formName.trim() || isSaving"
                @click="submitForm"
            >
              {{ editingBundleId ? "Сохранить изменения" : "Создать набор" }}
            </ion-button>
          </div>
        </Transition>

        <!-- Скелетоны -->
        <div v-if="isLoading" class="bundles-list">
          <div v-for="n in 3" :key="n" class="bundle-card bundle-card--skeleton">
            <div class="bundle-card__art skeleton-block"/>
            <div class="bundle-card__body">
              <div class="skeleton-line" style="width: 55%"/>
              <div class="skeleton-line skeleton-line--thin" style="width: 80%"/>
              <div class="skeleton-line skeleton-line--thin" style="width: 35%"/>
            </div>
          </div>
        </div>

        <div v-else-if="!bundles.length && !showForm" class="bundles-empty">
          <ion-icon :icon="cubeOutline" class="bundles-empty__icon"/>
          <span>У вас пока нет наборов</span>
          <ion-button size="small" fill="outline" shape="round" @click="openCreateForm">
            <ion-icon slot="start" :icon="addOutline"/>
            Создать первый
          </ion-button>
        </div>

        <!-- Список бандлов -->
        <div v-else class="bundles-list">
          <div
              v-for="bundle in bundles"
              :key="bundle.id"
              :class="['bundle-card', { 'bundle-card--selected': selectedBundle?.id === bundle.id }]"
              @click="openBundleItems(bundle)"
          >
            <div class="bundle-card__art-wrap">
              <img
                  v-if="bundleImageUrl(bundle.imgUrl)"
                  :src="bundleImageUrl(bundle.imgUrl) ?? undefined"
                  class="bundle-card__art"
                  alt=""
              />
              <div v-else class="bundle-card__art bundle-card__art--placeholder">
                <ion-icon :icon="cubeOutline"/>
              </div>
            </div>

            <div class="bundle-card__body">
              <div class="bundle-card__name">{{ bundle.name }}</div>
              <div v-if="bundle.description" class="bundle-card__description">{{ bundle.description }}</div>
              <div class="bundle-card__meta">
                <span v-if="bundle.isPublic && (bundle.priceCrystals ?? 0) > 0" class="bundle-badge bundle-badge--price">
                  <ion-icon :icon="diamondOutline"/>
                  {{ bundle.priceCrystals }}
                </span>
                <span v-else-if="bundle.isPublic" class="bundle-badge bundle-badge--public">Публичный · бесплатно</span>
                <span v-else class="bundle-badge">
                  <ion-icon :icon="lockClosedOutline"/>
                  Приватный
                </span>
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
            <div class="bundle-items__title-wrap">
              <span class="bundle-items__eyebrow">Состав набора</span>
              <h3 class="bundle-items__title">{{ selectedBundle.name }}</h3>
            </div>
            <div class="bundle-items__actions">
              <ion-button size="small" fill="outline" shape="round" @click="createItemFromScratch">
                <ion-icon slot="start" :icon="add"/>
                Создать
              </ion-button>
              <ion-button size="small" shape="round" class="import-btn" @click="openImportModal">
                <ion-icon slot="start" :icon="cloudUploadOutline"/>
                Импорт
              </ion-button>
            </div>
          </div>

          <div v-if="itemsLoading" class="items-list">
            <div v-for="n in 3" :key="n" class="item-row item-row--skeleton">
              <div class="item-row__img skeleton-block"/>
              <div class="item-row__body">
                <div class="skeleton-line" style="width: 50%"/>
                <div class="skeleton-line skeleton-line--thin" style="width: 30%"/>
              </div>
            </div>
          </div>
          <div v-else-if="!bundleItems.length" class="bundles-empty bundles-empty--sm">
            <ion-icon :icon="cubeOutline" class="bundles-empty__icon"/>
            <span>Набор пуст — создайте или импортируйте предметы</span>
          </div>
          <div v-else class="items-list">
            <div v-for="item in bundleItems" :key="item.id" class="item-row">
              <img :src="itemImageUrl(item.imgUrl)" :class="['item-row__img', getRarityClass(item.rarity)]" alt=""/>
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
        <Transition name="import">
          <div v-if="showImportModal" class="import-overlay" @click.self="showImportModal = false">
            <div class="import-modal">
              <div class="import-modal__header">
                <div class="import-modal__title-wrap">
                  <ion-icon :icon="cloudUploadOutline"/>
                  <span>Импорт моих предметов</span>
                </div>
                <button class="import-modal__close" @click="showImportModal = false">
                  <ion-icon :icon="closeOutline"/>
                </button>
              </div>
              <div class="import-modal__search">
                <ion-icon :icon="searchOutline" class="import-modal__search-icon"/>
                <ion-input
                    v-model="importSearch"
                    type="text"
                    placeholder="Поиск по названию..."
                    class="import-modal__search-input"
                    @keydown.enter="loadImportCandidates"
                    @ionBlur="loadImportCandidates"
                />
              </div>
              <div class="import-modal__body">
                <div v-if="importLoading" class="items-list">
                  <div v-for="n in 4" :key="n" class="item-row item-row--skeleton">
                    <div class="item-row__img skeleton-block"/>
                    <div class="item-row__body">
                      <div class="skeleton-line" style="width: 50%"/>
                      <div class="skeleton-line skeleton-line--thin" style="width: 30%"/>
                    </div>
                  </div>
                </div>
                <div v-else-if="!importCandidates.length" class="bundles-empty bundles-empty--sm">
                  <ion-icon :icon="cubeOutline" class="bundles-empty__icon"/>
                  <span>Предметов не найдено</span>
                </div>
                <div
                    v-for="item in importCandidates"
                    :key="item.id"
                    :class="['import-item', { 'import-item--selected': importSelectedIds.has(item.id) }]"
                    @click="toggleImportSelection(item.id)"
                >
                  <img :src="itemImageUrl(item.imgUrl)" :class="['item-row__img', getRarityClass(item.rarity)]" alt=""/>
                  <div class="item-row__body">
                    <div class="item-row__name">{{ item.name?.rus }}</div>
                    <div class="item-row__meta">{{ item.typeName }}</div>
                  </div>
                  <span class="import-item__check">
                    <ion-icon v-if="importSelectedIds.has(item.id)" :icon="checkmarkCircle"/>
                  </span>
                </div>
              </div>
              <div class="import-modal__footer">
                <ion-button
                    expand="block"
                    shape="round"
                    :disabled="importSelectedIds.size === 0 || isImporting"
                    @click="submitImport"
                >
                  <ion-icon slot="start" :icon="checkmarkCircle"/>
                  Импортировать{{ importSelectedIds.size ? ` (${importSelectedIds.size})` : "" }}
                </ion-button>
              </div>
            </div>
          </div>
        </Transition>
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
.mybundles-subtabs {
  --background: transparent;
  --indicator-color: transparent;
  width: 100%;
  min-height: 48px;
  margin: 2px 0 4px;
  padding: 4px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.09);
  border-radius: 16px;
  background:
    linear-gradient(115deg, rgba(var(--ion-color-primary-rgb), 0.13), transparent 46%),
    rgba(var(--ion-color-medium-rgb), 0.4);
  box-shadow: inset 0 1px 0 rgba(var(--ion-color-light-rgb), 0.05), 0 8px 22px rgba(0, 0, 0, 0.14);
  overflow: hidden;
}

.mybundles-subtabs ion-segment-button {
  --background: transparent;
  --background-checked: rgba(var(--ion-color-primary-rgb), 0.24);
  --color: rgba(var(--ion-color-light-rgb), 0.6);
  --color-checked: var(--ion-color-light);
  --indicator-color: transparent;
  min-width: max-content;
  min-height: 38px;
  margin: 0;
  border-radius: 11px;
  font-size: 12.5px;
  font-weight: 650;
  letter-spacing: 0.01em;
  text-transform: none;
  transition: color 0.2s ease, transform 0.2s ease;
}

.mybundles-subtabs ion-segment-button::part(indicator-background) {
  border-radius: 11px;
  box-shadow: inset 0 0 0 1px rgba(var(--ion-color-primary-rgb), 0.38), 0 4px 12px rgba(var(--ion-color-primary-rgb), 0.18);
}

.mybundles-subtabs ion-segment-button.segment-button-checked {
  font-weight: 750;
}

.mybundles-subtabs ion-segment-button:not(.segment-button-checked):hover {
  --color: rgba(var(--ion-color-light-rgb), 0.9);
  --background: rgba(var(--ion-color-light-rgb), 0.05);
}

@media (max-width: 420px) {
  .mybundles-subtabs {
    margin-inline: -2px;
    width: calc(100% + 4px);
  }

  .mybundles-subtabs ion-segment-button {
    font-size: 12px;
  }
}

.bundles-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 820px;
  margin: 0 auto;
  width: 100%;
}

/* ── Hero ─────────────────────────────────────── */
.bundles-hero {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(var(--ion-color-primary-rgb), 0.22) 0%, rgba(var(--ion-color-medium-rgb), 0.85) 55%, rgba(var(--ion-color-dark-rgb), 0.9) 100%);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.25);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.bundles-hero__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  flex-shrink: 0;
  background: rgba(var(--ion-color-primary-rgb), 0.25);
  color: var(--ion-color-primary);
  font-size: 24px;
  box-shadow: inset 0 0 0 1px rgba(var(--ion-color-primary-rgb), 0.35);
}

.bundles-hero__text {
  flex: 1;
  min-width: 0;
}

.bundles-hero__title {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: var(--ion-color-light);
}

.bundles-hero__subtitle {
  margin: 3px 0 0;
  font-size: 12.5px;
  color: rgba(var(--ion-color-light-rgb), 0.6);
}

.bundles-hero__subtitle b {
  color: var(--ion-color-primary);
}

.hero-create-btn {
  flex-shrink: 0;
  --box-shadow: 0 6px 16px rgba(var(--ion-color-primary-rgb), 0.3);
  font-weight: 700;
}

/* ── Форма ────────────────────────────────────── */
.bundle-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.88) 100%);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  overflow: hidden;
}

.bundle-form__header {
  display: flex;
  gap: 14px;
  align-items: center;
}

.bundle-form__fields {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bundle-form__input {
  --background: rgba(var(--ion-color-dark-rgb), 0.4);
  --padding-start: 12px;
  --padding-end: 12px;
  --border-radius: 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.07);
}

.bundle-form__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 14px;
  color: var(--ion-color-light);
  padding: 4px 2px;
}

.bundle-form__row-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.bundle-form__row-label ion-icon {
  font-size: 16px;
  color: #f0c04a;
}

.bundle-form__hint {
  font-size: 11.5px;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.bundle-form__price {
  max-width: 120px;
  --background: rgba(var(--ion-color-dark-rgb), 0.4);
  --padding-start: 12px;
  --padding-end: 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.07);
  text-align: right;
}

.bundle-form__save {
  margin-top: 4px;
  --box-shadow: 0 6px 16px rgba(var(--ion-color-primary-rgb), 0.28);
  font-weight: 700;
}

.bundle-avatar {
  position: relative;
  flex-shrink: 0;
  width: 76px;
  height: 76px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px dashed rgba(var(--ion-color-primary-rgb), 0.4);
  background: rgba(var(--ion-color-dark-rgb), 0.4);
  cursor: pointer;
  padding: 0;
  transition: border-color 0.18s ease;
}

.bundle-avatar:hover {
  border-color: var(--ion-color-primary);
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
  gap: 3px;
  height: 100%;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  font-size: 10px;
}

.bundle-avatar__placeholder ion-icon {
  font-size: 22px;
}

.bundle-avatar__input {
  display: none;
}

/* ── Пустое состояние ─────────────────────────── */
.bundles-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 16px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  font-size: 14px;
  text-align: center;
}

.bundles-empty--sm {
  padding: 24px 16px;
}

.bundles-empty__icon {
  font-size: 42px;
  opacity: 0.5;
}

/* ── Карточки наборов ─────────────────────────── */
.bundles-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bundle-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.88) 100%);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.07);
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.bundle-card:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--ion-color-primary-rgb), 0.35);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.3);
}

.bundle-card--selected {
  border-color: rgba(var(--ion-color-primary-rgb), 0.55);
  box-shadow: 0 0 0 1px rgba(var(--ion-color-primary-rgb), 0.25), 0 8px 22px rgba(var(--ion-color-primary-rgb), 0.14);
}

.bundle-card__art-wrap {
  position: relative;
  flex-shrink: 0;
}

.bundle-card__art {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  object-fit: cover;
  display: block;
  background: rgba(var(--ion-color-dark-rgb), 0.5);
  box-shadow: inset 0 0 0 1px rgba(var(--ion-color-light-rgb), 0.08);
}

.bundle-card__art--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: rgba(var(--ion-color-light-rgb), 0.35);
}

.bundle-card__body {
  flex: 1;
  min-width: 0;
}

.bundle-card__name {
  font-size: 15.5px;
  font-weight: 700;
  color: var(--ion-color-light);
  letter-spacing: 0.01em;
}

.bundle-card__description {
  margin-top: 3px;
  font-size: 12.5px;
  line-height: 1.35;
  color: rgba(var(--ion-color-light-rgb), 0.55);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bundle-card__meta {
  margin-top: 7px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.bundle-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(var(--ion-color-light-rgb), 0.08);
  color: rgba(var(--ion-color-light-rgb), 0.65);
}

.bundle-badge ion-icon {
  font-size: 12px;
}

.bundle-badge--public {
  background: rgba(var(--ion-color-primary-rgb), 0.14);
  color: var(--ion-color-primary);
  box-shadow: inset 0 0 0 1px rgba(var(--ion-color-primary-rgb), 0.22);
}

.bundle-badge--price {
  background: linear-gradient(120deg, rgba(240, 190, 60, 0.25), rgba(240, 160, 40, 0.12));
  color: #f0c04a;
  box-shadow: inset 0 0 0 1px rgba(240, 190, 60, 0.3);
}

.bundle-card__actions {
  display: flex;
  flex-shrink: 0;
}

/* ── Предметы набора ──────────────────────────── */
.bundle-items {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--ion-color-medium-rgb), 0.6) 0%, rgba(var(--ion-color-dark-rgb), 0.78) 100%);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.18);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bundle-items__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.bundle-items__eyebrow {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ion-color-primary);
}

.bundle-items__title {
  margin: 2px 0 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--ion-color-light);
}

.bundle-items__actions {
  display: flex;
  gap: 6px;
}

.import-btn {
  --box-shadow: 0 5px 14px rgba(var(--ion-color-primary-rgb), 0.28);
  font-weight: 600;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 14px;
  background: rgba(var(--ion-color-dark-rgb), 0.4);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.05);
  transition: background 0.15s;
}

.item-row:hover {
  background: rgba(var(--ion-color-dark-rgb), 0.6);
}

.item-row__img {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid transparent;
}

.item-row__body {
  flex: 1;
  min-width: 0;
}

.item-row__name {
  font-size: 14px;
  font-weight: 650;
  color: var(--ion-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-row__meta {
  margin-top: 1px;
  font-size: 11.5px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
}

/* ── Скелетоны ────────────────────────────────── */
@keyframes shimmer {
  0% { opacity: 0.45; }
  50% { opacity: 0.9; }
  100% { opacity: 0.45; }
}

.bundle-card--skeleton,
.item-row--skeleton {
  pointer-events: none;
}

.skeleton-block {
  animation: shimmer 1.4s ease-in-out infinite;
  background: rgba(var(--ion-color-light-rgb), 0.08) !important;
  border: none !important;
}

.skeleton-line {
  height: 13px;
  border-radius: 6px;
  background: rgba(var(--ion-color-light-rgb), 0.08);
  animation: shimmer 1.4s ease-in-out infinite;
  margin-bottom: 8px;
}

.skeleton-line--thin {
  height: 9px;
}

/* ── Переходы ─────────────────────────────────── */
.form-slide-enter-active,
.form-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1);
}

.form-slide-enter-from,
.form-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ── Модалка импорта ──────────────────────────── */
.import-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.import-modal {
  width: 100%;
  max-width: 680px;
  max-height: 80vh;
  background: linear-gradient(170deg, #23223a 0%, #171628 100%);
  border-radius: 22px 22px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.import-enter-active,
.import-leave-active {
  transition: opacity 0.22s ease;
}

.import-enter-active .import-modal,
.import-leave-active .import-modal {
  transition: transform 0.26s cubic-bezier(0.2, 0.9, 0.3, 1);
}

.import-enter-from,
.import-leave-to {
  opacity: 0;
}

.import-enter-from .import-modal,
.import-leave-to .import-modal {
  transform: translateY(48px);
}

.import-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.import-modal__title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}

.import-modal__title-wrap ion-icon {
  font-size: 20px;
  color: var(--ion-color-primary);
}

.import-modal__close {
  background: rgba(255, 255, 255, 0.07);
  border: none;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 19px;
  cursor: pointer;
  display: flex;
  padding: 5px;
  transition: background 0.15s, color 0.15s;
}

.import-modal__close:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.import-modal__search {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 20px 8px;
}

.import-modal__search-icon {
  position: absolute;
  left: 32px;
  z-index: 2;
  font-size: 17px;
  color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
}

.import-modal__search-input {
  --background: rgba(255, 255, 255, 0.06);
  --padding-start: 40px;
  --padding-end: 12px;
  border-radius: 12px;
}

.import-modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.import-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.import-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.import-item--selected {
  border-color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
}

.import-item__check {
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ion-color-primary);
  font-size: 20px;
  flex-shrink: 0;
}

.import-modal__footer {
  padding: 12px 20px calc(14px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

/* Редкость предметов */
.rarity-common { border-color: rgba(160, 160, 160, 0.5); }
.rarity-uncommon { border-color: rgba(70, 190, 90, 0.75); }
.rarity-rare { border-color: rgba(80, 130, 240, 0.8); }
.rarity-very-rare { border-color: rgba(170, 80, 230, 0.8); }
.rarity-legendary {
  border-color: rgba(240, 160, 40, 0.85);
  box-shadow: 0 0 10px rgba(240, 160, 40, 0.3);
}
</style>
