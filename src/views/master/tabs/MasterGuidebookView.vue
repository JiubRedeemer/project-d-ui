<script setup lang="ts">
import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  onIonViewDidEnter,
  useIonRouter
} from "@ionic/vue";
import {
  chevronForwardOutline,
  peopleOutline,
  bookOutline,
  documentTextOutline,
  cubeOutline,
  sparklesOutline,
  menuOutline
} from "ionicons/icons";
import {computed, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {
  getBackgroundsForRoom,
  getClassesForRoom,
  getRacesForRoom
} from "@/api/rulebookApi";
import type {BackgroundDto, ClazzDto, RaceDto} from "@/api/rulebookApi.types";
import {Item} from "@/components/models/response/InventoryResponse";
import type {SpellDto} from "@/components/models/response/MagicApi";
import {listSpells} from "@/api/magicApi";
import {FILE_STORAGE_INTEGRATION_ROUTES, SPELL_IMAGE_PLACEHOLDER} from "@/config/integrationRoutes";
import {useRoomStore} from "@/stores/RoomStore";
import {useFullRaceStore} from "@/stores/FullRaceStore";
import {useFullClassStore} from "@/stores/FullClassStore";
import {useFullBackgroundStore} from "@/stores/FullBackgroundStore";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import MasterGuidebookItemModal from "@/views/master/modals/MasterGuidebookItemModal.vue";
import MasterGuidebookSpellModal from "@/views/master/modals/MasterGuidebookSpellModal.vue";

const route = useRoute();
const ionRouter = useIonRouter();
const roomStore = useRoomStore();
const fullRaceStore = useFullRaceStore();
const fullClassStore = useFullClassStore();
const fullBackgroundStore = useFullBackgroundStore();

type Section = "list" | "races" | "classes" | "backgrounds" | "items" | "spells";
const currentSection = ref<Section>("list");

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  {id: "races", label: "Расы", icon: "peopleOutline"},
  {id: "classes", label: "Классы", icon: "bookOutline"},
  {id: "backgrounds", label: "Предыстории", icon: "documentTextOutline"},
  {id: "items", label: "Предметы", icon: "cubeOutline"},
  {id: "spells", label: "Заклинания", icon: "sparklesOutline"}
];

const sectionIcons: Record<string, unknown> = {
  peopleOutline,
  bookOutline,
  documentTextOutline,
  cubeOutline,
  sparklesOutline
};
const races = ref<RaceDto[]>([]);
const classes = ref<ClazzDto[]>([]);
const backgrounds = ref<BackgroundDto[]>([]);
const items = ref<Item[]>([]);
const spells = ref<SpellDto[]>([]);
const itemSearchQuery = ref("");
const spellSearchQuery = ref("");
const selectedSpellClass = ref<string | "ALL">("ALL");
const spellClasses = ref<{ value: string; label: string; groupCode?: string | null }[]>([]);
const spellClassesLoading = ref(false);
const loading = ref(false);
const itemsLoadingMore = ref(false);
const hasMoreItems = ref(true);
const ITEMS_PAGE_LIMIT = 30;
const selectedItem = ref<Item | null>(null);
const showItemModal = ref(false);
const selectedSpell = ref<SpellDto | null>(null);
const showSpellModal = ref(false);

const roomId = computed(() => route.params.roomId as string);
const baseRuleType = computed(() => roomStore.room?.baseRuleType);

// Кэш для рас, классов и предысторий (ключ: roomId:baseRuleType)
const guidebookCache = new Map<string, { races: RaceDto[]; classes: ClazzDto[]; backgrounds: BackgroundDto[] }>();

function getCacheKey() {
  return `${roomId.value}:${baseRuleType.value ?? ""}`;
}

watch([roomId, baseRuleType], () => {
  races.value = [];
  classes.value = [];
  backgrounds.value = [];
}, { flush: "sync" });

// Локальный дебаунс для поиска заклинаний и предметов,
// чтобы не перерендеривать большие списки на каждый ввод символа
const debouncedSpellSearchQuery = ref("");
const debouncedItemSearchQuery = ref("");

let spellSearchTimeout: ReturnType<typeof setTimeout> | null = null;
let itemSearchTimeout: ReturnType<typeof setTimeout> | null = null;

watch(
  spellSearchQuery,
  (q) => {
    if (spellSearchTimeout) clearTimeout(spellSearchTimeout);
    const value = q.trim();
    spellSearchTimeout = setTimeout(() => {
      debouncedSpellSearchQuery.value = value;
    }, 250);
  },
  { flush: "post" }
);

const filteredSpells = computed(() => {
  const q = debouncedSpellSearchQuery.value.toLowerCase();
  let list = spells.value;
  if (q) {
    list = list.filter((s) => {
      const name =
        (s.name as Record<string, string>)?.rus ??
        (s.name as Record<string, string>)?.en ??
        "";
      return name.toLowerCase().includes(q);
    });
  }
  return list;
});

const spellsByLevel = computed(() => {
  const byLevel = new Map<string, SpellDto[]>();
  for (const spell of filteredSpells.value) {
    const level = spell.level ?? "0";
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push(spell);
  }
  return Array.from(byLevel.entries()).sort(
    ([a], [b]) => parseInt(a, 10) - parseInt(b, 10)
  );
});

async function loadRaces() {
  if (!roomId.value || !baseRuleType.value) return;
  const key = getCacheKey();
  const cached = guidebookCache.get(key);
  if (cached?.races.length) {
    races.value = cached.races;
    return;
  }
  loading.value = true;
  try {
    races.value = await getRacesForRoom(roomId.value, baseRuleType.value);
    const entry = guidebookCache.get(key) ?? { races: [], classes: [], backgrounds: [] };
    entry.races = races.value;
    guidebookCache.set(key, entry);
  } finally {
    loading.value = false;
  }
}

async function loadClasses() {
  if (!roomId.value || !baseRuleType.value) return;
  const key = getCacheKey();
  const cached = guidebookCache.get(key);
  if (cached?.classes.length) {
    classes.value = cached.classes;
    return;
  }
  loading.value = true;
  try {
    classes.value = await getClassesForRoom(roomId.value, baseRuleType.value);
    const entry = guidebookCache.get(key) ?? { races: [], classes: [], backgrounds: [] };
    entry.classes = classes.value;
    guidebookCache.set(key, entry);
  } finally {
    loading.value = false;
  }
}

async function loadBackgrounds() {
  if (!roomId.value || !baseRuleType.value) return;
  const key = getCacheKey();
  const cached = guidebookCache.get(key);
  if (cached?.backgrounds.length) {
    backgrounds.value = cached.backgrounds;
    return;
  }
  loading.value = true;
  try {
    backgrounds.value = await getBackgroundsForRoom(roomId.value, baseRuleType.value);
    const entry = guidebookCache.get(key) ?? { races: [], classes: [], backgrounds: [] };
    entry.backgrounds = backgrounds.value;
    guidebookCache.set(key, entry);
  } finally {
    loading.value = false;
  }
}

async function searchItems(replaceResults = true) {
  const q = debouncedItemSearchQuery.value.trim();
  if (q.length < 2) {
    items.value = [];
    hasMoreItems.value = true;
    return;
  }
  const lastItem = replaceResults ? null : items.value[items.value.length - 1];
  const lastSeenCreatedAt = lastItem?.createdAt?.toString().replace(/(\+\d{2}:\d{2}|Z)$/, "") ?? null;
  const lastSeenId = lastItem?.id ?? null;

  if (replaceResults) {
    loading.value = true;
    hasMoreItems.value = true;
  } else {
    itemsLoadingMore.value = true;
  }

  try {
    const {data} = await axios.post<Item[]>(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId.value}${GATEWAY_INTEGRATION_ROUTES.items}${GATEWAY_INTEGRATION_ROUTES.search}`,
      {
        searchQuery: q,
        limit: ITEMS_PAGE_LIMIT,
        lastSeenCreatedAt,
        lastSeenId
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`
        }
      }
    );
    const newItems = (data ?? []).map((item) => ({...item, count: item.count ?? 1}));
    hasMoreItems.value = newItems.length >= ITEMS_PAGE_LIMIT;
    if (replaceResults) {
      items.value = newItems;
    } else {
      items.value.push(...newItems);
    }
  } finally {
    loading.value = false;
    itemsLoadingMore.value = false;
  }
}

async function loadMoreItems() {
  if (!hasMoreItems.value || itemsLoadingMore.value || items.value.length === 0) return;
  await searchItems(false);
}

function openItemModal(item: Item) {
  selectedItem.value = item;
  showItemModal.value = true;
}

function closeItemModal() {
  showItemModal.value = false;
  selectedItem.value = null;
}

function openSpellModal(spell: SpellDto) {
  selectedSpell.value = spell;
  showSpellModal.value = true;
}

function closeSpellModal() {
  showSpellModal.value = false;
  selectedSpell.value = null;
}

async function loadSpells() {
  loading.value = true;
  try {
    const spellClass =
      selectedSpellClass.value === "ALL" ? undefined : (selectedSpellClass.value as string);
    const rootSpellClass =
      spellClass != null
        ? (spellClasses.value.find((c) => c.value === spellClass)?.groupCode ?? undefined)
        : undefined;
    spells.value = await listSpells(spellClass, rootSpellClass ?? undefined);
  } finally {
    loading.value = false;
  }
}

async function loadSpellClassesForRoom() {
  if (!roomId.value) return;
  spellClassesLoading.value = true;
  try {
    const classes = await getClassesForRoom(roomId.value, undefined);
    const options = classes.map((c) => ({
      value: c.code,
      label: c.name?.trim() || c.code,
      groupCode: c.groupCode
    }));
    spellClasses.value = options;
  } catch {
    spellClasses.value = [];
  } finally {
    spellClassesLoading.value = false;
  }
}

watch(selectedSpellClass, () => {
  loadSpells();
});

watch(
  itemSearchQuery,
  (q) => {
    if (itemSearchTimeout) clearTimeout(itemSearchTimeout);
    const value = q.trim();

    if (value.length < 2) {
      debouncedItemSearchQuery.value = "";
      items.value = [];
      hasMoreItems.value = true;
      return;
    }

    itemSearchTimeout = setTimeout(() => {
      debouncedItemSearchQuery.value = value;
      searchItems(true);
    }, 300);
  },
  { flush: "post" }
);

function goToRace(race: RaceDto) {
  fullRaceStore.race = race;
  ionRouter.navigate(`/guidebook/races/${race.code}`, "forward", "push");
}

function goToClass(clazz: ClazzDto) {
  fullClassStore.clazz = clazz;
  ionRouter.navigate(`/guidebook/classes/${clazz.code}`, "forward", "push");
}

function goToBackground(bg: BackgroundDto) {
  fullBackgroundStore.background = bg;
  ionRouter.navigate(`/guidebook/backgrounds/${bg.code}`, "forward", "push");
}

function getRaceImageUrl(imgUrl: string | undefined | null) {
  return imgUrl
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.races_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
    : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
}

function getClassImageUrl(imgUrl: string | undefined | null) {
  return imgUrl
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.classes_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
    : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
}

function getBackgroundImageUrl(imgUrl: string | undefined | null) {
  return imgUrl
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.backgrounds_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
    : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
}

function getItemImageUrl(imgUrl: string | undefined) {
  return imgUrl
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
    : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
}

function getSpellImageUrl(imgUrl: string | undefined) {
  if (!imgUrl) return SPELL_IMAGE_PLACEHOLDER;
  if (imgUrl.startsWith("http")) return imgUrl;
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
}

function getItemName(item: Item) {
  const n = item.name as { rus?: string; eng?: string };
  return n?.rus ?? n?.eng ?? "—";
}

function getSpellName(spell: SpellDto) {
  const n = spell?.name as Record<string, string> | undefined;
  return n?.rus ?? n?.en ?? "—";
}

function goToSection(section: Section) {
  currentSection.value = section;
  if (section === "races" && races.value.length === 0) loadRaces();
  else if (section === "classes" && classes.value.length === 0) loadClasses();
  else if (section === "backgrounds" && backgrounds.value.length === 0) loadBackgrounds();
    else if (section === "spells" && spells.value.length === 0) {
      loadSpellClassesForRoom();
      loadSpells();
    }
}

function goBack() {
  currentSection.value = "list";
}

const sectionTitles: Record<string, string> = {
  races: "Расы",
  classes: "Классы",
  backgrounds: "Предыстории",
  items: "Предметы",
  spells: "Заклинания"
};

onIonViewDidEnter(async () => {
  if (!roomStore.room?.id) await roomStore.getRoomInfo(roomId.value);
});
</script>

<template>
  <div class="guidebook">
    <!-- Список разделов -->
    <div v-show="currentSection === 'list'" class="sections-list">
      <ion-list class="guidebook-list">
        <ion-item
          v-for="section in SECTIONS"
          :key="section.id"
          :button="true"
          color="dark"
          @click="goToSection(section.id)"
        >
          <ion-icon :icon="sectionIcons[section.icon]" slot="start" class="section-icon" />
          <ion-icon :icon="chevronForwardOutline" slot="end" />
          <ion-label>{{ section.label }}</ion-label>
        </ion-item>
      </ion-list>
    </div>

    <!-- Контент раздела с кнопкой назад -->
    <template v-if="currentSection !== 'list'">
      <div class="section-header">
        <ion-buttons>
          <ion-button fill="clear" @click="goBack">
            <ion-icon :icon="menuOutline" />
          </ion-button>
        </ion-buttons>
        <h2 class="section-title">{{ sectionTitles[currentSection] }}</h2>
      </div>

    <!-- Расы -->
    <div v-show="currentSection === 'races'" class="segment-content">
      <ion-list v-if="!loading && races.length" class="guidebook-list">
        <ion-item
          v-for="race in races"
          :key="race.code + (race.id ?? '')"
          :button="true"
          color="dark"
          @click="goToRace(race)"
        >
          <ion-avatar slot="start">
            <img :src="getRaceImageUrl(race.imgUrl)" alt="" />
          </ion-avatar>
          <ion-icon :icon="chevronForwardOutline" slot="end" />
          <ion-label>{{ race.name }}</ion-label>
        </ion-item>
      </ion-list>
      <div v-else-if="loading" class="loading-placeholder">Загрузка...</div>
      <div v-else class="empty-placeholder">Нет рас в этой комнате</div>
    </div>

    <!-- Классы -->
    <div v-show="currentSection === 'classes'" class="segment-content">
      <ion-list v-if="!loading && classes.length" class="guidebook-list">
        <ion-item
          v-for="clazz in classes"
          :key="clazz.code + (clazz.id ?? '')"
          :button="true"
          color="dark"
          @click="goToClass(clazz)"
        >
          <ion-avatar slot="start">
            <img :src="getClassImageUrl(clazz.imgUrl)" alt="" />
          </ion-avatar>
          <ion-icon :icon="chevronForwardOutline" slot="end" />
          <ion-label>{{ clazz.name }}</ion-label>
        </ion-item>
      </ion-list>
      <div v-else-if="loading" class="loading-placeholder">Загрузка...</div>
      <div v-else class="empty-placeholder">Нет классов в этой комнате</div>
    </div>

    <!-- Предыстории -->
    <div v-show="currentSection === 'backgrounds'" class="segment-content">
      <ion-list v-if="!loading && backgrounds.length" class="guidebook-list">
        <ion-item
          v-for="bg in backgrounds"
          :key="bg.code + (bg.id ?? '')"
          :button="true"
          color="dark"
          @click="goToBackground(bg)"
        >
          <ion-avatar slot="start">
            <img :src="getBackgroundImageUrl(bg.imgUrl)" alt="" />
          </ion-avatar>
          <ion-icon :icon="chevronForwardOutline" slot="end" />
          <ion-label>{{ bg.name }}</ion-label>
        </ion-item>
      </ion-list>
      <div v-else-if="loading" class="loading-placeholder">Загрузка...</div>
      <div v-else class="empty-placeholder">Нет предысторий в этой комнате</div>
    </div>

    <!-- Предметы -->
    <div v-show="currentSection === 'items'" class="segment-content">
      <ion-searchbar
        v-model="itemSearchQuery"
        placeholder="Поиск предметов (минимум 2 символа)"
        debounce="300"
      />
      <ion-list v-if="items.length" class="guidebook-list">
        <ion-item
          v-for="item in items"
          :key="item.id"
          :button="true"
          color="dark"
          @click="openItemModal(item)"
        >
          <ion-avatar slot="start">
            <img :src="getItemImageUrl(item.imgUrl)" alt="" />
          </ion-avatar>
          <ion-icon :icon="chevronForwardOutline" slot="end" />
          <ion-label>
            <h3>{{ getItemName(item) }}</h3>
            <p>{{ item.typeName }} <span v-if="item.subtypeName">— {{ item.subtypeName }}</span></p>
          </ion-label>
        </ion-item>
      </ion-list>
      <ion-button
        v-if="items.length && hasMoreItems && !loading"
        expand="block"
        fill="outline"
        color="primary"
        :disabled="itemsLoadingMore"
        class="load-more-btn"
        @click="loadMoreItems"
      >
        {{ itemsLoadingMore ? "Загрузка..." : "Загрузить ещё" }}
      </ion-button>
      <div v-else-if="itemSearchQuery.trim().length >= 2 && loading" class="loading-placeholder">
        Загрузка...
      </div>
      <div v-else-if="itemSearchQuery.trim().length >= 2 && !items.length" class="empty-placeholder">
        Ничего не найдено
      </div>
      <div v-else class="empty-placeholder">
        Введите минимум 2 символа для поиска предметов
      </div>
    </div>

    <!-- Заклинания -->
    <div v-show="currentSection === 'spells'" class="segment-content">
      <div class="spells-filters">
        <ion-searchbar
          v-model="spellSearchQuery"
          placeholder="Поиск заклинаний"
          debounce="200"
        />
        <div class="spell-class-select-wrapper">
          <label class="spell-class-label" for="spell-class-select">Класс</label>
          <select
            id="spell-class-select"
            v-model="selectedSpellClass"
            class="spell-class-select"
            :disabled="spellClassesLoading"
          >
            <option value="ALL">Все классы</option>
            <option
              v-for="opt in spellClasses"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
      <div v-if="!loading && filteredSpells.length" class="spells-content">
        <div v-for="[level, levelSpells] in spellsByLevel" :key="level" class="spell-level-group">
          <div class="spell-level-label">{{ level === "0" ? "Фокусы" : `${level} уровень` }}</div>
          <ion-list class="guidebook-list">
            <ion-item
              v-for="spell in levelSpells"
              :key="spell.id"
              :button="true"
              color="dark"
              @click="openSpellModal(spell)"
            >
              <ion-avatar slot="start">
                <img :src="getSpellImageUrl(spell.imgUrl)" alt="" />
              </ion-avatar>
              <ion-icon :icon="chevronForwardOutline" slot="end" />
              <ion-label>
                <h3>{{ getSpellName(spell) }}</h3>
                <p>{{ spell.school }} <span v-if="spell.damageType">— {{ spell.damageType }}</span></p>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>
      </div>
      <div v-else-if="loading" class="loading-placeholder">Загрузка...</div>
      <div v-else class="empty-placeholder">Нет заклинаний</div>
    </div>
    </template>

    <MasterGuidebookItemModal
      :item="selectedItem"
      :is-open="showItemModal"
      @close="closeItemModal"
    />
    <MasterGuidebookSpellModal
      :spell="selectedSpell"
      :is-open="showSpellModal"
      @close="closeSpellModal"
    />
  </div>
</template>

<style scoped>
.guidebook {
  padding: 0 12px 80px;
}

.sections-list {
  padding-top: 8px;
}

.section-icon {
  font-size: 24px;
  margin-right: 12px;
  color: var(--ion-color-primary);
}

.section-header {
  margin-top: 50px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.segment-content {
  min-height: 200px;
}

.guidebook-list {
  background: transparent;
}

.guidebook-list ion-item {
  --min-height: 52px;
}

.guidebook-list ion-avatar {
  width: 40px;
  height: 40px;
}

.guidebook-list ion-avatar img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 50%;
}

.loading-placeholder,
.empty-placeholder {
  padding: 24px;
  text-align: center;
  color: var(--ion-color-medium);
}

ion-searchbar {
  --background: var(--ion-color-medium);
  --border-radius: 8px;
  padding: 8px 0;
}

.spells-content {
  padding-bottom: 16px;
}

.spells-filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spell-class-select-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 4px;
}

.spell-class-label {
  font-size: 14px;
  color: var(--ion-color-light);
}

.spell-class-select {
  flex: 1;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--ion-color-medium);
  background: var(--ion-color-dark);
  color: var(--ion-color-light);
}

.spell-level-group {
  margin-bottom: 16px;
}

.spell-level-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ion-color-primary);
  margin-bottom: 8px;
  padding-left: 4px;
}

.load-more-btn {
  margin: 16px 0;
}
</style>
