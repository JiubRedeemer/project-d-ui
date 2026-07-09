<script setup lang="ts">
import {
  IonButton,
  IonIcon,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  toastController,
} from "@ionic/vue";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import {
  addCircleOutline,
  addOutline,
  checkmarkCircleOutline,
  closeOutline,
  createOutline,
  imageOutline,
  pricetagOutline,
  searchOutline,
  storefrontOutline,
  trashOutline,
} from "ionicons/icons";
import axios from "axios";
import goldenCoinIcon from "@/static/icons/GoldenCoin.svg";
import silverCoinIcon from "@/static/icons/SilverCoin.svg";
import copperCoinIcon from "@/static/icons/CopperCoin.svg";
import type { Item } from "@/components/models/response/InventoryResponse";
import type { ShopDto, ShopItemDto } from "@/api/shopApi.types";
import { useShopsStore } from "@/stores/ShopsStore";
import { getNpcsByRoomIdForRoom } from "@/api/npcApi";
import type { NpcDto } from "@/api/npcApi.types";
import { FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";

const route = useRoute();
const roomId = computed(() => String(route.params.roomId));
const shopsStore = useShopsStore();

const npcs = ref<NpcDto[]>([]);
/** Поиск по списку магазинов (в тулбаре секции). */
const shopSearch = ref("");

// --- Редактор карточки магазина ---
const editorOpen = ref(false);
const editing = ref<ShopDto | null>(null);
const form = ref<{ name: string; description: string; npcId: string | null; imgUrl: string }>({
  name: "",
  description: "",
  npcId: null,
  imgUrl: "",
});
const saving = ref(false);

// --- Загрузка картинки магазина (тот же бакет, что и у NPC, но с префиксом "shop") ---
const fileInput = ref<HTMLInputElement | null>(null);
const previewImage = ref<string | null>(null);
const uploadingImage = ref(false);
const allowedFormats = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
  "image/tiff",
  "image/svg+xml",
];

// --- Витрина выбранного магазина ---
const activeShop = ref<ShopDto | null>(null);
const showcaseLoading = ref(false);

// --- Поиск предметов для добавления в витрину ---
const itemSearchQuery = ref("");
const itemResults = ref<Item[]>([]);
const itemSearchLoading = ref(false);
let searchDebounce: ReturnType<typeof setTimeout> | null = null;

const shops = computed(() => shopsStore.shops);

/** Магазины, отфильтрованные по строке поиска (по названию, описанию и имени NPC). */
const filteredShops = computed(() => {
  const q = shopSearch.value.trim().toLowerCase();
  if (!q) return shops.value;
  return shops.value.filter((shop) => {
    const haystack = [shop.name, shop.description, npcName(shop.npcId)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
});
const showcaseItems = computed<ShopItemDto[]>(() =>
  activeShop.value?.id ? shopsStore.itemsByShop[activeShop.value.id] ?? [] : []
);

function imageUrl(imgUrl?: string | null): string {
  return imgUrl?.trim()
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
    : "https://img.icons8.com/fluency/48/shop.png";
}

/** Картинка магазина хранится в бакете NPC (npc-images) с префиксом имени "shop". */
function shopImageUrl(imgUrl?: string | null): string {
  return imgUrl?.trim()
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
    : "https://img.icons8.com/fluency/48/shop.png";
}

/** URL превью в редакторе: локальный data-url, если только что выбрали файл, иначе — загруженная картинка. */
const editorImageUrl = computed<string | null>(() => {
  if (previewImage.value) return previewImage.value;
  return form.value.imgUrl?.trim() ? shopImageUrl(form.value.imgUrl) : null;
});

function npcName(npcId?: string | null): string {
  if (!npcId) return "";
  return npcs.value.find((n) => n.id === npcId)?.name ?? "";
}

async function toast(message: string) {
  const t = await toastController.create({ message, duration: 1800, position: "bottom" });
  await t.present();
}

// ---------- Загрузка ----------
onMounted(async () => {
  await Promise.all([
    shopsStore.loadShops(roomId.value),
    loadNpcs(),
  ]);
});

async function loadNpcs() {
  try {
    npcs.value = await getNpcsByRoomIdForRoom(roomId.value, { forceAll: true });
  } catch (e) {
    console.error("Не удалось загрузить NPC", e);
  }
}

// ---------- Картинка магазина ----------
function triggerFileInput() {
  fileInput.value?.click();
}

async function uploadShopImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  // Тот же бакет, что и у NPC, но с префиксом "shop" в имени файла.
  formData.append("userFilename", `shop-${Date.now()}`);
  const { data } = await axios.put<string>(
    `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  if (!file) return;
  if (!allowedFormats.includes(file.type)) {
    await toast("Формат не поддерживается. Разрешены: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG.");
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    previewImage.value = reader.result as string;
  };
  reader.readAsDataURL(file);
  uploadingImage.value = true;
  try {
    form.value.imgUrl = await uploadShopImage(file);
  } catch (e) {
    console.error("Не удалось загрузить картинку", e);
    await toast("Не удалось загрузить картинку");
    previewImage.value = null;
  } finally {
    uploadingImage.value = false;
    input.value = "";
  }
}

function removeShopImage() {
  form.value.imgUrl = "";
  previewImage.value = null;
}

// ---------- CRUD магазина ----------
function openCreate() {
  editing.value = null;
  previewImage.value = null;
  form.value = { name: "", description: "", npcId: null, imgUrl: "" };
  editorOpen.value = true;
}

function openEdit(shop: ShopDto) {
  editing.value = shop;
  previewImage.value = null;
  form.value = {
    name: shop.name ?? "",
    description: shop.description ?? "",
    npcId: shop.npcId ?? null,
    imgUrl: shop.imgUrl ?? "",
  };
  editorOpen.value = true;
}

function closeEditor() {
  editorOpen.value = false;
  editing.value = null;
  previewImage.value = null;
}

async function saveShop() {
  if (!form.value.name.trim()) {
    await toast("Укажите название магазина");
    return;
  }
  saving.value = true;
  try {
    const payload: Partial<ShopDto> = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || null,
      npcId: form.value.npcId || null,
      imgUrl: form.value.imgUrl.trim() || null,
    };
    if (editing.value?.id) {
      await shopsStore.updateShop(roomId.value, editing.value.id, payload);
    } else {
      await shopsStore.createShop(roomId.value, payload);
    }
    closeEditor();
  } catch (e) {
    console.error("Не удалось сохранить магазин", e);
    await toast("Не удалось сохранить магазин");
  } finally {
    saving.value = false;
  }
}

async function removeShop(shop: ShopDto) {
  if (!shop.id) return;
  try {
    await shopsStore.removeShop(roomId.value, shop.id);
    if (activeShop.value?.id === shop.id) activeShop.value = null;
  } catch (e) {
    console.error("Не удалось удалить магазин", e);
    await toast("Не удалось удалить магазин");
  }
}

// ---------- Витрина ----------
async function openShowcase(shop: ShopDto) {
  activeShop.value = shop;
  itemResults.value = [];
  itemSearchQuery.value = "";
  if (!shop.id) return;
  showcaseLoading.value = true;
  try {
    await shopsStore.loadShopItems(roomId.value, shop.id);
  } catch (e) {
    console.error("Не удалось загрузить витрину", e);
  } finally {
    showcaseLoading.value = false;
  }
}

function closeShowcase() {
  activeShop.value = null;
}

function onItemSearchInput() {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => void searchItems(), 350);
}

async function searchItems() {
  const q = itemSearchQuery.value.trim();
  itemSearchLoading.value = true;
  try {
    const { data } = await axios.post<Item[]>(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId.value}${GATEWAY_INTEGRATION_ROUTES.items}${GATEWAY_INTEGRATION_ROUTES.search}`,
      { searchQuery: q, limit: 25, lastSeenCreatedAt: null, lastSeenId: null },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    itemResults.value = data ?? [];
  } catch (e) {
    console.error("Не удалось найти предметы", e);
  } finally {
    itemSearchLoading.value = false;
  }
}

const existingItemIds = computed(() => new Set(showcaseItems.value.map((si) => si.itemId)));

async function addItem(item: Item) {
  if (!activeShop.value?.id) return;
  if (existingItemIds.value.has(item.id)) {
    await toast("Предмет уже в витрине");
    return;
  }
  try {
    await shopsStore.saveShopItem(roomId.value, activeShop.value.id, {
      itemId: item.id,
      priceGold: 0,
      priceSilver: 0,
      priceCopper: 0,
      sortOrder: showcaseItems.value.length,
    });
  } catch (e) {
    console.error("Не удалось добавить предмет", e);
    await toast("Не удалось добавить предмет");
  }
}

async function savePrice(si: ShopItemDto) {
  if (!activeShop.value?.id) return;
  try {
    await shopsStore.saveShopItem(roomId.value, activeShop.value.id, {
      ...si,
      priceGold: Number(si.priceGold) || 0,
      priceSilver: Number(si.priceSilver) || 0,
      priceCopper: Number(si.priceCopper) || 0,
    });
  } catch (e) {
    console.error("Не удалось сохранить цену", e);
    await toast("Не удалось сохранить цену");
  }
}

async function removeShowcaseItem(si: ShopItemDto) {
  if (!activeShop.value?.id || !si.id) return;
  try {
    await shopsStore.removeShopItem(roomId.value, activeShop.value.id, si.id);
  } catch (e) {
    console.error("Не удалось удалить позицию", e);
    await toast("Не удалось удалить позицию");
  }
}
</script>

<template>
  <div class="shops-section">
    <!-- Список магазинов -->
    <template v-if="!activeShop">
      <div class="shops-toolbar">
        <div class="sectionHeader">
          <ion-icon :icon="storefrontOutline" />
          <span>Магазины</span>
          <span v-if="filteredShops.length" class="sectionHeader__count">{{ filteredShops.length }}</span>
        </div>
        <ion-button class="add-btn" size="small" @click="openCreate">
          <ion-icon slot="start" :icon="addOutline" />
          Новый магазин
        </ion-button>
      </div>

      <div v-if="shops.length" class="item-search__bar shops-search">
        <ion-icon :icon="searchOutline" />
        <ion-input
          v-model="shopSearch"
          placeholder="Поиск магазина по названию или NPC"
          aria-label="Поиск магазина"
          :clear-input="true"
        />
      </div>

      <div v-if="shopsStore.isLoading" class="shops-loading">
        <ion-spinner name="crescent" />
      </div>

      <div v-else-if="shops.length === 0" class="shops-empty">
        <ion-icon :icon="storefrontOutline" class="shops-empty__icon" />
        <div class="shops-empty__title">Пока нет ни одного магазина</div>
        <div class="shops-empty__text">Создайте первый — карточку с NPC-продавцом и списком товаров с ценами.</div>
      </div>

      <div v-else-if="filteredShops.length === 0" class="shops-empty shops-empty--compact">
        <ion-icon :icon="searchOutline" class="shops-empty__icon" />
        <div class="shops-empty__text">Ничего не найдено по запросу «{{ shopSearch.trim() }}».</div>
      </div>

      <div v-else class="shops-grid">
        <article
          v-for="shop in filteredShops"
          :key="shop.id"
          class="shop-card"
          @click="openShowcase(shop)"
        >
          <div class="shop-card__media">
            <img class="shop-card__img" :src="shopImageUrl(shop.imgUrl)" alt="" />
          </div>
          <div class="shop-card__body">
            <div class="shop-card__name">{{ shop.name }}</div>
            <div v-if="npcName(shop.npcId)" class="shop-card__npc">
              <ion-icon :icon="pricetagOutline" />
              {{ npcName(shop.npcId) }}
            </div>
            <div v-if="shop.description" class="shop-card__desc">{{ shop.description }}</div>
          </div>
          <div class="shop-card__actions" @click.stop>
            <ion-button fill="clear" size="small" @click="openEdit(shop)">
              <ion-icon slot="icon-only" :icon="createOutline" />
            </ion-button>
            <ion-button fill="clear" size="small" color="danger" @click="removeShop(shop)">
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-button>
          </div>
        </article>
      </div>
    </template>

    <!-- Витрина магазина -->
    <template v-else>
      <div class="showcase-head">
        <button type="button" class="showcase-back" @click="closeShowcase">
          <ion-icon :icon="closeOutline" />
        </button>
        <img class="showcase-head__img" :src="shopImageUrl(activeShop.imgUrl)" alt="" />
        <div class="showcase-head__info">
          <div class="showcase-head__name">{{ activeShop.name }}</div>
          <div v-if="npcName(activeShop.npcId)" class="showcase-head__npc">Продавец: {{ npcName(activeShop.npcId) }}</div>
        </div>
      </div>

      <div class="sectionHeader">
        <span>Витрина</span>
        <span v-if="showcaseItems.length" class="sectionHeader__count">{{ showcaseItems.length }}</span>
      </div>

      <!-- Текущая витрина -->
      <div v-if="showcaseLoading" class="shops-loading">
        <ion-spinner name="crescent" />
      </div>
      <div v-else-if="showcaseItems.length === 0" class="shops-empty shops-empty--compact">
        <div class="shops-empty__text">В витрине пока нет товаров. Найдите предметы ниже и добавьте их.</div>
      </div>
      <div v-else class="showcase-list">
        <div v-for="si in showcaseItems" :key="si.id" class="showcase-row">
          <img class="showcase-row__img" :src="imageUrl(si.item?.imgUrl)" alt="" />
          <div class="showcase-row__main">
            <div class="showcase-row__top">
              <div class="showcase-row__name">{{ si.item?.name?.rus ?? si.item?.name?.eng ?? "Предмет" }}</div>
              <ion-button class="showcase-row__del" fill="clear" size="small" color="danger" @click="removeShowcaseItem(si)">
                <ion-icon slot="icon-only" :icon="trashOutline" />
              </ion-button>
            </div>
            <div class="showcase-row__prices">
              <label class="price-field price-field--gold">
                <ion-icon :icon="goldenCoinIcon" class="price-field__coin" />
                <ion-input type="number" inputmode="numeric" v-model.number="si.priceGold" @ionBlur="savePrice(si)" aria-label="Золото" />
              </label>
              <label class="price-field price-field--silver">
                <ion-icon :icon="silverCoinIcon" class="price-field__coin" />
                <ion-input type="number" inputmode="numeric" v-model.number="si.priceSilver" @ionBlur="savePrice(si)" aria-label="Серебро" />
              </label>
              <label class="price-field price-field--copper">
                <ion-icon :icon="copperCoinIcon" class="price-field__coin" />
                <ion-input type="number" inputmode="numeric" v-model.number="si.priceCopper" @ionBlur="savePrice(si)" aria-label="Медь" />
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Поиск предметов для добавления -->
      <div class="sectionHeader">
        <span>Добавить товар</span>
      </div>
      <div class="item-search">
        <div class="item-search__bar">
          <ion-icon :icon="searchOutline" />
          <ion-input
            v-model="itemSearchQuery"
            placeholder="Найти предмет для витрины"
            @ionInput="onItemSearchInput"
            aria-label="Поиск предмета"
          />
        </div>
        <div v-if="itemSearchLoading" class="shops-loading"><ion-spinner name="crescent" /></div>
        <div v-else-if="itemResults.length" class="item-results">
          <button
            v-for="item in itemResults"
            :key="item.id"
            type="button"
            class="item-result"
            :class="{ 'item-result--added': existingItemIds.has(item.id) }"
            :disabled="existingItemIds.has(item.id)"
            @click="addItem(item)"
          >
            <img class="item-result__img" :src="imageUrl(item.imgUrl)" alt="" />
            <span class="item-result__name">{{ item.name?.rus ?? item.name?.eng }}</span>
            <ion-icon
              class="item-result__action"
              :icon="existingItemIds.has(item.id) ? checkmarkCircleOutline : addCircleOutline"
            />
          </button>
        </div>
      </div>
    </template>

    <!-- Редактор карточки магазина -->
    <div v-if="editorOpen" class="editor-backdrop" @click.self="closeEditor">
      <div class="editor">
        <div class="editor__header">
          <div class="sectionHeader sectionHeader--flush">
            <ion-icon :icon="storefrontOutline" />
            <span>{{ editing ? "Редактировать магазин" : "Новый магазин" }}</span>
          </div>
          <ion-button fill="clear" size="small" @click="closeEditor">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </div>
        <div class="editor__body">
          <div class="editor__avatar-row">
            <button type="button" class="shop-avatar" :class="{ 'shop-avatar--empty': !editorImageUrl }" @click="triggerFileInput">
              <img v-if="editorImageUrl" :src="editorImageUrl" alt="" class="shop-avatar__img" />
              <template v-else>
                <ion-icon :icon="imageOutline" class="shop-avatar__icon" />
                <span class="shop-avatar__hint">Фото</span>
              </template>
              <div v-if="uploadingImage" class="shop-avatar__loading">
                <ion-spinner name="crescent" />
              </div>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="shop-avatar__input"
                @change="handleFileUpload"
              />
            </button>
            <div class="editor__avatar-actions">
              <ion-button fill="clear" size="small" @click="triggerFileInput">
                <ion-icon slot="start" :icon="imageOutline" />
                {{ editorImageUrl ? "Заменить" : "Загрузить" }}
              </ion-button>
              <ion-button v-if="editorImageUrl" fill="clear" size="small" color="danger" @click="removeShopImage">
                <ion-icon slot="start" :icon="trashOutline" />
                Убрать
              </ion-button>
            </div>
          </div>
          <label class="editor__field">
            <span>Название</span>
            <ion-input v-model="form.name" placeholder="Лавка «У старого Грога»" aria-label="Название" />
          </label>
          <label class="editor__field">
            <span>Описание</span>
            <ion-textarea v-model="form.description" :auto-grow="true" placeholder="Что за место, атмосфера…" aria-label="Описание" />
          </label>
          <label class="editor__field">
            <span>NPC-продавец</span>
            <ion-select v-model="form.npcId" interface="popover" placeholder="Не выбран" aria-label="NPC-продавец">
              <ion-select-option :value="null">— без NPC —</ion-select-option>
              <ion-select-option v-for="npc in npcs" :key="npc.id" :value="npc.id">{{ npc.name }}</ion-select-option>
            </ion-select>
          </label>
        </div>
        <div class="editor__footer">
          <ion-button fill="outline" size="small" @click="closeEditor">Отмена</ion-button>
          <ion-button size="small" :disabled="saving" @click="saveShop">
            <ion-spinner v-if="saving" name="crescent" />
            <span v-else>Сохранить</span>
          </ion-button>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.shops-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 2px 28px;
}

/* --- Section headers (aligned with InventoryView / MagicView) --- */
.sectionHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0 4px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.72);
}

.sectionHeader ion-icon {
  font-size: 18px;
  color: var(--ion-color-primary);
}

.sectionHeader__count {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.16);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.32);
}

.sectionHeader--flush {
  margin: 0;
}

.shops-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.shops-search {
  margin-bottom: 2px;
}

.add-btn {
  --border-radius: 12px;
  font-weight: 600;
}

.shops-loading {
  display: flex;
  justify-content: center;
  padding: 28px;
}

/* --- Empty state (glassy hint like InventoryView) --- */
.shops-empty {
  margin-top: 8px;
  padding: 22px 18px;
  border-radius: 16px;
  text-align: center;
  color: var(--ion-color-light);
  background:
    radial-gradient(circle at 15% 20%, rgba(var(--ion-color-primary-rgb), 0.18), rgba(var(--ion-color-primary-rgb), 0) 45%),
    linear-gradient(180deg, rgba(var(--ion-color-medium-rgb), 0.48), rgba(var(--ion-color-medium-rgb), 0.30));
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.30);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.shops-empty--compact {
  padding: 16px;
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.55) 0%, rgba(var(--ion-color-dark-rgb), 0.55) 100%);
  border-color: rgba(var(--ion-color-light-rgb), 0.08);
  box-shadow: none;
}

.shops-empty__icon {
  font-size: 34px;
  color: rgba(var(--ion-color-primary-rgb), 0.9);
  margin-bottom: 8px;
}

.shops-empty__title {
  font-size: 16px;
  font-weight: 700;
}

.shops-empty__text {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.4;
  opacity: 0.85;
}

/* --- Shop cards --- */
.shops-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.shop-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  min-height: 84px;
  align-items: center;
  border-radius: 16px;
  cursor: pointer;
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.92) 100%);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
}

.shop-card:hover {
  border-color: rgba(var(--ion-color-primary-rgb), 0.45);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
  transform: translateY(-1px);
}

.shop-card__media {
  flex-shrink: 0;
}

.shop-card__img {
  width: 58px;
  height: 58px;
  border-radius: 14px;
  object-fit: cover;
  border: 2px solid rgba(var(--ion-color-primary-rgb), 0.35);
  background: rgba(0, 0, 0, 0.25);
}

.shop-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
}

.shop-card__name {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--ion-color-light);
  overflow: hidden;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.shop-card__npc {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ion-color-primary);
}

.shop-card__npc ion-icon {
  font-size: 13px;
}

.shop-card__desc {
  font-size: 12px;
  line-height: 1.35;
  color: rgba(var(--ion-color-light-rgb), 0.6);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.shop-card__actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: -4px -2px;
}

.shop-card__actions ion-button {
  --padding-start: 6px;
  --padding-end: 6px;
  height: 30px;
}

/* --- Showcase header --- */
.showcase-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  background:
    radial-gradient(circle at 12% 20%, rgba(var(--ion-color-primary-rgb), 0.20), rgba(var(--ion-color-primary-rgb), 0) 50%),
    linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.92) 100%);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.28);
}

.showcase-back {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.14);
  background: rgba(var(--ion-color-dark-rgb), 0.5);
  color: var(--ion-color-light);
  cursor: pointer;
}

.showcase-back ion-icon {
  font-size: 20px;
}

.showcase-head__img {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  object-fit: cover;
  border: 2px solid rgba(var(--ion-color-primary-rgb), 0.4);
}

.showcase-head__info {
  min-width: 0;
}

.showcase-head__name {
  font-size: 17px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.showcase-head__npc {
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.62);
}

/* --- Showcase rows --- */
.showcase-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.showcase-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: 14px;
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.9) 0%, rgba(var(--ion-color-dark-rgb), 0.9) 100%);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
}

.showcase-row__img {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
}

.showcase-row__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.showcase-row__top {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.showcase-row__name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ion-color-light);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.showcase-row__prices {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.showcase-row__del {
  --padding-start: 4px;
  --padding-end: 4px;
  flex-shrink: 0;
  margin: -6px -4px 0 0;
}

/* --- Price fields with coin icons --- */
.price-field {
  display: flex;
  align-items: center;
  gap: 3px;
  width: 68px;
  padding: 2px 6px;
  border-radius: 10px;
  background: rgba(var(--ion-color-dark-rgb), 0.55);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
}

.price-field--gold { border-color: rgba(255, 196, 9, 0.5); }
.price-field--silver { border-color: rgba(207, 216, 220, 0.45); }
.price-field--copper { border-color: rgba(217, 138, 92, 0.5); }

.price-field__coin {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.price-field ion-input {
  --padding-top: 2px;
  --padding-bottom: 2px;
  --padding-start: 0;
  --padding-end: 0;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
  min-height: auto;
}

/* --- Item search --- */
.item-search {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-search__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 12px;
  background: rgba(var(--ion-color-dark-rgb), 0.55);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
}

.item-search__bar ion-icon {
  font-size: 18px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
}

.item-search__bar ion-input {
  --padding-top: 4px;
  --padding-bottom: 4px;
  font-size: 14px;
}

.item-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 340px;
  overflow-y: auto;
  padding-right: 2px;
}

.item-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  background: rgba(var(--ion-color-medium-rgb), 0.4);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.06);
  transition: background 0.15s ease, border-color 0.15s ease;
}

.item-result:hover:not(:disabled) {
  background: rgba(var(--ion-color-primary-rgb), 0.14);
  border-color: rgba(var(--ion-color-primary-rgb), 0.4);
}

.item-result--added {
  opacity: 0.55;
  cursor: default;
}

.item-result__img {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  object-fit: cover;
  flex-shrink: 0;
}

.item-result__name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--ion-color-light);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-result__action {
  font-size: 22px;
  flex-shrink: 0;
  color: var(--ion-color-primary);
}

.item-result--added .item-result__action {
  color: var(--ion-color-success, #2dd55b);
}

/* --- Editor modal --- */
.editor-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.editor {
  width: 100%;
  max-width: 440px;
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(160deg, rgba(var(--ion-color-medium-rgb), 0.98) 0%, rgba(var(--ion-color-dark-rgb), 0.98) 100%);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.32);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}

.editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px 12px;
  border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
}

.editor__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 14px;
}

.editor__avatar-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.shop-avatar {
  position: relative;
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: rgba(var(--ion-color-light-rgb), 0.55);
  background: rgba(var(--ion-color-dark-rgb), 0.5);
  border: 2px solid rgba(var(--ion-color-primary-rgb), 0.35);
  transition: border-color 0.2s ease;
}

.shop-avatar--empty {
  border-style: dashed;
}

.shop-avatar:hover {
  border-color: rgba(var(--ion-color-primary-rgb), 0.65);
}

.shop-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shop-avatar__icon {
  font-size: 26px;
  color: rgba(var(--ion-color-primary-rgb), 0.85);
}

.shop-avatar__hint {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.shop-avatar__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.shop-avatar__input {
  display: none;
}

.editor__avatar-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.editor__field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.editor__field > span {
  color: rgba(var(--ion-color-light-rgb), 0.55);
}

.editor__field ion-input,
.editor__field ion-textarea,
.editor__field ion-select {
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 8px;
  --padding-bottom: 8px;
  border-radius: 12px;
  background: rgba(var(--ion-color-dark-rgb), 0.5);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
  font-size: 14px;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--ion-color-light);
}

.editor__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 14px 16px;
  border-top: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
}
</style>
