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
  onIonViewDidEnter,
  toastController,
  useIonRouter,
} from "@ionic/vue";
import {add, addOutline, arrowBack, checkmarkOutline, closeOutline, filterOutline} from "ionicons/icons";
import {computed, onMounted, ref, watch, shallowRef} from "vue";
import {useRoute, useRouter} from "vue-router";
import {
  addSpellToBook,
  getSpellBookByRoomAndCharacter,
} from "@/api/magicApi";
import {getSpellBundlesForRoom, getRoomSpellsFromBundles} from "@/api/spellBundleApi";
import type {SpellBundle, SpellDto} from "@/components/models/response/MagicApi";
import type {SpellClass} from "@/components/models/response/MagicApi";
import type {SpellBookItemDto} from "@/components/models/response/MagicApi";
import {
  FILE_STORAGE_INTEGRATION_ROUTES,
  SPELL_IMAGE_PLACEHOLDER,
} from "@/config/integrationRoutes";
import {useCharacterStore} from "@/stores/CharacterStore";
import {useMagicStore} from "@/stores/MagicStore";
import {useRoomStore} from "@/stores/RoomStore";
import SpellInfoModal from "@/views/character/tabs/magic/SpellInfoModal.vue";

// Режим выбора: компонент встраивается в модалку (например, при создании NPC)
// и вместо добавления в книгу заклинаний эмитит выбранное заклинание.
const props = withDefaults(defineProps<{ pickMode?: boolean }>(), {pickMode: false});
const emit = defineEmits<{ (e: "select", spell: SpellDto): void; (e: "close"): void }>();

const route = useRoute();
const ionRouter = useIonRouter();
const router = useRouter();
const characterStore = useCharacterStore();
const magicStore = useMagicStore();
const roomStore = useRoomStore();

const roomId = computed(() => String(route.params.roomId));
const characterId = computed(() => String(route.params.characterId));

const allSpells = shallowRef<SpellDto[]>([]);
const searchQuery = ref("");
const debouncedQuery = ref("");
const forMyClass = ref(true);
const selectedSchool = ref<string>(""); // "" => all schools
const selectedLevel = ref<string>(""); // "" => all levels
const loading = ref(true);
const addingSpellId = ref<string | null>(null);
const selectedSpellId = ref<string | null>(null);
const showSpellModal = ref(false);
const availableBundles = ref<SpellBundle[]>([]);
const selectedSpellBundle = ref<string>("ALL"); // "ALL" => все включённые наборы + пользовательские
const showFiltersModal = ref(false);

const spellActiveFiltersCount = computed(() =>
    (selectedSpellBundle.value !== "ALL" ? 1 : 0) +
    (!props.pickMode && forMyClass.value ? 1 : 0) +
    (selectedSchool.value ? 1 : 0) +
    (selectedLevel.value ? 1 : 0)
);
const selectedBundleName = computed(
    () => availableBundles.value.find((b) => b.id === selectedSpellBundle.value)?.name ?? selectedSpellBundle.value
);

function resetSpellFilters() {
  selectedSpellBundle.value = "ALL";
  if (!props.pickMode) forMyClass.value = false;
  selectedSchool.value = "";
  selectedLevel.value = "";
}

const spellBookId = computed(() => magicStore.spellBook?.id ?? null);
const spellsInBook = computed(
    () => new Set(magicStore.spellBook?.spells?.map((s) => s.spellId) ?? [])
);

const characterSpellClass = computed((): SpellClass | undefined => {
  const code = characterStore.character?.clazzCode;
  if (!code) return undefined;
  const valid: SpellClass[] = [
    "BARD", "BARBARIAN", "FIGHTER", "WIZARD", "DRUID", "CLERIC",
    "ARTIFICER", "WARLOCK", "MONK", "PALADIN", "ROGUE", "RANGER", "SORCERER",
  ];
  return valid.includes(code as SpellClass) ? (code as SpellClass) : undefined;
});

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, (val) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => { debouncedQuery.value = val; }, 250);
});

const filteredSpells = computed(() => {
  let list = allSpells.value;
  const q = debouncedQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((s) => {
      const name =
          (s.name as Record<string, string>)?.rus ??
          (s.name as Record<string, string>)?.en ??
          "";
      const aliasName =
          (s.aliasName as Record<string, string>)?.rus ??
          (s.aliasName as Record<string, string>)?.en ??
          "";
      return name.toLowerCase().includes(q) || aliasName.toLowerCase().includes(q);
    });
  }

  if (selectedSchool.value) {
    list = list.filter((s) => (s.school ?? "") === selectedSchool.value);
  }
  if (selectedLevel.value) {
    list = list.filter((s) => String(s.level ?? "0") === selectedLevel.value);
  }

  return list;
});

const availableSchools = computed(() => {
  const set = new Set<string>();
  for (const spell of allSpells.value) {
    if (spell.school) set.add(spell.school);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
});

const availableLevels = computed(() => {
  const set = new Set<string>();
  for (const spell of allSpells.value) {
    set.add(String(spell.level ?? "0"));
  }
  return Array.from(set).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isFinite(na) || !Number.isFinite(nb)) return a.localeCompare(b, "ru");
    return na - nb;
  });
});

interface SpellRow {
  id: string;
  name: string;
  line1: string;
  line2: string;
  imgUrl: string;
  inBook: boolean;
  raw: SpellDto;
}

const spellsByLevel = computed(() => {
  const inBook = spellsInBook.value;
  const byLevel = new Map<string, SpellRow[]>();
  for (const spell of filteredSpells.value) {
    const level = spell.level ?? "0";
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push({
      id: spell.id ?? "",
      name: getSpellName(spell),
      line1: getDetailsLine1(spell),
      line2: getDetailsLine2(spell),
      imgUrl: getSpellImageUrl(spell.imgUrl),
      inBook: spell.id != null && inBook.has(spell.id),
      raw: spell,
    });
  }
  return Array.from(byLevel.entries()).sort(
      ([a], [b]) => parseInt(a, 10) - parseInt(b, 10)
  );
});

const selectedSpellItem = computed<SpellBookItemDto | null>(() => {
  const sid = selectedSpellId.value;
  if (!sid) return null;
  const spell = allSpells.value.find((s) => s.id === sid);
  if (!spell) return null;
  return {
    spellId: sid,
    spell,
    inUse: false,
  };
});

function getSpellName(spell: SpellDto): string {
  if (!spell?.name) return "—";
  const n = spell.name as Record<string, string>;
  return n.rus ?? n.eng ?? "—";
}

function getDetailsLine1(spell: SpellDto): string {
  if (!spell) return "";
  const parts: string[] = [];
  if (spell.level === "0") parts.push("Фокус");
  else if (spell.level != null) parts.push(`Уровень ${spell.level}`);
  if (spell.school) parts.push(`школа ${spell.school}`);
  if (spell.damageType) parts.push(spell.damageType);
  if (spell.healType) parts.push(spell.healType);
  if (spell.ritual) parts.push("ритуал");
  if (spell.customization) parts.push("доп.тип");
  return parts.join(", ") || "";
}

function getDetailsLine2(spell: SpellDto): string {
  if (!spell) return "";
  const parts: string[] = [];
  if (spell.useTime) parts.push(spell.useTime);
  if (spell.distance) parts.push(spell.distance);
  return parts.join(", ") || "";
}

function getSpellImageUrl(imgUrl: string | undefined): string {
  if (!imgUrl) return SPELL_IMAGE_PLACEHOLDER;
  if (imgUrl.startsWith("http")) return imgUrl;
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.spell_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
}

function getLevelLabel(level: string): string {
  return level === "0" ? "Фокусы" : `${level} уровень`;
}

function canAdd(spell: SpellDto): boolean {
  return spell.id != null && !spellsInBook.value.has(spell.id);
}

async function addSpell(spell: SpellDto) {
  const bookId = spellBookId.value;
  const sid = spell.id;
  if (!bookId || !sid || !canAdd(spell)) return;
  addingSpellId.value = sid;
  try {
    const updated = await addSpellToBook(bookId, sid);
    magicStore.setSpellBook(updated);
    await presentToast();
  } catch (e) {
    console.error("Failed to add spell:", e);
  } finally {
    addingSpellId.value = null;
  }
}

async function presentToast() {
  const toast = await toastController.create({
    message: "Заклинание добавлено в книгу",
    duration: 1000,
    position: "top",
  });
  await toast.present();
}

async function loadBundles() {
  try {
    const bundles = await getSpellBundlesForRoom(roomId.value);
    availableBundles.value = bundles.filter((b) => b.enabled);
  } catch (e) {
    console.error("Failed to load spell bundles:", e);
    availableBundles.value = [];
  }
}

async function loadSpells() {
  loading.value = true;
  try {
    const spellClass = forMyClass.value ? characterSpellClass.value : undefined;
    const bundleId = selectedSpellBundle.value === "ALL" ? undefined : selectedSpellBundle.value;
    allSpells.value = await getRoomSpellsFromBundles(roomId.value, spellClass, bundleId);
  } catch (e) {
    console.error("Failed to load spells:", e);
    allSpells.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadSpellBook() {
  if (magicStore.spellBook?.characterId === characterId.value) return;
  try {
    const book = await getSpellBookByRoomAndCharacter(
        roomId.value,
        characterId.value
    );
    magicStore.setSpellBook(book);
  } catch (e) {
    console.error("Failed to load spell book:", e);
    magicStore.setSpellBook(null);
  }
}

function openSpellModal(spell: SpellDto) {
  if (!spell.id) return;
  selectedSpellId.value = spell.id;
  showSpellModal.value = true;
}

function closeSpellModal() {
  showSpellModal.value = false;
  selectedSpellId.value = null;
}

const initialized = ref(false);

async function initView() {
  if (initialized.value) return;
  initialized.value = true;
  // В режиме выбора для NPC не привязываемся к классу персонажа
  if (props.pickMode) forMyClass.value = false;
  if (!roomStore.room?.id || roomStore.room.id !== roomId.value) {
    try {
      await roomStore.getRoomInfo(roomId.value);
    } catch (e) {
      console.error("Failed to load room info:", e);
    }
  }
  await loadBundles();
  if (!props.pickMode) await loadSpellBook();
  await loadSpells();
}

function pickSpell(spell: SpellDto) {
  emit("select", spell);
}

onIonViewDidEnter(initView);
onMounted(() => {
  // В модалке ionViewDidEnter может не сработать — инициализируем вручную.
  if (props.pickMode) void initView();
});

watch([forMyClass, selectedSpellBundle], () => {
  selectedSchool.value = "";
  selectedLevel.value = "";
  loadSpells();
});

function openAddSpellView() {
  ionRouter.navigate(
      `/rooms/${roomId.value}/characters/${characterId.value}/magic/add`,
      "forward",
      "push"
  );
}
</script>

<template>
  <ion-page>
    <ion-header class="search-header">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button v-if="pickMode" fill="clear" @click="emit('close')">
            <ion-icon slot="icon-only" :icon="closeOutline"/>
          </ion-button>
          <ion-back-button v-else :default-href="`/rooms/${roomId}/characters/${characterId}`"/>
        </ion-buttons>
        <ion-searchbar
            v-model="searchQuery"
            placeholder="Найти заклинание"
            class="search-line"
        />
      </ion-toolbar>
      <div class="filter-row filter-row--bar">
        <div class="spell-active-chips">
          <span v-if="selectedSpellBundle !== 'ALL'" class="item-active-chip">
            {{ selectedBundleName }}
            <button @click="selectedSpellBundle = 'ALL'"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-if="!pickMode && forMyClass" class="item-active-chip">
            Мой класс
            <button @click="forMyClass = false"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-if="selectedSchool" class="item-active-chip">
            {{ selectedSchool }}
            <button @click="selectedSchool = ''"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-if="selectedLevel" class="item-active-chip">
            {{ getLevelLabel(selectedLevel) }}
            <button @click="selectedLevel = ''"><ion-icon :icon="closeOutline"/></button>
          </span>
        </div>
        <button
            :class="['items-filter-btn', { 'items-filter-btn--active': spellActiveFiltersCount > 0 }]"
            @click="showFiltersModal = true"
        >
          <ion-icon :icon="filterOutline"/>
          <span v-if="spellActiveFiltersCount > 0" class="items-filter-btn__badge">{{ spellActiveFiltersCount }}</span>
        </button>
      </div>
    </ion-header>

    <Teleport to="body">
      <div v-if="showFiltersModal" class="item-filters-overlay" @click.self="showFiltersModal = false">
        <div class="item-filters-modal">
          <div class="item-filters-modal__header">
            <span>Фильтры</span>
            <button class="item-filters-modal__close" @click="showFiltersModal = false">
              <ion-icon :icon="closeOutline"/>
            </button>
          </div>
          <div class="item-filters-modal__body">
            <div v-if="availableBundles.length" class="item-filters-section">
              <div class="item-filters-label">Набор</div>
              <div class="item-filters-chips">
                <button
                    :class="['item-filters-chip', { 'item-filters-chip--active': selectedSpellBundle === 'ALL' }]"
                    @click="selectedSpellBundle = 'ALL'"
                >Все наборы</button>
                <button
                    v-for="b in availableBundles" :key="b.id"
                    :class="['item-filters-chip', { 'item-filters-chip--active': selectedSpellBundle === b.id }]"
                    @click="selectedSpellBundle = b.id"
                >{{ b.name }}</button>
              </div>
            </div>

            <div v-if="!pickMode" class="item-filters-section">
              <div class="item-filters-label">Класс</div>
              <div class="item-filters-chips">
                <button
                    :class="['item-filters-chip', { 'item-filters-chip--active': forMyClass }]"
                    @click="forMyClass = true"
                >Мой класс</button>
                <button
                    :class="['item-filters-chip', { 'item-filters-chip--active': !forMyClass }]"
                    @click="forMyClass = false"
                >Все заклинания</button>
              </div>
            </div>

            <div v-if="availableSchools.length" class="item-filters-section">
              <div class="item-filters-label">Школа</div>
              <div class="item-filters-chips">
                <button
                    v-for="s in availableSchools" :key="s"
                    :class="['item-filters-chip', { 'item-filters-chip--active': selectedSchool === s }]"
                    @click="selectedSchool = selectedSchool === s ? '' : s"
                >{{ s }}</button>
              </div>
            </div>

            <div v-if="availableLevels.length" class="item-filters-section">
              <div class="item-filters-label">Уровень</div>
              <div class="item-filters-chips">
                <button
                    v-for="lvl in availableLevels" :key="lvl"
                    :class="['item-filters-chip', { 'item-filters-chip--active': selectedLevel === lvl }]"
                    @click="selectedLevel = selectedLevel === lvl ? '' : lvl"
                >{{ getLevelLabel(lvl) }}</button>
              </div>
            </div>
          </div>
          <div class="item-filters-modal__footer">
            <button class="item-filters-reset" @click="resetSpellFilters">Сбросить</button>
            <button class="item-filters-apply" @click="showFiltersModal = false">Применить</button>
          </div>
        </div>
      </div>
    </Teleport>
    <ion-content>
      <div v-if="loading" class="loading">Загрузка...</div>
      <div v-else class="found" :class="{ 'has-content': filteredSpells.length > 0 }">
        <template v-for="[level, rows] in spellsByLevel" :key="level">
          <h1 class="sectionHeader">{{ getLevelLabel(level) }}</h1>
          <div class="section" v-for="row in rows" :key="row.id">
            <div class="section-start-block" @click="openSpellModal(row.raw)">
              <div class="image-block">
                <img
                    width="55"
                    height="55"
                    class="spell-image"
                    loading="lazy"
                    :src="row.imgUrl"
                    :alt="row.name"
                />
              </div>
              <div class="stats-block">
                <div class="item-name">{{ row.name }}</div>
                <div class="item-stats">{{ row.line1 }}</div>
                <div class="item-stats">{{ row.line2 }}</div>
              </div>
            </div>
            <div class="add-button-block">
              <ion-button
                  v-if="pickMode"
                  @click="pickSpell(row.raw)"
                  size="small"
                  shape="round"
                  class="add-button"
              >
                <ion-icon slot="icon-only" :icon="checkmarkOutline"/>
              </ion-button>
              <ion-button
                  v-else-if="!row.inBook"
                  @click="addSpell(row.raw)"
                  size="small"
                  shape="round"
                  class="add-button"
                  :disabled="addingSpellId === row.id"
              >
                <ion-icon slot="icon-only" :icon="addOutline"/>
              </ion-button>
              <span v-else class="already-added">В книге</span>
            </div>
          </div>
        </template>
        <div v-if="!loading && filteredSpells.length === 0" class="empty">
          Заклинания не найдены
        </div>
      </div>
    </ion-content>
    <ion-fab v-if="!pickMode" slot="fixed" vertical="bottom" horizontal="start">
      <ion-fab-button color="primary" @click="router.back()">
        <ion-icon :icon="arrowBack" color="dark"/>
      </ion-fab-button>
    </ion-fab>
    <ion-fab v-if="!pickMode" slot="fixed" vertical="bottom" horizontal="end">
      <ion-fab-button color="primary" @click="openAddSpellView()">
        <ion-icon :icon="add" color="dark"/>
      </ion-fab-button>
    </ion-fab>

    <SpellInfoModal
        :isOpen="showSpellModal"
        :item="selectedSpellItem"
        :spell-book-id="spellBookId"
        :readonly="true"
        @closeSpellInfoModal="closeSpellModal"
    />
  </ion-page>
</template>

<style scoped>
.search-header,
ion-content {
  --background: var(--ion-color-dark);
}

.filter-row {
  padding: 8px 16px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--ion-color-light);
  font-size: 14px;
  background-color: var(--ion-color-dark);
}

ion-segment-button {
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

.rule-segment {
  width: 100%;
  margin: 10px 4px 0;
  --background: var(--ion-color-medium);
  border-radius: 14px;
  padding: 3px;
}

.filter-row ion-toggle {
  --track-background-checked: #4a2c6e;
}

.found {
  margin-bottom: 90px;
  margin-left: 10px;
  margin-right: 10px;
}

.loading,
.empty {
  color: var(--ion-color-light);
  padding: 1rem;
  text-align: center;
}

.sectionHeader {
  color: var(--ion-color-light);
  font-size: 18px;
  font-weight: bold;
  margin-top: 14px;
  margin-bottom: 8px;
}

.section {
  background-color: var(--ion-color-medium);
  border-radius: 25px;
  padding: 10px;
  overflow: hidden;
  max-height: 75px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  content-visibility: auto;
  contain-intrinsic-size: 0 75px;
}

.section-start-block {
  display: flex;
  flex-direction: row;
  justify-content: start;
  align-items: center;
  gap: 10px;
}

.add-button-block {
  display: flex;
  align-items: center;
  min-width: 50px;
  justify-content: flex-end;
}

.add-button {
  --background: #4a2c6e;
  --background-hover: #5a3c7e;
  --color: white;
  --border-radius: 50%;
}

.add-button::part(native) {
  width: 45px;
  height: 45px;
}

.add-button ion-icon {
  width: 24px;
  height: 24px;
}

.already-added {
  font-size: 11px;
  color: var(--ion-color-medium-shade);
}

.item-name {
  font-size: 16px;
  font-weight: bold;
}

.item-stats {
  font-size: 11px;
  color: var(--ion-color-light-shade);
}

.spell-image {
  border-radius: 15px;
  object-fit: cover;
  min-width: 55px;
  min-height: 55px;
}

ion-searchbar {
  --border-radius: 20px;
  --background: #2B2930;
}

.found, ion-toolbar, ion-content, .filter-row {
  --background: var(--ion-color-dark);
}

/* ── Панель фильтров (стиль как в поиске предметов) ── */
.filter-row--bar {
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.spell-active-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.items-filter-btn {
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.14);
  background: rgba(var(--ion-color-light-rgb), 0.06);
  color: rgba(var(--ion-color-light-rgb), 0.6);
  font-size: 18px;
  cursor: pointer;
  transition: background 0.14s, border-color 0.14s, color 0.14s;
}

.items-filter-btn:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border-color: rgba(var(--ion-color-primary-rgb), 0.35);
  color: var(--ion-color-primary);
}

.items-filter-btn--active {
  background: rgba(var(--ion-color-primary-rgb), 0.16);
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary);
}

.items-filter-btn__badge {
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
  line-height: 1;
}

.item-active-chip {
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

.item-active-chip button {
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

.item-active-chip button:hover { opacity: 1; }

.item-filters-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.item-filters-modal {
  width: 100%;
  max-width: 680px;
  max-height: 80vh;
  background: var(--ion-color-dark);
  border-radius: 20px 20px 0 0;
  border-top: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.item-filters-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  font-size: 16px;
  font-weight: 700;
  color: var(--ion-color-light);
  border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.07);
  flex-shrink: 0;
}

.item-filters-modal__close {
  background: transparent;
  border: none;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 8px;
}

.item-filters-modal__close:hover { color: var(--ion-color-light); background: rgba(var(--ion-color-light-rgb), 0.07); }

.item-filters-modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.item-filters-section { display: flex; flex-direction: column; gap: 8px; }

.item-filters-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.4);
}

.item-filters-chips { display: flex; flex-wrap: wrap; gap: 6px; }

.item-filters-chip {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(var(--ion-color-light-rgb), 0.75);
  background: rgba(var(--ion-color-light-rgb), 0.06);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  cursor: pointer;
  transition: background 0.13s, border-color 0.13s, color 0.13s;
}

.item-filters-chip:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border-color: rgba(var(--ion-color-primary-rgb), 0.35);
  color: var(--ion-color-primary);
}

.item-filters-chip--active {
  background: rgba(var(--ion-color-primary-rgb), 0.18);
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary);
  font-weight: 600;
}

.item-filters-modal__footer {
  display: flex;
  gap: 10px;
  padding: 12px 20px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(var(--ion-color-light-rgb), 0.07);
  flex-shrink: 0;
}

.item-filters-reset {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.14);
  background: transparent;
  color: rgba(var(--ion-color-light-rgb), 0.6);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.item-filters-reset:hover { background: rgba(var(--ion-color-danger-rgb), 0.08); color: var(--ion-color-danger); border-color: var(--ion-color-danger); }

.item-filters-apply {
  flex: 2;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.item-filters-apply:hover { opacity: 0.88; }
</style>
