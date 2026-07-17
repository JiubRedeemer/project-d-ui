<script setup lang="ts">
import {
  IonButton,
  IonIcon,
  IonInput,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonToggle,
  toastController,
} from "@ionic/vue";
import {computed, onMounted, ref} from "vue";
import MasterRulebookBundlesView from "@/views/master/tabs/MasterRulebookBundlesView.vue";
import MasterSpellBundlesView from "@/views/master/tabs/MasterSpellBundlesView.vue";
import type {RulebookBundleCategory} from "@/api/rulebookBundleApi.types";
import {useRoute} from "vue-router";
import {
  checkmarkCircle,
  closeOutline,
  cubeOutline,
  diamondOutline,
  layersOutline,
  searchOutline,
  sparklesOutline,
} from "ionicons/icons";
import type {Item, ItemBundle} from "@/components/models/response/InventoryResponse";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {
  disableBundleForRoom,
  enableBundleForRoom,
  getBundleItems,
  getBundlesForRoom,
  purchaseBundle,
} from "@/api/bundleApi";

const route = useRoute();
const subTab = ref<"items" | "spells" | RulebookBundleCategory>("items");
const bundles = ref<ItemBundle[]>([]);
const isLoading = ref(false);
const searchQuery = ref("");
const togglingIds = ref<Set<string>>(new Set());
const purchasingIds = ref<Set<string>>(new Set());
let searchDebounce: ReturnType<typeof setTimeout> | null = null;

// Просмотр состава набора
const previewBundle = ref<ItemBundle | null>(null);
const previewItems = ref<Item[]>([]);
const previewLoading = ref(false);

const enabledCount = computed(() => bundles.value.filter(b => b.enabled).length);

const bundleImageUrl = (imgUrl: string | undefined | null) =>
    imgUrl?.trim()
        ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
        : null;

const itemImageUrl = (imgUrl: string | undefined | null) =>
    imgUrl?.trim()
        ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
        : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";

function getRarityClass(rarity: string | undefined) {
  switch (rarity) {
    case "UNCOMMON": return "rarity-uncommon";
    case "RARE": return "rarity-rare";
    case "VERY_RARE": return "rarity-very-rare";
    case "LEGENDARY": return "rarity-legendary";
    default: return "rarity-common";
  }
}

async function loadBundles() {
  isLoading.value = true;
  try {
    bundles.value = await getBundlesForRoom(String(route.params.roomId), searchQuery.value);
  } catch (e) {
    console.error("Не удалось загрузить наборы предметов", e);
  } finally {
    isLoading.value = false;
  }
}

function onSearchInput() {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => void loadBundles(), 350);
}

onMounted(() => {
  void loadBundles();
});

/** Нужно ли покупать набор, прежде чем включать его в комнате */
function needsPurchase(bundle: ItemBundle): boolean {
  const isSystem = !bundle.ownerUserId;
  const isFree = (bundle.priceCrystals ?? 0) <= 0;
  return !isSystem && Boolean(bundle.isPublic) && !isFree && !bundle.purchased;
}

async function toggleBundle(bundle: ItemBundle) {
  const roomId = String(route.params.roomId);
  const nextEnabled = !bundle.enabled;
  togglingIds.value.add(bundle.id);
  try {
    if (nextEnabled) {
      await enableBundleForRoom(roomId, bundle.id);
    } else {
      await disableBundleForRoom(roomId, bundle.id);
    }
    bundle.enabled = nextEnabled;
  } catch (e: any) {
    console.error("Не удалось переключить набор", e);
    const isPaymentRequired = e?.response?.status === 402;
    const toast = await toastController.create({
      message: isPaymentRequired ? "Сначала купите этот набор" : "Не удалось изменить набор предметов",
      duration: 1500,
      position: "top",
    });
    await toast.present();
  } finally {
    togglingIds.value.delete(bundle.id);
  }
}

async function buyBundle(bundle: ItemBundle) {
  if (!confirm(`Купить набор «${bundle.name}» за ${bundle.priceCrystals} кристаллов?`)) return;
  purchasingIds.value.add(bundle.id);
  try {
    await purchaseBundle(bundle.id);
    bundle.purchased = true;
    const toast = await toastController.create({
      message: "Набор куплен!",
      duration: 1500,
      position: "top",
    });
    await toast.present();
  } catch (e: any) {
    console.error("Не удалось купить набор", e);
    const toast = await toastController.create({
      message: e?.response?.data?.message ?? "Не удалось купить набор (проверьте баланс кристаллов)",
      duration: 2000,
      position: "top",
    });
    await toast.present();
  } finally {
    purchasingIds.value.delete(bundle.id);
  }
}

async function openPreview(bundle: ItemBundle) {
  previewBundle.value = bundle;
  previewLoading.value = true;
  try {
    previewItems.value = await getBundleItems(bundle.id);
  } catch (e) {
    console.error("Не удалось загрузить состав набора", e);
    previewItems.value = [];
  } finally {
    previewLoading.value = false;
  }
}

function closePreview() {
  previewBundle.value = null;
  previewItems.value = [];
}
</script>

<template>
  <div class="bundles-view">
    <!-- Подвкладки: предметы / заклинания / расы / классы / предыстории / чертежи -->
    <ion-segment v-model="subTab" class="bundles-subtabs" mode="ios" scrollable>
      <ion-segment-button value="items"><ion-label>Предметы</ion-label></ion-segment-button>
      <ion-segment-button value="spells"><ion-label>Заклинания</ion-label></ion-segment-button>
      <ion-segment-button value="RACE"><ion-label>Расы</ion-label></ion-segment-button>
      <ion-segment-button value="CLAZZ"><ion-label>Классы</ion-label></ion-segment-button>
      <ion-segment-button value="BACKGROUND"><ion-label>Предыстории</ion-label></ion-segment-button>
      <ion-segment-button value="BLUEPRINT"><ion-label>Чертежи</ion-label></ion-segment-button>
    </ion-segment>

    <MasterSpellBundlesView v-if="subTab === 'spells'" />

    <MasterRulebookBundlesView v-else-if="subTab !== 'items'" :category="(subTab as RulebookBundleCategory)" />

    <template v-else>
    <!-- Шапка -->
    <div class="bundles-hero">
      <div class="bundles-hero__icon">
        <ion-icon :icon="layersOutline"/>
      </div>
      <div class="bundles-hero__text">
        <h2 class="bundles-hero__title">Наборы предметов</h2>
        <p class="bundles-hero__subtitle">
          Подключено: <b>{{ enabledCount }}</b> из {{ bundles.length }}
        </p>
      </div>
    </div>

    <!-- Поиск -->
    <div class="bundles-search">
      <ion-icon :icon="searchOutline" class="bundles-search__icon"/>
      <ion-input
          v-model="searchQuery"
          type="text"
          placeholder="Найти набор..."
          class="bundles-search__input"
          @ionInput="onSearchInput"
      />
    </div>

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

    <div v-else-if="!bundles.length" class="bundles-empty">
      <ion-icon :icon="cubeOutline" class="bundles-empty__icon"/>
      <span>Наборов не найдено</span>
    </div>

    <!-- Список -->
    <div v-else class="bundles-list">
      <div
          v-for="bundle in bundles"
          :key="bundle.id"
          :class="['bundle-card', { 'bundle-card--enabled': bundle.enabled }]"
          @click="openPreview(bundle)"
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
          <div v-if="bundle.enabled" class="bundle-card__enabled-dot" title="Подключён в комнате"/>
        </div>

        <div class="bundle-card__body">
          <div class="bundle-card__name">{{ bundle.name }}</div>
          <div v-if="bundle.description" class="bundle-card__description">{{ bundle.description }}</div>
          <div class="bundle-card__meta">
            <span v-if="!bundle.ownerUserId" class="bundle-badge bundle-badge--system">
              <ion-icon :icon="sparklesOutline"/>
              Официальный
            </span>
            <span v-else-if="bundle.isPublic && (bundle.priceCrystals ?? 0) > 0" class="bundle-badge bundle-badge--price">
              <ion-icon :icon="diamondOutline"/>
              {{ bundle.priceCrystals }}
            </span>
            <span v-else-if="bundle.isPublic" class="bundle-badge bundle-badge--public">Бесплатный</span>
            <span v-else class="bundle-badge">Мой набор</span>
            <span v-if="bundle.purchased" class="bundle-badge bundle-badge--purchased">
              <ion-icon :icon="checkmarkCircle"/>
              Куплен
            </span>
          </div>
        </div>

        <div class="bundle-card__actions" @click.stop>
          <ion-button
              v-if="needsPurchase(bundle)"
              size="small"
              shape="round"
              class="buy-btn"
              :disabled="purchasingIds.has(bundle.id)"
              @click="buyBundle(bundle)"
          >
            <ion-icon slot="start" :icon="diamondOutline"/>
            {{ bundle.priceCrystals }}
          </ion-button>
          <ion-toggle
              v-else
              :checked="bundle.enabled"
              :disabled="togglingIds.has(bundle.id)"
              @ionChange="toggleBundle(bundle)"
          />
        </div>
      </div>
    </div>
    </template>

    <!-- Просмотр состава -->
    <Teleport to="body">
      <Transition name="preview">
        <div v-if="previewBundle" class="preview-overlay" @click.self="closePreview">
          <div class="preview-modal">
            <div class="preview-modal__hero">
              <img
                  v-if="bundleImageUrl(previewBundle.imgUrl)"
                  :src="bundleImageUrl(previewBundle.imgUrl) ?? undefined"
                  class="preview-modal__art"
                  alt=""
              />
              <div v-else class="preview-modal__art preview-modal__art--placeholder">
                <ion-icon :icon="cubeOutline"/>
              </div>
              <div class="preview-modal__hero-text">
                <div class="preview-modal__title">{{ previewBundle.name }}</div>
                <div v-if="previewBundle.description" class="preview-modal__description">
                  {{ previewBundle.description }}
                </div>
                <div class="preview-modal__count" v-if="!previewLoading">
                  {{ previewItems.length }} предм.
                </div>
              </div>
              <button class="preview-modal__close" @click="closePreview">
                <ion-icon :icon="closeOutline"/>
              </button>
            </div>

            <div class="preview-modal__body">
              <div v-if="previewLoading" class="preview-items">
                <div v-for="n in 4" :key="n" class="preview-item preview-item--skeleton">
                  <div class="preview-item__img skeleton-block"/>
                  <div class="preview-item__body">
                    <div class="skeleton-line" style="width: 50%"/>
                    <div class="skeleton-line skeleton-line--thin" style="width: 30%"/>
                  </div>
                </div>
              </div>
              <div v-else-if="!previewItems.length" class="bundles-empty">
                <ion-icon :icon="cubeOutline" class="bundles-empty__icon"/>
                <span>Набор пуст</span>
              </div>
              <div v-else class="preview-items">
                <div v-for="item in previewItems" :key="item.id" class="preview-item">
                  <img
                      :src="itemImageUrl(item.imgUrl)"
                      :class="['preview-item__img', getRarityClass(item.rarity)]"
                      alt=""
                  />
                  <div class="preview-item__body">
                    <div class="preview-item__name">{{ item.name?.rus }}</div>
                    <div class="preview-item__meta">
                      {{ item.typeName }}<span v-if="item.subtypeName"> · {{ item.subtypeName }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.bundles-view {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 860px;
  margin: 0 auto;
  width: 100%;
}
.bundles-subtabs {
  --background: transparent;
  --indicator-color: transparent;
  width: 100%;
  min-height: 48px;
  padding: 4px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.09);
  border-radius: 16px;
  background:
    linear-gradient(115deg, rgba(var(--ion-color-primary-rgb), 0.13), transparent 46%),
    rgba(var(--ion-color-medium-rgb), 0.4);
  box-shadow: inset 0 1px 0 rgba(var(--ion-color-light-rgb), 0.05), 0 8px 22px rgba(0, 0, 0, 0.14);
  overflow: hidden;
}

.bundles-subtabs ion-segment-button {
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

.bundles-subtabs ion-segment-button::part(indicator-background) {
  border-radius: 11px;
  box-shadow: inset 0 0 0 1px rgba(var(--ion-color-primary-rgb), 0.38), 0 4px 12px rgba(var(--ion-color-primary-rgb), 0.18);
}

.bundles-subtabs ion-segment-button.segment-button-checked {
  font-weight: 750;
}

.bundles-subtabs ion-segment-button:not(.segment-button-checked):hover {
  --color: rgba(var(--ion-color-light-rgb), 0.9);
  --background: rgba(var(--ion-color-light-rgb), 0.05);
}

@media (max-width: 420px) {
  .bundles-subtabs {
    margin-inline: -2px;
    width: calc(100% + 4px);
  }

  .bundles-subtabs ion-segment-button {
    font-size: 12px;
  }
}

/* ── Шапка ────────────────────────────────────── */
.bundles-hero {
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

/* ── Поиск ────────────────────────────────────── */
.bundles-search {
  position: relative;
  display: flex;
  align-items: center;
}

.bundles-search__icon {
  position: absolute;
  left: 16px;
  z-index: 2;
  font-size: 17px;
  color: rgba(var(--ion-color-light-rgb), 0.45);
  pointer-events: none;
}

.bundles-search__input {
  --background: rgba(var(--ion-color-medium-rgb), 0.75);
  --padding-start: 44px;
  --padding-end: 14px;
  border-radius: 14px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  transition: border-color 0.2s ease;
}

.bundles-search__input:focus-within {
  border-color: rgba(var(--ion-color-primary-rgb), 0.5);
}

/* ── Пустое состояние ─────────────────────────── */
.bundles-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 36px 0;
  color: rgba(var(--ion-color-light-rgb), 0.45);
  font-size: 14px;
}

.bundles-empty__icon {
  font-size: 40px;
  opacity: 0.5;
}

/* ── Карточки ─────────────────────────────────── */
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

.bundle-card--enabled {
  border-color: rgba(var(--ion-color-primary-rgb), 0.45);
  box-shadow: 0 0 0 1px rgba(var(--ion-color-primary-rgb), 0.2), 0 8px 22px rgba(var(--ion-color-primary-rgb), 0.12);
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

.bundle-card__enabled-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ion-color-primary);
  border: 2.5px solid var(--ion-color-dark);
  box-shadow: 0 0 8px rgba(var(--ion-color-primary-rgb), 0.8);
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

.bundle-badge--system {
  background: linear-gradient(120deg, rgba(var(--ion-color-secondary-rgb), 0.22), rgba(var(--ion-color-secondary-rgb), 0.1));
  color: var(--ion-color-secondary);
  box-shadow: inset 0 0 0 1px rgba(var(--ion-color-secondary-rgb), 0.25);
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

.bundle-badge--purchased {
  background: rgba(var(--ion-color-success-rgb), 0.14);
  color: var(--ion-color-success);
  box-shadow: inset 0 0 0 1px rgba(var(--ion-color-success-rgb), 0.25);
}

.bundle-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.buy-btn {
  --background: linear-gradient(120deg, #f0c04a 0%, #e09a30 100%);
  --background-hover: linear-gradient(120deg, #f5cc60 0%, #eaa63e 100%);
  --color: #2a1f08;
  --box-shadow: 0 6px 16px rgba(240, 180, 60, 0.35);
  font-weight: 700;
}

/* ── Скелетоны ────────────────────────────────── */
@keyframes shimmer {
  0% { opacity: 0.45; }
  50% { opacity: 0.9; }
  100% { opacity: 0.45; }
}

.bundle-card--skeleton {
  pointer-events: none;
}

.skeleton-block {
  animation: shimmer 1.4s ease-in-out infinite;
  background: rgba(var(--ion-color-light-rgb), 0.08) !important;
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

/* ── Просмотр состава ─────────────────────────── */
.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.preview-modal {
  width: 100%;
  max-width: 680px;
  max-height: 78vh;
  background: linear-gradient(170deg, #23223a 0%, #171628 100%);
  border-radius: 22px 22px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-enter-active,
.preview-leave-active {
  transition: opacity 0.22s ease;
}

.preview-enter-active .preview-modal,
.preview-leave-active .preview-modal {
  transition: transform 0.26s cubic-bezier(0.2, 0.9, 0.3, 1);
}

.preview-enter-from,
.preview-leave-to {
  opacity: 0;
}

.preview-enter-from .preview-modal,
.preview-leave-to .preview-modal {
  transform: translateY(48px);
}

.preview-modal__hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 20px 14px;
  background: linear-gradient(135deg, rgba(var(--ion-color-primary-rgb), 0.16) 0%, transparent 65%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.preview-modal__art {
  width: 58px;
  height: 58px;
  border-radius: 15px;
  object-fit: cover;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.preview-modal__art--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: rgba(255, 255, 255, 0.35);
}

.preview-modal__hero-text {
  flex: 1;
  min-width: 0;
  padding-right: 28px;
}

.preview-modal__title {
  font-size: 17px;
  font-weight: 800;
  color: #fff;
}

.preview-modal__description {
  margin-top: 3px;
  font-size: 12.5px;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.55);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-modal__count {
  margin-top: 6px;
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.18);
  color: var(--ion-color-primary);
}

.preview-modal__close {
  position: absolute;
  top: 14px;
  right: 14px;
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

.preview-modal__close:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.preview-modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px calc(18px + env(safe-area-inset-bottom, 0px));
}

.preview-items {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.15s;
}

.preview-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.preview-item--skeleton {
  pointer-events: none;
}

.preview-item__img {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid transparent;
}

.preview-item__body {
  flex: 1;
  min-width: 0;
}

.preview-item__name {
  font-size: 14px;
  font-weight: 650;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-item__meta {
  margin-top: 1px;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.5);
}

/* Редкость предметов */
.rarity-common { border-color: rgba(160, 160, 160, 0.6); }
.rarity-uncommon { border-color: rgba(70, 190, 90, 0.75); }
.rarity-rare { border-color: rgba(80, 130, 240, 0.8); }
.rarity-very-rare { border-color: rgba(170, 80, 230, 0.8); }
.rarity-legendary {
  border-color: rgba(240, 160, 40, 0.85);
  box-shadow: 0 0 10px rgba(240, 160, 40, 0.3);
}
</style>
