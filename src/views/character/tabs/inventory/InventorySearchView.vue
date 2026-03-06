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
  IonToolbar,
  toastController,
  useIonRouter
} from "@ionic/vue";
import {ref} from "vue";
import {Item} from "@/components/models/response/InventoryResponse";
import axios from "axios";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {TEXTS} from "@/config/localisations";
import {add, addOutline, arrowBack, remove} from "ionicons/icons";
import {useInventoryStore} from "@/stores/InventoryStore";
import InventorySearchItemFullViewModal from "@/views/character/tabs/inventory/InventorySearchItemFullViewModal.vue";

const inventoryStore = useInventoryStore();
const route = useRoute();
const ionRouter = useIonRouter();
const findItems = ref<Item[]>([]);
const queryString = ref<string>();
const isLoadingItems = ref(false);
const activeSearchToken = ref(0);
const AUTOLOAD_THRESHOLD_PX = 180;
const contentScrollHost = ref<HTMLElement | null>(null);
const hasMoreItems = ref(true);
const selectedItem = ref<Item | null>(null);
const showFullViewModal = ref(false);

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

async function handleInput(event: any) {
  const query = String(event?.detail?.value ?? event?.target?.value ?? "").toLowerCase().trim();
  if (query.length <= 1) {
    findItems.value = [];
    hasMoreItems.value = false;
    isLoadingItems.value = false;
    return;
  }

  activeSearchToken.value += 1;
  const searchToken = activeSearchToken.value;
  queryString.value = query;
  findItems.value = []; // Очистка списка
  hasMoreItems.value = true;
  await loadItems(query, null, null, searchToken, true);
}

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
    const response = await axios.post(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.items}${GATEWAY_INTEGRATION_ROUTES.search}`,
        {
          searchQuery: query,
          limit: 150,
          lastSeenCreatedAt,
          lastSeenId
        },
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

    if (newItems.length < 150) {
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

  await loadItems(
      queryString.value,
      cursorCreatedAt,
      lastItem.id ?? null,
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
        <ion-buttons slot="start">
          <ion-back-button/>
        </ion-buttons>
        <ion-searchbar
            placeholder="Найти предмет"
            class="search-line"
            @ionInput="handleInput($event)">
        </ion-searchbar>
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
      <ion-fab-button color="primary" @click="ionRouter.back">
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
      @close="closeFullView"
      @add-to-inventory="addFromFullView"
    />
  </ion-page>
</template>

<style scoped>
.found, ion-toolbar, ion-content {
  --background: var(--ion-color-dark);
}

.found {
  margin-bottom: 70px;
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
  --background: #2B2930;
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

