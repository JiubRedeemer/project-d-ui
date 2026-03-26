<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonToolbar,
  toastController,
  useIonRouter
} from "@ionic/vue";
import {onMounted, ref} from "vue";
import {Item} from "@/components/models/response/InventoryResponse";
import axios from "axios";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute, useRouter} from "vue-router";
import {TEXTS} from "@/config/localisations";
import {add, addOutline, arrowBack, remove} from "ionicons/icons";
import {useInventoryStore} from "@/stores/InventoryStore";
import InventorySearchItemFullViewModal from "@/views/character/tabs/inventory/InventorySearchItemFullViewModal.vue";

const inventoryStore = useInventoryStore();
const route = useRoute();
const ionRouter = useIonRouter();
const router = useRouter();
const findItems = ref<Item[]>([]);
const queryString = ref<string>("");
const isLoadingItems = ref(false);
const activeSearchToken = ref(0);
const AUTOLOAD_THRESHOLD_PX = 180;
const contentScrollHost = ref<HTMLElement | null>(null);
const hasMoreItems = ref(true);
const selectedItem = ref<Item | null>(null);
const showFullViewModal = ref(false);
type SearchScope = "all" | "owned";
const activeSearchScope = ref<SearchScope>("all");
const SEARCH_LIMIT = 100;

function openFullView(item: Item) {
  selectedItem.value = item;
  showFullViewModal.value = true;
}

function closeFullView() {
  showFullViewModal.value = false;
  selectedItem.value = null;
}

async function addFromFullView(item: Item, count: number) {
  await addItemToInventory(item, count);
  closeFullView();
}

function handleDeleteItem(itemId: string) {
  findItems.value = findItems.value.filter((item) => item.id !== itemId);
}

async function handleInput(event: any) {
  const query = String(event?.detail?.value ?? event?.target?.value ?? "").toLowerCase().trim();
  queryString.value = query;

  activeSearchToken.value += 1;
  const searchToken = activeSearchToken.value;
  findItems.value = []; // Очистка списка
  hasMoreItems.value = true;
  await loadItems(query, null, null, searchToken, true);
}

async function handleSearchScopeChange(event: CustomEvent) {
  activeSearchScope.value = (event.detail.value ?? "all") as SearchScope;
  findItems.value = [];
  hasMoreItems.value = false;
  isLoadingItems.value = false;

  const query = queryString.value?.trim() ?? "";

  activeSearchToken.value += 1;
  const searchToken = activeSearchToken.value;
  hasMoreItems.value = true;
  await loadItems(query, null, null, searchToken, true);
}

onMounted(async () => {
  activeSearchToken.value += 1;
  const searchToken = activeSearchToken.value;
  findItems.value = [];
  hasMoreItems.value = true;
  await loadItems("", null, null, searchToken, true);
});

async function loadItems(
    query: string | undefined,
    lastSeenCreatedAt: string | null,
    lastSeenId: string | null,
    searchToken: number,
    replaceResults = false
): Promise<void> {
  if (!hasMoreItems.value && !replaceResults) return;
  if (isLoadingItems.value && !replaceResults) return;
  isLoadingItems.value = true;

  try {
    const searchPath = activeSearchScope.value === "owned"
      ? `${GATEWAY_INTEGRATION_ROUTES.search}/owned`
      : GATEWAY_INTEGRATION_ROUTES.search;
    const requestBody: {
      searchQuery: string;
      limit: number;
      lastSeenCreatedAt?: string;
      lastSeenId?: string;
    } = {
      searchQuery: query ?? "",
      limit: SEARCH_LIMIT,
    };

    if (lastSeenCreatedAt && lastSeenId) {
      requestBody.lastSeenCreatedAt = lastSeenCreatedAt;
      requestBody.lastSeenId = lastSeenId;
    }

    const response = await axios.post(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.items}${searchPath}`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          }
        }
    );

    if (searchToken !== activeSearchToken.value) return;

    const newItems = (response.data as Item[]).map(item => ({
      ...item,
      count: item.count ?? 1
    }));

    if (newItems.length < SEARCH_LIMIT) {
      hasMoreItems.value = false;
    }

    if (replaceResults) {
      findItems.value = newItems;
    } else {
      findItems.value.push(...newItems);
    }
  } catch (error) {
    if (searchToken !== activeSearchToken.value) return;
    console.error("Ошибка при получении данных:", error);
    hasMoreItems.value = false;
  } finally {
    if (searchToken === activeSearchToken.value) {
      isLoadingItems.value = false;
    }
  }
}

function getRarityClass(rarity: string | undefined) {
  switch (rarity) {
    case 'COMMON':
      return 'rarity-common';
    case 'UNCOMMON':
      return 'rarity-uncommon';
    case 'RARE':
      return 'rarity-rare';
    case 'VERY_RARE':
      return 'rarity-very-rare';
    case 'LEGENDARY':
      return 'rarity-legendary';
    default:
      return 'rarity-common';
  }
}

const getItemImageUrl = (imgUrl: string | undefined) => {
  return imgUrl != null
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png';
};

const getItemStats = (item: Item) => {
  const stats: string[] = [];

  if (item.stats?.armorClass) {
    let kdText = `${TEXTS.ac.rus}: ${item.stats.armorClass}`;
    if (item.subtype !== 'HEAVY_ARMOR') {
      kdText += ' + ' + TEXTS.dexterity.rus;
      if (item.subtype === 'MEDIUM_ARMOR') kdText += ' (до 2)';
    }
    stats.push(kdText);
  }

  if (item.stats?.damage) {
    stats.push(`${TEXTS.damage.rus}: ${item.stats.damage.value} ${item.stats.damage.damageTypeName}`);
  }

  if (item.stats?.weight && item.subtypeName) {
    stats.push(`${TEXTS.weight.rus}: ${item.stats.weight} ${TEXTS.weightEI.rus} ${TEXTS.type.rus}: ${item.subtypeName}`);
  } else {
    if (item.stats?.weight) {
      stats.push(`${TEXTS.weight.rus}: ${item.stats.weight} ${TEXTS.weightEI.rus}`);
    }
    if (item.subtypeName) {
      stats.push(`${TEXTS.type.rus}: ${item.subtypeName}`);
    }
  }

  return stats;
};

async function loadMoreItems() {
  if (!hasMoreItems.value || isLoadingItems.value || findItems.value.length === 0) return;

  const lastItem = findItems.value[findItems.value.length - 1];
  const cursorCreatedAt = lastItem.createdAt?.toString().replace(/(\+\d{2}:\d{2}|Z)$/, "") ?? null;
  const cursorId = lastItem.id ?? null;

  if (!cursorCreatedAt || !cursorId) {
    hasMoreItems.value = false;
    return;
  }

  await loadItems(
      queryString.value,
      cursorCreatedAt,
      cursorId,
      activeSearchToken.value,
      false
  );
}

async function handleContentScroll(event: any) {
  if (!hasMoreItems.value || isLoadingItems.value || findItems.value.length === 0) return;

  const target = event?.target as any;
  if (!contentScrollHost.value && typeof target?.getScrollElement === "function") {
    contentScrollHost.value = await target.getScrollElement();
  }

  const scrollTop = Number(event?.detail?.scrollTop ?? target?.scrollTop ?? 0);
  const scrollHeight = Number(contentScrollHost.value?.scrollHeight ?? target?.scrollHeight ?? 0);
  const clientHeight = Number(contentScrollHost.value?.clientHeight ?? target?.clientHeight ?? 0);
  if (!scrollHeight || !clientHeight) return;
  const distanceToBottom = scrollHeight - (scrollTop + clientHeight);

  if (distanceToBottom <= AUTOLOAD_THRESHOLD_PX) {
    void loadMoreItems();
  }
}

// Метод изменения количества предметов
function changeItemCount(item: Item, action: 'add' | 'remove') {
  const target = findItems.value.find(i => i.id === item.id);
  if (!target) return;

  if (action === 'add') {
    target.count = (target.count ?? 0) + 1;
  } else if (action === 'remove' && (target.count ?? 0) > 0) {
    target.count = (target.count ?? 0) - 1;
  }
}

async function addItemToInventory(item: Item, count?: number) {
  const qty = count ?? item.count ?? 1;
  try {
    const response = await axios.put(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}/${item.id}/${qty}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
    inventoryStore.inventory = response.data;
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
  await presentToast();
}

async function presentToast() {
  const toast = await toastController.create({
    message: 'Предмет добавлен в инвентарь',
    duration: 1000,
    position: 'top'
  });
  await toast.present();
}

function openAddView() {
  ionRouter.navigate('/rooms/' + route.params.roomId + '/characters/' + route.params.characterId + '/inventory/add', 'forward', 'push')
}

</script>

<template>
  <ion-page>
    <ion-header class="search-header">
      <ion-toolbar>
        <div class="header-top-row">
          <ion-buttons class="toolbar-back-buttons">
            <ion-back-button default-href="/" text="" class="toolbar-back-button"/>
          </ion-buttons>
          <ion-searchbar
              placeholder="Найти предмет"
              class="search-line"
              @ionInput="handleInput($event)">
          </ion-searchbar>
        </div>
        <ion-segment
            :value="activeSearchScope"
            @ionChange="handleSearchScopeChange"
            class="search-scope-tabs"
        >
          <ion-segment-button value="all">
            <ion-label>Всё</ion-label>
          </ion-segment-button>
          <ion-segment-button value="owned">
            <ion-label>Мои предметы</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-events="true" @ionScroll="handleContentScroll($event)">

      <!-- Список -->
      <div class="found" v-if="findItems?.length! > 0">
        <div class="section" v-for="item in findItems" :key="item.id">
          <div class="section-start-block" @click="openFullView(item)">
            <div class="image-block">
              <img
                  class="item-image"
                  :class="getRarityClass(item.rarity)"
                  :src="getItemImageUrl(item.imgUrl)"
                  :alt="item.name.rus"/>
            </div>

            <div class="stats-block">
              <div class="item-name">
                {{ item.name.rus }}
              </div>
              <div
                  class="item-stats"
                  v-for="(stat, index) in getItemStats(item)"
                  :key="index">
                {{ stat }}
              </div>
            </div>
          </div>

          <div class="buttons-block" @click.stop>
            <ion-button
                @click="addItemToInventory(item)"
                size="small"
                shape="round"
                class="equip-button"
                fill="outline">
              <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
            </ion-button>

            <ion-buttons class="counter-buttons">
              <ion-button size="small" @click="changeItemCount(item, 'remove')">
                <ion-icon slot="icon-only" size="small" :icon="remove"></ion-icon>
              </ion-button>

              <ion-label>{{ item.count }}</ion-label>

              <ion-button size="small" @click="changeItemCount(item, 'add')">
                <ion-icon slot="icon-only" size="small" :icon="add"></ion-icon>
              </ion-button>
            </ion-buttons>
          </div>
        </div>
      </div>

      <!-- Infinite scroll ОБЯЗАТЕЛЬНО последним -->
      <div v-if="findItems.length > 0 && hasMoreItems" class="load-more-block">
        <ion-button
            data-test="load-more"
            class="load-more-button"
            @click="loadMoreItems"
            :disabled="isLoadingItems">
          {{ isLoadingItems ? 'Загрузка...' : 'Загрузить ещё' }}
        </ion-button>
      </div>

    </ion-content>

    <ion-fab slot="fixed" vertical="bottom" horizontal="start">
      <ion-fab-button color="primary" @click="router.back">
        <ion-icon :icon="arrowBack" color="dark"></ion-icon>
      </ion-fab-button>
    </ion-fab>

    <ion-fab slot="fixed" vertical="bottom" horizontal="end">
      <ion-fab-button color="primary" @click="openAddView">
        <ion-icon :icon="add" color="dark"></ion-icon>
      </ion-fab-button>
    </ion-fab>

    <InventorySearchItemFullViewModal
        :item="selectedItem"
        :is-open="showFullViewModal"
        :character-id="String(route.params.characterId)"
        :room-id="String(route.params.roomId)"
        @close="closeFullView"
        @add-to-inventory="addFromFullView"
        @delete-item="handleDeleteItem"
    />
  </ion-page>
</template>

<style scoped>
.found, ion-toolbar, ion-content {
  --background: var(--ion-color-dark);
}

.search-header ion-toolbar {
  --padding-top: calc(6px + env(safe-area-inset-top, 0px));
  --padding-start: 8px;
  --padding-end: 8px;
  --padding-bottom: 10px;
}

.header-top-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-back-buttons {
  flex: 0 0 auto;
}

.toolbar-back-button {
  --color: var(--ion-color-light);
  --icon-font-size: 20px;
  min-width: 36px;
}

.found {
  margin: 8px 0 70px;
}

.section {
  background-color: var(--ion-color-medium);
  border-radius: 25px;
  padding: 10px;
  overflow: hidden;
  max-height: 70px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-left: 10px;
  margin-right: 10px;
}

.section-start-block {
  display: flex;
  flex-direction: row;
  justify-content: start;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 16px;
  font-weight: bold;
  display: flex;
  justify-content: start;
}

.item-stats {
  font-size: 11px;
  display: flex;
  justify-content: start;
}

.item-image {
  border-radius: 15px;
  border: 2px solid transparent;
  min-width: 55px;
  min-height: 55px;
  max-width: 55px;
  max-height: 55px;
}

ion-searchbar {
  --border-radius: 20px;
  --background: #2b2930;
  --box-shadow: none;
  --placeholder-color: rgba(255, 255, 255, 0.6);
  --color: var(--ion-color-light);
  padding: 0;
  flex: 1;
}

.search-scope-tabs {
  margin: 10px 4px 0;
  --background: #221f2a;
  border-radius: 14px;
  padding: 3px;
}

.search-scope-tabs ion-segment-button {
  --color: rgba(255, 255, 255, 0.78);
  --color-checked: var(--ion-color-light);
  --indicator-color: rgba(var(--ion-color-primary-rgb), 0.28);
  --indicator-box-shadow: none;
  min-height: 34px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-size: 12px;
  font-weight: 600;
}

.buttons-block {
  display: flex;
  flex-direction: column;
  align-items: end;
  position: relative;
  height: 100%;
  width: 50px;
  margin-top: -7px;
}

.counter-buttons {
  display: flex;
  justify-content: center;
  flex-direction: row;
  align-items: center;
  margin-right: -15px;
  height: 20px;
  margin-top: 5px;
}

.load-more-block {
  display: flex;
  justify-content: center;
  margin: 8px 0 90px;
}

.load-more-button {
  --background: #2b2930;
  --color: var(--ion-color-light);
}

.rarity-common {
  border-color: gray;
}

.rarity-uncommon {
  border-color: green;
}

.rarity-rare {
  border-color: blue;
}

.rarity-very-rare {
  border-color: purple;
}

.rarity-legendary {
  border-color: orange;
}
</style>

