<script setup lang="ts">
import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPopover,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  onIonViewDidEnter,
  useIonRouter
} from "@ionic/vue";
import {
  add,
  addOutline,
  bookOutline,
  chevronForwardOutline,
  cubeOutline,
  documentTextOutline,
  listOutline,
  menuOutline,
  peopleOutline,
  personOutline,
  sparkles,
  sparklesOutline
} from "ionicons/icons";
import {computed, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {getBackgroundsForRoom, getClassesForRoom, getRacesForRoom} from "@/api/rulebookApi";
import type {BackgroundDto, ClazzDto, RaceDto} from "@/api/rulebookApi.types";
import {Item} from "@/components/models/response/InventoryResponse";
import type {SpellDto} from "@/components/models/response/MagicApi";
import {listSpells} from "@/api/magicApi";
import {getNpcsByRoomIdForRoom, saveCharacterNpcRelationForRoom} from "@/api/npcApi";
import type {NpcDto, NpcTypeEnum, RelationTypeEnum} from "@/api/npcApi.types";
import {
  FILE_STORAGE_INTEGRATION_ROUTES,
  GATEWAY_INTEGRATION_ROUTES,
  SPELL_IMAGE_PLACEHOLDER
} from "@/config/integrationRoutes";
import {useRoomStore} from "@/stores/RoomStore";
import {useFullRaceStore} from "@/stores/FullRaceStore";
import {useFullClassStore} from "@/stores/FullClassStore";
import {useFullBackgroundStore} from "@/stores/FullBackgroundStore";
import {useCreateClassStore} from "@/stores/createEntity/CreateClassStore";
import {useCreateRaceStore} from "@/stores/createEntity/CreateRaceStore";
import {useCreateBackgroundStore} from "@/stores/createEntity/CreateBackgroundStore";
import {useCreateInventoryItemStore} from "@/stores/CreateInventoryItemStore";
import type {Character} from "@/components/models/response/Character";
import axios from "axios";
import MasterGuidebookAddFromCatalogModal from "@/views/master/modals/MasterGuidebookAddFromCatalogModal.vue";
import MasterGuidebookItemModal from "@/views/master/modals/MasterGuidebookItemModal.vue";
import MasterGuidebookSpellModal from "@/views/master/modals/MasterGuidebookSpellModal.vue";
import {useGuidebookStore} from "@/stores/GuidebookStore";

const route = useRoute();
const ionRouter = useIonRouter();
const roomStore = useRoomStore();
const fullRaceStore = useFullRaceStore();
const fullClassStore = useFullClassStore();
const fullBackgroundStore = useFullBackgroundStore();
const guidebookStore = useGuidebookStore();
const createInventoryItemStore = useCreateInventoryItemStore();

type Section = "list" | "races" | "classes" | "backgrounds" | "items" | "spells" | "npcs";
const currentSection = ref<Section>("list");

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  {id: "races", label: "Расы", icon: "peopleOutline"},
  {id: "classes", label: "Классы", icon: "bookOutline"},
  {id: "backgrounds", label: "Предыстории", icon: "documentTextOutline"},
  {id: "items", label: "Предметы", icon: "cubeOutline"},
  {id: "spells", label: "Заклинания", icon: "sparklesOutline"},
  {id: "npcs", label: "NPC", icon: "personOutline"}
];

const sectionIcons: Record<string, unknown> = {
  peopleOutline,
  personOutline,
  bookOutline,
  documentTextOutline,
  cubeOutline,
  sparklesOutline
};

const NPC_TYPE_LABELS: Record<NpcTypeEnum, string> = {
  RATIONAL: "Разумное",
  BEAST: "Животное",
  MONSTER: "Монстр",
  DEITY: "Божество",
  UNDEAD: "Нежить"
};

const RELATION_TYPE_LABELS: Record<RelationTypeEnum, string> = {
  FRIEND: "Друзья",
  ENEMY: "Враги",
  RULER: "Правитель",
  PET: "Питомец",
  OTHER: "Другое",
};

const relationTypeOptions = [
  {value: "FRIEND" as RelationTypeEnum, label: RELATION_TYPE_LABELS.FRIEND},
  {value: "ENEMY" as RelationTypeEnum, label: RELATION_TYPE_LABELS.ENEMY},
  {value: "RULER" as RelationTypeEnum, label: RELATION_TYPE_LABELS.RULER},
  {value: "PET" as RelationTypeEnum, label: RELATION_TYPE_LABELS.PET},
  {value: "OTHER" as RelationTypeEnum, label: RELATION_TYPE_LABELS.OTHER},
];
const races = ref<RaceDto[]>([]);
const classes = ref<ClazzDto[]>([]);
const backgrounds = ref<BackgroundDto[]>([]);
const items = ref<Item[]>([]);
const spells = ref<SpellDto[]>([]);
const itemSearchQuery = ref("");
const spellSearchQuery = ref("");
const selectedSpellSchool = ref("");
const selectedSpellLevel = ref("");
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

const npcs = ref<NpcDto[]>([]);
const npcsLoading = ref(false);
const npcFilterType = ref<NpcTypeEnum | "">("");
const npcFilterClass = ref<string>("");
const npcFilterRace = ref<string>("");

const roomCharacters = ref<Character[]>([]);
const roomCharactersLoading = ref(false);

// Popover: добавление связи между выбранным NPC и персонажем комнаты
const npcRelationPopoverOpen = ref(false);
const npcRelationPopoverEvent = ref<Event | null>(null);
const npcRelationPopoverNpcId = ref<string | null>(null);
const npcRelationPopoverCharacterId = ref<string>("");
const npcRelationPopoverType = ref<RelationTypeEnum | "">("");

const roomId = computed(() => {
  const v = route.params.roomId as string | string[] | undefined;
  return Array.isArray(v) ? v[0] : (v ?? "");
});
const baseRuleType = computed(() => {
  const fromRoom = roomStore.room?.baseRuleType;
  if (fromRoom) return fromRoom;
  const fromStore = guidebookStore.baseRuleType;
  return fromStore || undefined;
});
const effectiveBaseRuleType = computed(() => baseRuleType.value ?? guidebookStore.baseRuleType ?? "");

// Кэш для рас, классов и предысторий (ключ: roomId:baseRuleType)
const guidebookCache = new Map<string, { races: RaceDto[]; classes: ClazzDto[]; backgrounds: BackgroundDto[] }>();

function getCacheKey() {
  return `${roomId.value}:${effectiveBaseRuleType.value}`;
}

watch(
    [roomId, baseRuleType],
    ([nextRoomId, nextBaseRuleType], [prevRoomId, prevBaseRuleType]) => {
      // While navigating to FullView routes roomId can be absent; do not wipe lists.
      if (!nextRoomId) return;

      const changed = nextRoomId !== prevRoomId || nextBaseRuleType !== prevBaseRuleType;
      if (!changed) return;

      races.value = [];
      classes.value = [];
      backgrounds.value = [];

      if (currentSection.value !== "list") {
        void ensureSectionDataLoaded(currentSection.value);
      }
    },
    {flush: "post"}
);

type RaceGroup = {
  key: string;
  root: RaceDto | null;
  subs: RaceDto[];
};

type ClassGroup = {
  key: string;
  root: ClazzDto | null;
  subs: ClazzDto[];
};

const raceGroups = computed<RaceGroup[]>(() => {
  const groupsByRootCode = new Map<string, { root: RaceDto | null; subs: RaceDto[] }>();

  for (const race of races.value) {
    const rootCode = race.speciesCode ? race.speciesCode : race.code;
    const group = groupsByRootCode.get(rootCode) ?? {root: null, subs: [] as RaceDto[]};
    if (!groupsByRootCode.has(rootCode)) {
      groupsByRootCode.set(rootCode, group);
    }
    if (race.speciesCode) {
      group.subs.push(race);
    } else {
      group.root = race;
    }
  }

  const out: RaceGroup[] = Array.from(groupsByRootCode.entries()).map(([key, value]) => ({
    key,
    root: value.root,
    subs: value.subs,
  }));

  for (const g of out) {
    g.subs = [...g.subs].sort(
        (a, b) => (a.name ?? a.code).localeCompare(b.name ?? b.code, "ru", {sensitivity: "base"}),
    );
  }

  out.sort((a, b) => {
    const aLabel = a.root?.name ?? a.subs[0]?.name ?? a.key;
    const bLabel = b.root?.name ?? b.subs[0]?.name ?? b.key;
    return aLabel.localeCompare(bLabel, "ru", {sensitivity: "base"});
  });

  return out;
});

const classGroups = computed<ClassGroup[]>(() => {
  const groupsByRootCode = new Map<string, { root: ClazzDto | null; subs: ClazzDto[] }>();
  const normalize = (value: string | null | undefined) => (value ?? "").trim();

  for (const clazz of classes.value) {
    const code = normalize(clazz.code);
    const groupCode = normalize(clazz.groupCode);
    const hasParentClass = groupCode.length > 0 && groupCode !== code;
    const rootCode = hasParentClass ? groupCode : code;
    if (!rootCode) continue;

    const group = groupsByRootCode.get(rootCode) ?? {root: null, subs: [] as ClazzDto[]};
    if (!groupsByRootCode.has(rootCode)) {
      groupsByRootCode.set(rootCode, group);
    }
    if (hasParentClass) {
      group.subs.push(clazz);
    } else {
      group.root = clazz;
    }
  }

  const out: ClassGroup[] = Array.from(groupsByRootCode.entries()).map(([key, value]) => ({
    key,
    root: value.root,
    subs: value.subs,
  }));

  for (const g of out) {
    g.subs = [...g.subs].sort(
        (a, b) => (a.name ?? a.code).localeCompare(b.name ?? b.code, "ru", {sensitivity: "base"}),
    );
  }

  out.sort((a, b) => {
    const aLabel = a.root?.name ?? a.subs[0]?.name ?? a.key;
    const bLabel = b.root?.name ?? b.subs[0]?.name ?? b.key;
    return aLabel.localeCompare(bLabel, "ru", {sensitivity: "base"});
  });

  return out;
});

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
    {flush: "post"}
);

const npcClassOptions = computed(() =>
    classes.value.map((c) => ({value: c.code, label: c.name?.trim() || c.code || ""}))
);
const npcRaceOptions = computed(() =>
    races.value.map((r) => ({value: r.code, label: r.name?.trim() || r.code || ""}))
);
const filteredNpcs = computed(() => {
  let result = npcs.value;
  if (npcFilterType.value) result = result.filter((n) => n.type === npcFilterType.value);
  if (npcFilterClass.value) result = result.filter((n) => n.clazzCode === npcFilterClass.value);
  if (npcFilterRace.value) result = result.filter((n) => n.raceCode === npcFilterRace.value);
  return result.sort((a, b) => a.name.localeCompare(b.name, "ru", {sensitivity: "base"}));
});

const availableSpellSchools = computed(() => {
  const set = new Set<string>();
  for (const spell of spells.value) {
    if (spell.school) set.add(spell.school);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
});

const availableSpellLevels = computed(() => {
  const set = new Set<string>();
  for (const spell of spells.value) {
    set.add(String(spell.level ?? "0"));
  }
  return Array.from(set).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isFinite(na) || !Number.isFinite(nb)) return a.localeCompare(b, "ru");
    return na - nb;
  });
});

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
  if (selectedSpellSchool.value) {
    list = list.filter((s) => (s.school ?? "") === selectedSpellSchool.value);
  }
  if (selectedSpellLevel.value) {
    list = list.filter((s) => String(s.level ?? "0") === selectedSpellLevel.value);
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
  if (!roomId.value) return;
  const key = getCacheKey();
  const cached = guidebookCache.get(key);
  if (cached?.races.length) {
    races.value = cached.races;
    return;
  }
  loading.value = true;
  try {
    races.value = await getRacesForRoom(roomId.value, baseRuleType.value);
    guidebookStore.races = races.value;
    const entry = guidebookCache.get(key) ?? {races: [], classes: [], backgrounds: []};
    entry.races = races.value;
    guidebookCache.set(key, entry);
  } finally {
    loading.value = false;
  }
}

async function loadClasses() {
  if (!roomId.value) return;
  const key = getCacheKey();
  const cached = guidebookCache.get(key);
  if (cached?.classes.length) {
    classes.value = cached.classes;
    return;
  }
  loading.value = true;
  try {
    classes.value = await getClassesForRoom(roomId.value, baseRuleType.value);
    guidebookStore.classes = classes.value;
    const entry = guidebookCache.get(key) ?? {races: [], classes: [], backgrounds: []};
    entry.classes = classes.value;
    guidebookCache.set(key, entry);
  } finally {
    loading.value = false;
  }
}

async function loadBackgrounds(options?: {force?: boolean}) {
  if (!roomId.value) return;
  const key = getCacheKey();
  if (!options?.force) {
    const cached = guidebookCache.get(key);
    if (cached?.backgrounds.length) {
      backgrounds.value = cached.backgrounds;
      return;
    }
  }
  loading.value = true;
  try {
    backgrounds.value = await getBackgroundsForRoom(roomId.value, baseRuleType.value);
    guidebookStore.backgrounds = backgrounds.value;
    const entry = guidebookCache.get(key) ?? {races: [], classes: [], backgrounds: []};
    entry.backgrounds = backgrounds.value;
    guidebookCache.set(key, entry);
  } finally {
    loading.value = false;
  }
}

function storeMatchesCurrentRoom() {
  const effective = effectiveBaseRuleType.value;
  const stored = (guidebookStore.baseRuleType ?? "");
  return (
    guidebookStore.roomId === roomId.value &&
    // Allow store updates even if baseRuleType wasn't set yet.
    (stored === "" || stored === effective)
  );
}

function hydrateFromStoreIfPossible() {
  if (!storeMatchesCurrentRoom()) return false;
  if (guidebookStore.races?.length) races.value = guidebookStore.races;
  if (guidebookStore.classes?.length) classes.value = guidebookStore.classes;
  if (guidebookStore.backgrounds?.length) backgrounds.value = guidebookStore.backgrounds;
  return true;
}

watch(
  () => guidebookStore.races,
  (val) => {
    if (!storeMatchesCurrentRoom()) return;
    races.value = val;
    const key = getCacheKey();
    const entry = guidebookCache.get(key) ?? {races: [], classes: [], backgrounds: []};
    entry.races = val;
    guidebookCache.set(key, entry);
  }
);

watch(
  () => guidebookStore.classes,
  (val) => {
    if (!storeMatchesCurrentRoom()) return;
    classes.value = val;
    const key = getCacheKey();
    const entry = guidebookCache.get(key) ?? {races: [], classes: [], backgrounds: []};
    entry.classes = val;
    guidebookCache.set(key, entry);
  }
);

watch(
  () => guidebookStore.backgrounds,
  (val) => {
    if (!storeMatchesCurrentRoom()) return;
    backgrounds.value = val;
    const key = getCacheKey();
    const entry = guidebookCache.get(key) ?? {races: [], classes: [], backgrounds: []};
    entry.backgrounds = val;
    guidebookCache.set(key, entry);
  }
);

watch(
  () => guidebookStore.lastUpdatedAt,
  () => {
    if (!storeMatchesCurrentRoom()) return;
    const key = getCacheKey();
    const entry = guidebookCache.get(key) ?? {races: [], classes: [], backgrounds: []};
    entry.races = guidebookStore.races;
    entry.classes = guidebookStore.classes;
    entry.backgrounds = guidebookStore.backgrounds;
    guidebookCache.set(key, entry);

    if (currentSection.value === "races") races.value = guidebookStore.races;
    if (currentSection.value === "classes") classes.value = guidebookStore.classes;
    if (currentSection.value === "backgrounds") backgrounds.value = guidebookStore.backgrounds;
  },
  {flush: "post"}
);

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
  selectedSpellSchool.value = "";
  selectedSpellLevel.value = "";
  loadSpells();
});

function getSpellLevelLabel(level: string): string {
  return level === "0" ? "Фокусы" : `${level} уровень`;
}

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
    {flush: "post"}
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
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.spell_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
}

function getItemName(item: Item) {
  const n = item.name as { rus?: string; eng?: string };
  return n?.rus ?? n?.eng ?? "—";
}

function getSpellName(spell: SpellDto) {
  const n = spell?.name as Record<string, string> | undefined;
  return n?.rus ?? n?.en ?? "—";
}

async function loadNpcs() {
  if (!roomId.value) return;
  npcsLoading.value = true;
  try {
    npcs.value = await getNpcsByRoomIdForRoom(roomId.value, {forceAll: true});
    if (classes.value.length === 0) classes.value = await getClassesForRoom(roomId.value, baseRuleType.value ?? undefined);
    if (races.value.length === 0) races.value = await getRacesForRoom(roomId.value, baseRuleType.value ?? undefined);
  } catch (e) {
    console.error("Failed to load NPCs:", e);
  } finally {
    npcsLoading.value = false;
  }
}

function getNpcImageUrl(imgUrl: string | undefined | null) {
  if (!imgUrl) return "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
}

function getNpcTypeLabel(type: NpcTypeEnum | undefined | null) {
  return type ? (NPC_TYPE_LABELS[type] ?? type) : "";
}

async function loadRoomCharactersIfNeeded() {
  if (roomCharacters.value.length > 0) return;
  if (roomCharactersLoading.value) return;
  if (!roomId.value) return;

  roomCharactersLoading.value = true;
  try {
    const http = axios.create({
      baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
      headers: {
        "Content-type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("accessToken"),
      },
    });

    const res = await http.get(
        GATEWAY_INTEGRATION_ROUTES.api +
        GATEWAY_INTEGRATION_ROUTES.rooms +
        "/" +
        roomId.value +
        GATEWAY_INTEGRATION_ROUTES.characters,
    );

    if (res.status === 200) {
      roomCharacters.value = (res.data ?? []) as Character[];
    } else {
      roomCharacters.value = [];
    }
  } catch (e) {
    console.error("Failed to load room characters:", e);
    roomCharacters.value = [];
  } finally {
    roomCharactersLoading.value = false;
  }
}

function openNpcRelationPopover(npcId: string, event: Event) {
  npcRelationPopoverNpcId.value = npcId;
  npcRelationPopoverEvent.value = event;
  npcRelationPopoverOpen.value = true;

  // Defaults for convenience (user can change in dropdown)
  npcRelationPopoverType.value = "FRIEND";
  npcRelationPopoverCharacterId.value = roomCharacters.value[0]?.id ?? "";

  // Load characters lazily when opening
  void loadRoomCharactersIfNeeded().then(() => {
    if (!npcRelationPopoverCharacterId.value) {
      npcRelationPopoverCharacterId.value = roomCharacters.value[0]?.id ?? "";
    }
  });
}

function dismissNpcRelationPopover() {
  npcRelationPopoverOpen.value = false;
  npcRelationPopoverEvent.value = null;
  npcRelationPopoverNpcId.value = null;
}

async function confirmNpcRelation() {
  if (!roomId.value) return;
  if (!npcRelationPopoverNpcId.value) return;
  if (!npcRelationPopoverCharacterId.value) return;
  if (!npcRelationPopoverType.value) return;

  const characterId = npcRelationPopoverCharacterId.value;
  const npcId = npcRelationPopoverNpcId.value;
  const relationType = npcRelationPopoverType.value as RelationTypeEnum;

  try {
    await saveCharacterNpcRelationForRoom(roomId.value, characterId, {
      characterId,
      npcId,
      relationType,
      note: null,
    });
  } catch (e) {
    console.error("Failed to create NPC relation:", e);
    // No toast right now: just keep it simple.
    return;
  } finally {
    dismissNpcRelationPopover();
  }
}

function goToNpc(npcId: string) {
  ionRouter.push(`/rooms/${roomId.value}/npcs/${npcId}/full`);
}

function goToCreateNpc() {
  ionRouter.push(`/rooms/${roomId.value}/npcs/create`);
}

function goToSection(section: Section) {
  currentSection.value = section;
  void ensureSectionDataLoaded(section);
}

function goBack() {
  currentSection.value = "list";
}

async function ensureSectionDataLoaded(section: Section) {
  // When coming back from create views MasterGuidebookView is remounted.
  // Hydrate lists from store first to instantly reflect new entities.
  hydrateFromStoreIfPossible();

  if (section === "races" && races.value.length === 0) {
    await loadRaces();
  } else if (section === "classes" && classes.value.length === 0) {
    await loadClasses();
  } else if (section === "backgrounds" && backgrounds.value.length === 0) {
    await loadBackgrounds();
  } else if (section === "spells") {
    if (spellClasses.value.length === 0) await loadSpellClassesForRoom();
    if (spells.value.length === 0) await loadSpells();
  } else if (section === "npcs" && npcs.value.length === 0) {
    await loadNpcs();
  }
}

const sectionTitles: Record<string, string> = {
  races: "Расы",
  classes: "Классы",
  backgrounds: "Предыстории",
  items: "Предметы",
  spells: "Заклинания",
  npcs: "NPC"
};

onIonViewDidEnter(async () => {
  guidebookStore.roomId = roomId.value;
  if (!roomStore.room?.id) {
    await roomStore.getRoomInfo(roomId.value);
  }
  if (roomStore.room?.baseRuleType) {
    guidebookStore.baseRuleType = roomStore.room.baseRuleType;
  }
  // Also hydrate local lists from store when returning.
  hydrateFromStoreIfPossible();
  if (currentSection.value !== "list") {
    await ensureSectionDataLoaded(currentSection.value);
  }
});

const createClass = () => {
  const id = roomId.value;
  guidebookStore.roomId = id;
  guidebookStore.baseRuleType = effectiveBaseRuleType.value;
  const s = useCreateClassStore();
  s.roomId = id;
  s.clazz = {} as ClazzDto;
  ionRouter.navigate('/rooms/' + id + '/master/create/clazz', "forward", "push");
};

const createRace = () => {
  const id = roomId.value;
  guidebookStore.roomId = id;
  guidebookStore.baseRuleType = effectiveBaseRuleType.value;
  const s = useCreateRaceStore();
  s.roomId = id;
  s.race = {} as RaceDto;
  ionRouter.navigate('/rooms/' + id + '/master/create/race', "forward", "push");
};

const createBackground = () => {
  const id = roomId.value;
  guidebookStore.roomId = id;
  guidebookStore.baseRuleType = effectiveBaseRuleType.value;
  const s = useCreateBackgroundStore();
  s.roomId = id;
  s.background = {} as BackgroundDto;
  ionRouter.navigate('/rooms/' + id + '/master/create/background', "forward", "push");
};

const createItem = () => {
  const id = roomId.value;
  createInventoryItemStore.clearAll();
  ionRouter.navigate('/rooms/' + id + '/master/create/item', "forward", "push");
};

const addFromCatalogOpen = ref(false);
const catalogPickerKind = ref<"races" | "classes" | "backgrounds">("races");

function openAddFromCatalog(kind: "races" | "classes" | "backgrounds") {
  catalogPickerKind.value = kind;
  addFromCatalogOpen.value = true;
}

function closeAddFromCatalog() {
  addFromCatalogOpen.value = false;
}

async function refreshAfterCatalogAdd(kind: "races" | "classes" | "backgrounds") {
  const key = getCacheKey();
  const entry = guidebookCache.get(key);
  if (entry) {
    if (kind === "races") entry.races = [];
    if (kind === "classes") entry.classes = [];
    if (kind === "backgrounds") entry.backgrounds = [];
  }
  if (kind === "races") {
    races.value = [];
    await loadRaces();
  } else if (kind === "classes") {
    classes.value = [];
    await loadClasses();
  } else {
    await loadBackgrounds({force: true});
  }
}

function mergeCatalogSavedIntoGuidebook(
  kind: "races" | "classes" | "backgrounds",
  saved: RaceDto[] | ClazzDto[] | BackgroundDto[]
) {
  if (!saved.length) return;
  const key = getCacheKey();
  const entry = guidebookCache.get(key) ?? {races: [], classes: [], backgrounds: []};

  if (kind === "races") {
    const map = new Map<string, RaceDto>();
    for (const r of races.value) {
      if (r.code) map.set(r.code, r);
    }
    for (const r of saved as RaceDto[]) {
      if (r.code) map.set(r.code, r);
    }
    races.value = Array.from(map.values());
    guidebookStore.races = races.value;
    entry.races = races.value;
  } else if (kind === "classes") {
    const map = new Map(classes.value.map((c) => [c.code, c] as const));
    for (const c of saved as ClazzDto[]) {
      map.set(c.code, c);
    }
    classes.value = Array.from(map.values());
    guidebookStore.classes = classes.value;
    entry.classes = classes.value;
  } else {
    const map = new Map(backgrounds.value.map((b) => [b.code, b] as const));
    for (const b of saved as BackgroundDto[]) {
      if (b.code) map.set(b.code, b);
    }
    backgrounds.value = Array.from(map.values());
    guidebookStore.backgrounds = backgrounds.value;
    entry.backgrounds = backgrounds.value;
  }

  guidebookCache.set(key, entry);
  guidebookStore.lastUpdatedAt = Date.now();
}

async function onCatalogApplied(
  payload:
    | {kind: "races"; saved: RaceDto[]}
    | {kind: "classes"; saved: ClazzDto[]}
    | {kind: "backgrounds"; saved: BackgroundDto[]}
) {
  await refreshAfterCatalogAdd(payload.kind);
  mergeCatalogSavedIntoGuidebook(payload.kind, payload.saved);
}
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
          <ion-icon :icon="sectionIcons[section.icon]" slot="start" class="section-icon"/>
          <ion-icon :icon="chevronForwardOutline" slot="end"/>
          <ion-label>{{ section.label }}</ion-label>
        </ion-item>
      </ion-list>
    </div>

    <!-- Контент раздела с кнопкой назад -->
    <template v-if="currentSection !== 'list'">
      <div class="section-header">
        <ion-buttons>
          <ion-button fill="clear" @click="goBack">
            <ion-icon :icon="menuOutline"/>
          </ion-button>
        </ion-buttons>
        <h2 class="section-title">{{ sectionTitles[currentSection] }}</h2>
      </div>

      <!-- Расы -->
      <div v-show="currentSection === 'races'" class="segment-content">
        <ion-list v-if="!loading && raceGroups.length" class="guidebook-list">
          <template v-for="group in raceGroups" :key="group.key">
            <ion-item
                v-if="group.root"
                :button="true"
                color="dark"
                @click="goToRace(group.root)"
            >
              <ion-avatar slot="start">
                <img :src="getRaceImageUrl(group.root.imgUrl)" alt=""/>
              </ion-avatar>
              <ion-icon :icon="chevronForwardOutline" slot="end"/>
              <ion-label>{{ group.root.name }}</ion-label>
            </ion-item>

            <ion-item
                v-else-if="group.subs.length"
                :button="true"
                color="dark"
                @click="goToRace(group.subs[0])"
            >
              <ion-avatar slot="start">
                <img :src="getRaceImageUrl(group.subs[0].imgUrl)" alt=""/>
              </ion-avatar>
              <ion-icon :icon="chevronForwardOutline" slot="end"/>
              <ion-label>{{ group.subs[0].name }}</ion-label>
            </ion-item>

            <ion-item
                v-for="sub in group.root ? group.subs : group.subs.slice(1)"
                :key="sub.code + (sub.id ?? '')"
                :button="true"
                color="dark"
                class="group-sub-item"
                @click="goToRace(sub)"
            >
              <ion-avatar slot="start">
                <img :src="getRaceImageUrl(sub.imgUrl)" alt=""/>
              </ion-avatar>
              <ion-icon :icon="chevronForwardOutline" slot="end"/>
              <ion-label>{{ sub.name }}</ion-label>
            </ion-item>
          </template>
        </ion-list>
        <div v-else-if="loading" class="loading-placeholder">Загрузка...</div>
        <div v-else class="empty-placeholder">Нет рас в этой комнате</div>
        <div class="add-new-button">
          <ion-button
            size="large"
            shape="round"
            color="medium"
            title="Из справочника"
            @click="openAddFromCatalog('races')"
          >
            <ion-icon slot="icon-only" :icon="listOutline"/>
          </ion-button>
          <ion-button
            size="large"
            shape="round"
            color="primary"
            title="Создать свою"
            @click="createRace()"
          >
            <ion-icon slot="icon-only" :icon="addOutline"/>
          </ion-button>
        </div>
      </div>

      <!-- Классы -->
      <div v-show="currentSection === 'classes'" class="segment-content">
        <ion-list v-if="!loading && classGroups.length" class="guidebook-list">
          <template v-for="group in classGroups" :key="group.key">
            <ion-item
                v-if="group.root"
                :button="true"
                color="dark"
                @click="goToClass(group.root)"
            >
              <ion-avatar slot="start">
                <img :src="getClassImageUrl(group.root.imgUrl)" alt=""/>
              </ion-avatar>
              <ion-icon :icon="chevronForwardOutline" slot="end"/>
              <ion-label>{{ group.root.name }}</ion-label>
            </ion-item>

            <ion-item
                v-else-if="group.subs.length"
                :button="true"
                color="dark"
                @click="goToClass(group.subs[0])"
            >
              <ion-avatar slot="start">
                <img :src="getClassImageUrl(group.subs[0].imgUrl)" alt=""/>
              </ion-avatar>
              <ion-icon :icon="chevronForwardOutline" slot="end"/>
              <ion-label>{{ group.subs[0].name }}</ion-label>
            </ion-item>

            <ion-item
                v-for="sub in group.root ? group.subs : group.subs.slice(1)"
                :key="sub.code + (sub.id ?? '')"
                :button="true"
                color="dark"
                class="group-sub-item"
                @click="goToClass(sub)"
            >
              <ion-avatar slot="start">
                <img :src="getClassImageUrl(sub.imgUrl)" alt=""/>
              </ion-avatar>
              <ion-icon :icon="chevronForwardOutline" slot="end"/>
              <ion-label>{{ sub.name }}</ion-label>
            </ion-item>
          </template>
        </ion-list>
        <div v-else-if="loading" class="loading-placeholder">Загрузка...</div>
        <div v-else class="empty-placeholder">Нет классов в этой комнате</div>
        <div class="add-new-button">
          <ion-button
              size="large"
              shape="round"
              color="medium"
              title="Из справочника"
              @click="openAddFromCatalog('classes')"
          >
            <ion-icon slot="icon-only" :icon="listOutline"/>
          </ion-button>
          <ion-button
              size="large"
              shape="round"
              color="primary"
              title="Создать свой"
              @click="createClass()"
          >
            <ion-icon slot="icon-only" :icon="addOutline"/>
          </ion-button>
        </div>
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
              <img :src="getBackgroundImageUrl(bg.imgUrl)" alt=""/>
            </ion-avatar>
            <ion-icon :icon="chevronForwardOutline" slot="end"/>
            <ion-label>{{ bg.name }}</ion-label>
          </ion-item>
        </ion-list>
        <div v-else-if="loading" class="loading-placeholder">Загрузка...</div>
        <div v-else class="empty-placeholder">Нет предысторий в этой комнате</div>
        <div class="add-new-button">
          <ion-button
            size="large"
            shape="round"
            color="medium"
            title="Из справочника"
            @click="openAddFromCatalog('backgrounds')"
          >
            <ion-icon slot="icon-only" :icon="listOutline"/>
          </ion-button>
          <ion-button
            size="large"
            shape="round"
            color="primary"
            title="Создать свою"
            @click="createBackground()"
          >
            <ion-icon slot="icon-only" :icon="addOutline"/>
          </ion-button>
        </div>
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
              <img :src="getItemImageUrl(item.imgUrl)" alt=""/>
            </ion-avatar>
            <ion-icon :icon="chevronForwardOutline" slot="end"/>
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
        <div class="add-new-button">
          <ion-button
              size="large"
              shape="round"
              color="primary"
              @click="createItem()"
          >
            <ion-icon slot="icon-only" :icon="addOutline"/>
          </ion-button>
        </div>
      </div>

      <!-- Заклинания -->
      <div v-show="currentSection === 'spells'" class="segment-content">
        <div class="spells-filters">
          <ion-searchbar
              v-model="spellSearchQuery"
              placeholder="Найти заклинание"
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
          <div class="spells-filter-row">
            <IonSelect
                v-model="selectedSpellSchool"
                interface="popover"
                placeholder="Школа"
                aria-label="Фильтр по школе заклинания"
                class="spells-filter-select"
            >
              <IonSelectOption value="">Все школы</IonSelectOption>
              <IonSelectOption
                  v-for="s in availableSpellSchools"
                  :key="s"
                  :value="s"
              >
                {{ s }}
              </IonSelectOption>
            </IonSelect>
            <IonSelect
                v-model="selectedSpellLevel"
                interface="popover"
                placeholder="Уровень"
                aria-label="Фильтр по уровню заклинания"
                class="spells-filter-select"
            >
              <IonSelectOption value="">Все уровни</IonSelectOption>
              <IonSelectOption
                  v-for="lvl in availableSpellLevels"
                  :key="lvl"
                  :value="lvl"
              >
                {{ getSpellLevelLabel(lvl) }}
              </IonSelectOption>
            </IonSelect>
          </div>
        </div>
        <div v-if="!loading && filteredSpells.length" class="spells-content">
          <div v-for="[level, levelSpells] in spellsByLevel" :key="level" class="spell-level-group">
            <div class="spell-level-label">{{ getSpellLevelLabel(level) }}</div>
            <ion-list class="guidebook-list">
              <ion-item
                  v-for="spell in levelSpells"
                  :key="spell.id"
                  :button="true"
                  color="dark"
                  @click="openSpellModal(spell)"
              >
                <ion-avatar slot="start">
                  <img :src="getSpellImageUrl(spell.imgUrl)" alt=""/>
                </ion-avatar>
                <ion-icon :icon="chevronForwardOutline" slot="end"/>
                <ion-label>
                  <h3>{{ getSpellName(spell) }}</h3>
                  <p class="spell-school">{{ spell.school }} <span v-if="spell.damageType">— {{
                      spell.damageType
                    }}</span></p>
                </ion-label>
              </ion-item>
            </ion-list>
          </div>
        </div>
        <div v-else-if="loading" class="loading-placeholder">Загрузка...</div>
        <div v-else-if="spells.length" class="empty-placeholder">Заклинания не найдены</div>
        <div v-else class="empty-placeholder">Нет заклинаний</div>
      </div>

      <!-- NPC -->
      <div v-show="currentSection === 'npcs'" class="segment-content npcs-section">
        <div class="npcs-filters">
          <IonSelect
              interface="popover"
              placeholder="Тип"
              :value="npcFilterType"
              @ionChange="npcFilterType = ($event as CustomEvent).detail.value"
          >
            <IonSelectOption value="">Все</IonSelectOption>
            <IonSelectOption v-for="(label, type) in NPC_TYPE_LABELS" :key="type" :value="type">
              {{ label }}
            </IonSelectOption>
          </IonSelect>
          <IonSelect
              interface="popover"
              placeholder="Класс"
              :value="npcFilterClass"
              @ionChange="npcFilterClass = ($event as CustomEvent).detail.value"
          >
            <IonSelectOption value="">Все</IonSelectOption>
            <IonSelectOption v-for="opt in npcClassOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </IonSelectOption>
          </IonSelect>
          <IonSelect
              interface="popover"
              placeholder="Раса"
              :value="npcFilterRace"
              @ionChange="npcFilterRace = ($event as CustomEvent).detail.value"
          >
            <IonSelectOption value="">Все</IonSelectOption>
            <IonSelectOption v-for="opt in npcRaceOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </IonSelectOption>
          </IonSelect>
        </div>
        <ion-list v-if="!npcsLoading && filteredNpcs.length" class="guidebook-list">
          <ion-item
              v-for="npc in filteredNpcs"
              :key="npc.id"
              :button="true"
              color="dark"
              @click="goToNpc(npc.id)"
          >
            <div class="npc-avatar-wrap" slot="start">
              <ion-avatar>
                <img :src="getNpcImageUrl(npc.imgUrl)" :alt="npc.name"/>
              </ion-avatar>
              <div v-if="npc.unique" class="npc-unique-badge" title="Уникальный">
                <ion-icon :icon="sparkles"/>
              </div>
            </div>
            <div class="npc-end-actions" slot="end">
              <ion-button
                  fill="clear"
                  size="small"
                  color="primary"
                  @click.stop="openNpcRelationPopover(npc.id, $event)"
              >
                <ion-icon :icon="personOutline"/>
              </ion-button>
              <ion-icon :icon="chevronForwardOutline"/>
            </div>
            <ion-label>
              <h3>{{ npc.name }}</h3>
              <p class="npc-info">
                {{ getNpcTypeLabel(npc.type) }}
                <span v-if="npc.clazzInfo?.name || npc.clazzCode"> • {{ npc.clazzInfo?.name || npc.clazzCode }}</span>
                <span v-if="npc.raceInfo?.name || npc.raceCode"> • {{ npc.raceInfo?.name || npc.raceCode }}</span>
              </p>
            </ion-label>
          </ion-item>
        </ion-list>
        <div v-else-if="npcsLoading" class="loading-placeholder">Загрузка...</div>
        <div v-else class="empty-placeholder">Нет NPC</div>
        <ion-button fill="solid" color="primary" shape="round" class="add-npc-fab" @click="goToCreateNpc">
          <ion-icon :icon="add"/>
        </ion-button>
      </div>

      <ion-popover
          :is-open="npcRelationPopoverOpen"
          :event="npcRelationPopoverEvent"
          @didDismiss="dismissNpcRelationPopover"
      >
        <div class="npc-relation-popover">
          <div class="npc-relation-title">Связать с персонажем</div>

          <div v-if="roomCharactersLoading" class="npc-relation-loading">
            <ion-spinner name="crescent"/>
            <div class="npc-relation-loading-text">Загрузка...</div>
          </div>

          <div v-else>
            <div class="npc-relation-field">
              <div class="npc-relation-label">Персонаж</div>
              <select v-model="npcRelationPopoverCharacterId" class="npc-relation-select">
                <option value="">— Выберите персонажа —</option>
                <option v-for="ch in roomCharacters" :key="ch.id" :value="ch.id">
                  {{ ch.name }}
                </option>
              </select>
            </div>

            <div class="npc-relation-field">
              <div class="npc-relation-label">Тип связи</div>
              <select v-model="npcRelationPopoverType" class="npc-relation-select">
                <option value="">— Выберите тип —</option>
                <option v-for="opt in relationTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div class="npc-relation-actions">
              <ion-button fill="clear" size="small" @click="dismissNpcRelationPopover">Отмена</ion-button>
              <ion-button
                  fill="solid"
                  size="small"
                  color="primary"
                  :disabled="!npcRelationPopoverCharacterId || !npcRelationPopoverType"
                  @click="confirmNpcRelation"
              >
                Создать связь
              </ion-button>
            </div>
          </div>
        </div>
      </ion-popover>
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
    <MasterGuidebookAddFromCatalogModal
        :is-open="addFromCatalogOpen"
        :kind="catalogPickerKind"
        :room-id="roomId"
        :base-rule-type="baseRuleType"
        @close="closeAddFromCatalog"
        @applied="onCatalogApplied"
    />
  </div>
</template>

<style scoped>
.spell-school {
  color: var(--ion-color-secondary);
}

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

.spells-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 0 4px 4px;
}

.spells-filter-row .spells-filter-select {
  flex: 1;
  min-width: 120px;
  --padding-start: 12px;
  --padding-end: 12px;
  background: var(--ion-color-medium);
  border-radius: 8px;
  color: var(--ion-color-light);
  font-size: 14px;
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

.npcs-section {
  padding-bottom: 80px;
}

.add-npc-fab {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 56px;
  height: 56px;
  --border-radius: 50%;
  --padding-start: 0;
  --padding-end: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.npcs-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.npcs-filters ion-select {
  flex: 1;
  min-width: 100px;
  --padding-start: 12px;
  --padding-end: 12px;
  background: var(--ion-color-medium);
  border-radius: 8px;
}

.npc-info {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin-top: 2px;
}

.npc-avatar-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-right: 12px;
}

.npc-avatar-wrap ion-avatar {
  width: 40px;
  height: 40px;
}

.npc-avatar-wrap .npc-unique-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd700, #ffb347);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  color: #5c3d00;
  font-size: 11px;
}

.npc-avatar-wrap .npc-unique-badge ion-icon {
  font-size: 12px;
}

.npc-end-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.npc-end-actions ion-icon {
  font-size: 18px;
}

.npc-relation-popover {
  padding: 12px 16px;
  min-width: 240px;
  background-color: var(--ion-color-dark);
  border-radius: 12px;
}

.npc-relation-title {
  color: var(--ion-color-light);
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}

.npc-relation-loading {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding: 10px 0;
}

.npc-relation-loading-text {
  color: var(--ion-color-medium);
  font-size: 12px;
}

.npc-relation-field {
  margin-bottom: 10px;
}

.npc-relation-label {
  color: var(--ion-color-light);
  font-size: 12px;
  margin-bottom: 6px;
}

.npc-relation-select {
  width: 100%;
  background: var(--ion-color-medium);
  color: var(--ion-color-light);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.npc-relation-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

.group-sub-item {
  padding-left: 18px;
}


.add-new-button {
  z-index: 10;
  position: fixed;
  bottom: 0;
  right: 20px;
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 8px 0 max(8px, env(safe-area-inset-bottom, 0));
}

</style>
