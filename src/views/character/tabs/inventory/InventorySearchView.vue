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
import {computed, onMounted, ref, watch} from "vue";
import {Item} from "@/components/models/response/InventoryResponse";
import axios from "axios";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute, useRouter} from "vue-router";
import {TEXTS} from "@/config/localisations";
import {add, addOutline, arrowBack, closeOutline, filterOutline, remove} from "ionicons/icons";
import {useInventoryStore} from "@/stores/InventoryStore";
import {getTagsForRoom, type ItemTagDto} from "@/api/itemTagApi";
import InventorySearchItemFullViewModal from "@/views/character/tabs/inventory/InventorySearchItemFullViewModal.vue";

const inventoryStore = useInventoryStore();
const route = useRoute();
const ionRouter = useIonRouter();
const router = useRouter();
const findItems = ref<Item[]>([]);
const queryString = ref<string>("");
const itemTagFilter = ref<Set<string>>(new Set());
const itemTypeFilter = ref<string>("");
const itemSubtypeFilter = ref<string>("");
const itemRarityFilter = ref<string>("");
const itemCustomizationFilter = ref<"" | "true" | "false">("");
const itemHasSkillsFilter = ref<"" | "true" | "false">("");
const showItemFiltersModal = ref(false);

const RARITY_ORDER = ["COMMON", "UNCOMMON", "RARE", "VERY_RARE", "LEGENDARY"];
const RARITY_LABELS: Record<string, string> = {
  COMMON: "Обычная", UNCOMMON: "Необычная", RARE: "Редкая",
  VERY_RARE: "Очень редкая", LEGENDARY: "Легендарная",
};

const ALL_ITEM_TYPES: [string, string][] = [
  ["MAGIC_ITEM", "Магический предмет"],
  ["WEAPON", "Оружие"],
  ["ARMOR", "Броня"],
  ["OTHER", "Прочее"],
];

const SUBTYPE_TYPE_MAP: Record<string, string> = {
  SHW: "WEAPON", SRW: "WEAPON", AHW: "WEAPON", ARW: "WEAPON", EHW: "WEAPON", ERW: "WEAPON",
  HEAVY_ARMOR: "ARMOR", MEDIUM_ARMOR: "ARMOR", LIGHT_ARMOR: "ARMOR", SHIELD: "ARMOR",
};

const ALL_ITEM_SUBTYPES: [string, string][] = [
  ["SHW", "Простое рукопашное"],
  ["SRW", "Простое дальнобойное"],
  ["AHW", "Воинское рукопашное"],
  ["ARW", "Воинское дальнобойное"],
  ["EHW", "Экзотическое рукопашное"],
  ["ERW", "Экзотическое дальнобойное"],
  ["HEAVY_ARMOR", "Тяжелый доспех"],
  ["MEDIUM_ARMOR", "Средний доспех"],
  ["LIGHT_ARMOR", "Легкий доспех"],
  ["SHIELD", "Щит"],
];

const allItemTypes = computed(() => ALL_ITEM_TYPES);

const allItemSubtypes = computed(() =>
  ALL_ITEM_SUBTYPES.filter(([val]) =>
    !itemTypeFilter.value || SUBTYPE_TYPE_MAP[val] === itemTypeFilter.value
  )
);

const allItemRarities = computed(() => RARITY_ORDER);

const availableItemTags = ref<ItemTagDto[]>([]);
const shownTagInfo = ref<ItemTagDto | null>(null);
function toggleTagInfo(tag: ItemTagDto) {
  shownTagInfo.value = shownTagInfo.value?.id === tag.id ? null : tag;
}
const allItemTags = computed(() => availableItemTags.value);

const itemActiveFiltersCount = computed(() => {
  let c = 0;
  if (itemTypeFilter.value) c++;
  if (itemSubtypeFilter.value) c++;
  if (itemRarityFilter.value) c++;
  if (itemCustomizationFilter.value !== "") c++;
  if (itemHasSkillsFilter.value !== "") c++;
  if (itemTagFilter.value.size > 0) c++;
  return c;
});

const displayedItems = computed(() => findItems.value);

function toggleItemTagFilter(tag: string) {
  const next = new Set(itemTagFilter.value);
  if (next.has(tag)) next.delete(tag); else next.add(tag);
  itemTagFilter.value = next;
}

function resetItemFilters() {
  itemTypeFilter.value = "";
  itemSubtypeFilter.value = "";
  itemRarityFilter.value = "";
  itemCustomizationFilter.value = "";
  itemHasSkillsFilter.value = "";
  itemTagFilter.value = new Set();
}

watch(itemTypeFilter, () => { itemSubtypeFilter.value = ""; triggerFilteredSearch(); });
watch(itemSubtypeFilter, () => { triggerFilteredSearch(); });
watch(itemRarityFilter, () => { triggerFilteredSearch(); });
watch(itemCustomizationFilter, () => { triggerFilteredSearch(); });
watch(itemHasSkillsFilter, () => { triggerFilteredSearch(); });
watch(itemTagFilter, () => { triggerFilteredSearch(); }, { deep: true });

function triggerFilteredSearch() {
  findItems.value = [];
  hasMoreItems.value = true;
  activeSearchToken.value += 1;
  const searchToken = activeSearchToken.value;
  loadItems(queryString.value, null, null, searchToken, true);
}

async function loadItemTags() {
  try {
    availableItemTags.value = await getTagsForRoom(String(route.params.roomId));
  } catch (e) {
    console.error("Failed to load item tags", e);
  }
}

const isLoadingItems = ref(false);
const activeSearchToken = ref(0);
const AUTOLOAD_THRESHOLD_PX = 180;
const contentScrollHost = ref<HTMLElement | null>(null);
const hasMoreItems = ref(true);
const selectedItem = ref<Item | null>(null);
const showFullViewModal = ref(false);
type SearchScope = "2024" | "2014" | "owned";
const activeSearchScope = ref<SearchScope>("2024");
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
  activeSearchScope.value = (event.detail.value ?? "2024") as SearchScope;
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
  await Promise.all([
    loadItems("", null, null, searchToken, true),
    loadItemTags()
  ]);
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
    const requestBody: Record<string, unknown> = {
      searchQuery: query ?? "",
      limit: SEARCH_LIMIT,
    };

    if (activeSearchScope.value !== "owned") {
      requestBody.ruleType = activeSearchScope.value;
    }

    if (lastSeenCreatedAt && lastSeenId) {
      requestBody.lastSeenCreatedAt = lastSeenCreatedAt;
      requestBody.lastSeenId = lastSeenId;
    }

    if (itemTypeFilter.value) requestBody.type = itemTypeFilter.value;
    if (itemSubtypeFilter.value) requestBody.subtype = itemSubtypeFilter.value;
    if (itemRarityFilter.value) requestBody.rarity = itemRarityFilter.value;
    if (itemTagFilter.value.size > 0) requestBody.tags = [...itemTagFilter.value];
    if (itemCustomizationFilter.value !== "") requestBody.customization = itemCustomizationFilter.value === "true";
    if (itemHasSkillsFilter.value !== "") requestBody.hasSkills = itemHasSkillsFilter.value === "true";

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
          <button
              :class="['filter-btn', { 'filter-btn--active': itemActiveFiltersCount > 0 }]"
              @click="showItemFiltersModal = true"
          >
            <ion-icon :icon="filterOutline"/>
            <span v-if="itemActiveFiltersCount > 0" class="filter-btn__badge">{{ itemActiveFiltersCount }}</span>
          </button>
        </div>
        <ion-segment
            :value="activeSearchScope"
            @ionChange="handleSearchScopeChange"
            class="search-scope-tabs"
            mode="ios"
            scrolalble="true"
        >
          <ion-segment-button value="2024">
            <ion-label>2024</ion-label>
          </ion-segment-button>
          <ion-segment-button value="2014">
            <ion-label>2014</ion-label>
          </ion-segment-button>
          <ion-segment-button value="owned">
            <ion-label>Созданные</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-events="true" @ionScroll="handleContentScroll($event)">

      <!-- Активные фильтры -->
      <div v-if="itemActiveFiltersCount > 0" class="active-filters">
        <span v-if="itemTypeFilter" class="active-chip">
          {{ allItemTypes.find(([k]) => k === itemTypeFilter)?.[1] ?? itemTypeFilter }}
          <button @click="itemTypeFilter = ''"><ion-icon :icon="closeOutline"/></button>
        </span>
        <span v-if="itemSubtypeFilter" class="active-chip">
          {{ allItemSubtypes.find(([k]) => k === itemSubtypeFilter)?.[1] ?? itemSubtypeFilter }}
          <button @click="itemSubtypeFilter = ''"><ion-icon :icon="closeOutline"/></button>
        </span>
        <span v-if="itemRarityFilter" class="active-chip">
          {{ RARITY_LABELS[itemRarityFilter] ?? itemRarityFilter }}
          <button @click="itemRarityFilter = ''"><ion-icon :icon="closeOutline"/></button>
        </span>
        <span v-if="itemCustomizationFilter !== ''" class="active-chip">
          {{ itemCustomizationFilter === 'true' ? 'Настройка: да' : 'Настройка: нет' }}
          <button @click="itemCustomizationFilter = ''"><ion-icon :icon="closeOutline"/></button>
        </span>
        <span v-if="itemHasSkillsFilter !== ''" class="active-chip">
          {{ itemHasSkillsFilter === 'true' ? 'Есть навыки' : 'Нет навыков' }}
          <button @click="itemHasSkillsFilter = ''"><ion-icon :icon="closeOutline"/></button>
        </span>
        <span v-for="tag in [...itemTagFilter]" :key="tag" class="active-chip">
          #{{ tag }}
          <button @click="toggleItemTagFilter(tag)"><ion-icon :icon="closeOutline"/></button>
        </span>
        <button class="active-chip active-chip--reset" @click="resetItemFilters">Сбросить</button>
      </div>

      <!-- Модальное окно фильтров -->
      <Teleport to="body">
        <div v-if="showItemFiltersModal" class="filters-overlay" @click.self="showItemFiltersModal = false">
          <div class="filters-modal">
            <div class="filters-modal__header">
              <span>Фильтры</span>
              <button class="filters-modal__close" @click="showItemFiltersModal = false">
                <ion-icon :icon="closeOutline"/>
              </button>
            </div>
            <div class="filters-modal__body">

              <div v-if="allItemTypes.length" class="filters-section">
                <div class="filters-label">Тип</div>
                <div class="filters-chips">
                  <button
                      v-for="[val, label] in allItemTypes" :key="val"
                      :class="['filters-chip', { 'filters-chip--active': itemTypeFilter === val }]"
                      @click="itemTypeFilter = itemTypeFilter === val ? '' : val"
                  >{{ label }}</button>
                </div>
              </div>

              <div v-if="allItemSubtypes.length" class="filters-section">
                <div class="filters-label">Подтип</div>
                <div class="filters-chips">
                  <button
                      v-for="[val, label] in allItemSubtypes" :key="val"
                      :class="['filters-chip', { 'filters-chip--active': itemSubtypeFilter === val }]"
                      @click="itemSubtypeFilter = itemSubtypeFilter === val ? '' : val"
                  >{{ label }}</button>
                </div>
              </div>

              <div v-if="allItemRarities.length" class="filters-section">
                <div class="filters-label">Редкость</div>
                <div class="filters-chips">
                  <button
                      v-for="r in allItemRarities" :key="r"
                      :class="['filters-chip', `filters-chip--rarity-${r.toLowerCase()}`, { 'filters-chip--active': itemRarityFilter === r }]"
                      @click="itemRarityFilter = itemRarityFilter === r ? '' : r"
                  >{{ RARITY_LABELS[r] }}</button>
                </div>
              </div>

              <div v-if="allItemTags.length" class="filters-section">
                <div class="filters-label">Теги</div>
                <div class="filters-chips">
                  <span v-for="tag in allItemTags" :key="tag.id" class="tag-chip-wrapper">
                    <button
                        :class="['filters-chip', { 'filters-chip--active': itemTagFilter.has(tag.name) }]"
                        @click="toggleItemTagFilter(tag.name)"
                    >#{{ tag.name }}</button>
                    <button
                        v-if="tag.description"
                        :class="['tag-info-btn', { 'tag-info-btn--active': shownTagInfo?.id === tag.id }]"
                        @click.stop="toggleTagInfo(tag)"
                    >?</button>
                  </span>
                </div>
                <div v-if="shownTagInfo && shownTagInfo.description" class="tag-description">
                  <span class="tag-description__name">{{ shownTagInfo.name }}</span>
                  {{ shownTagInfo.description }}
                </div>
              </div>

              <div class="filters-section">
                <div class="filters-label">Настройка</div>
                <div class="filters-chips">
                  <button :class="['filters-chip', { 'filters-chip--active': itemCustomizationFilter === 'true' }]" @click="itemCustomizationFilter = itemCustomizationFilter === 'true' ? '' : 'true'">Требуется</button>
                  <button :class="['filters-chip', { 'filters-chip--active': itemCustomizationFilter === 'false' }]" @click="itemCustomizationFilter = itemCustomizationFilter === 'false' ? '' : 'false'">Не требуется</button>
                </div>
              </div>

              <div class="filters-section">
                <div class="filters-label">Навыки</div>
                <div class="filters-chips">
                  <button :class="['filters-chip', { 'filters-chip--active': itemHasSkillsFilter === 'true' }]" @click="itemHasSkillsFilter = itemHasSkillsFilter === 'true' ? '' : 'true'">Есть навыки</button>
                  <button :class="['filters-chip', { 'filters-chip--active': itemHasSkillsFilter === 'false' }]" @click="itemHasSkillsFilter = itemHasSkillsFilter === 'false' ? '' : 'false'">Нет навыков</button>
                </div>
              </div>

            </div>
            <div class="filters-modal__footer">
              <button class="filters-reset" @click="resetItemFilters">Сбросить</button>
              <button class="filters-apply" @click="showItemFiltersModal = false">Применить</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Список -->
      <div class="found" v-if="displayedItems.length > 0">
        <div class="section" v-for="item in displayedItems" :key="item.id">
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
              <div v-if="item.hiddenStats && item.unidentifiedName?.rus" class="item-unidentified-hint">
                До опознания: {{ item.unidentifiedName.rus }}
              </div>
              <div
                  class="item-stats"
                  v-for="(stat, index) in getItemStats(item)"
                  :key="index">
                {{ stat }}
              </div>
<!--              <div v-if="item.stats?.tags?.length" class="item-tags-row">-->
<!--                <span v-for="tag in item.stats.tags" :key="tag" class="item-tag-badge"-->
<!--                      :title="availableItemTags.find(t => t.name === tag)?.description">#{{ tag }}</span>-->
<!--              </div>-->
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
        :available-tags="availableItemTags"
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

.item-unidentified-hint {
  font-size: 11px;
  font-style: italic;
  color: var(--ion-color-warning);
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
  --background: var(--ion-color-medium);
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

/* ── Filter button in header ─────────────────────────── */
.filter-btn {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  font-size: 18px;
  cursor: pointer;
  transition: background 0.14s, border-color 0.14s, color 0.14s;
}

.filter-btn--active {
  background: rgba(var(--ion-color-primary-rgb), 0.18);
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary);
}

.filter-btn__badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Active filter chips ─────────────────────────────── */
.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 12px 2px;
}

.active-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.14);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.35);
}

.active-chip button {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0;
  font-size: 13px;
  opacity: 0.7;
}

.active-chip button:hover { opacity: 1; }

.active-chip--reset {
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.14);
  cursor: pointer;
  padding: 4px 12px;
}

.active-chip--reset:hover {
  color: var(--ion-color-danger);
  border-color: var(--ion-color-danger);
  background: rgba(var(--ion-color-danger-rgb), 0.08);
}

/* ── Item tags on cards ──────────────────────────────── */
.item-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 3px;
}

.item-tag-badge {
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: rgba(var(--ion-color-primary-rgb), 0.85);
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.22);
}

/* ── Filters modal ───────────────────────────────────── */
.filters-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.filters-modal {
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

.filters-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
}

.filters-modal__close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 8px;
  transition: color 0.12s, background 0.12s;
}

.filters-modal__close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.07);
}

.filters-modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filters-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filters-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
}

.filters-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filters-chip {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition: background 0.13s, border-color 0.13s, color 0.13s;
}

.filters-chip:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border-color: rgba(var(--ion-color-primary-rgb), 0.35);
  color: var(--ion-color-primary);
}

.filters-chip--active {
  background: rgba(var(--ion-color-primary-rgb), 0.18);
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary);
  font-weight: 600;
}

.filters-chip--rarity-uncommon     { border-color: rgba(60,180,80,0.35); }
.filters-chip--rarity-rare         { border-color: rgba(60,100,220,0.4); }
.filters-chip--rarity-very_rare    { border-color: rgba(140,60,200,0.4); }
.filters-chip--rarity-legendary    { border-color: rgba(220,140,30,0.5); }
.filters-chip--rarity-uncommon.filters-chip--active  { color: #4db870; background: rgba(60,180,80,0.15); border-color: #4db870; }
.filters-chip--rarity-rare.filters-chip--active      { color: #6699ff; background: rgba(60,100,220,0.15); border-color: #6699ff; }
.filters-chip--rarity-very_rare.filters-chip--active { color: #bb77ee; background: rgba(140,60,200,0.15); border-color: #bb77ee; }
.filters-chip--rarity-legendary.filters-chip--active { color: #f0a030; background: rgba(220,140,30,0.15); border-color: #f0a030; }

.filters-modal__footer {
  display: flex;
  gap: 10px;
  padding: 12px 20px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
}

.filters-reset {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.13s, color 0.13s;
}

.filters-reset:hover {
  background: rgba(var(--ion-color-danger-rgb), 0.08);
  color: var(--ion-color-danger);
  border-color: var(--ion-color-danger);
}

.filters-apply {
  flex: 2;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.13s;
}

.filters-apply:hover { opacity: 0.88; }

.tag-chip-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.tag-info-btn {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(var(--ion-color-primary), 0.8);
  background: transparent;
  color: var(--ion-color-primary);
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.tag-info-btn:hover,
.tag-info-btn--active {
  background: rgba(var(--ion-color-primary-rgb), 0.8);
  color: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
}

.tag-description {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--ion-color-primary-rgb), 0.06);
  border-left: 3px solid var(--ion-color-primary);
  font-size: 12px;
  line-height: 1.5;
  color: var(--ion-color-secondary);
}

.tag-description__name {
  font-weight: 600;
  color: var(--ion-color-primary);
  margin-right: 4px;
}
</style>

