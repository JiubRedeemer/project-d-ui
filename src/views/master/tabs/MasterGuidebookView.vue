<script setup lang="ts">
import {
  defineProps,
  IonAvatar,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPopover,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  onIonViewDidEnter,
  useIonRouter
} from "@ionic/vue";
import {
  add,
  addOutline,
  alertCircleOutline,
  bookOutline,
  chevronForwardOutline,
  closeOutline,
  cubeOutline,
  filterOutline,
  documentTextOutline,
  eyeOffOutline,
  eyeOutline,
  listOutline,
  menuOutline,
  peopleOutline,
  personOutline,
  searchOutline,
  sparkles,
  sparklesOutline,
  layersOutline
} from "ionicons/icons";
import {computed, onMounted, ref, shallowRef, watch, withDefaults} from "vue";
import {useRoute} from "vue-router";
import {
  getBackgroundsForRoom,
  getClassesForRoom,
  getRacesForRoom,
  setBackgroundHidden,
  setClassHidden,
  setRaceHidden
} from "@/api/rulebookApi";
import type {BackgroundDto, ClazzDto, RaceDto} from "@/api/rulebookApi.types";
import {Item, type ItemBundle} from "@/components/models/response/InventoryResponse";
import {getBundlesForRoom} from "@/api/bundleApi";
import type {SpellDto} from "@/components/models/response/MagicApi";
import {listSpells, listSpellsDnd2024} from "@/api/magicApi";
import {getAllNpcNpcRelationsForRoom, getAllNpcRelationsForRoom, getNpcsByRoomIdForRoom, saveCharacterNpcRelationForRoom, saveNpcForRoom} from "@/api/npcApi";
import type {CharacterNpcRelationDto, NpcDto, NpcNpcRelationDto, NpcTypeEnum, RelationTypeEnum} from "@/api/npcApi.types";
import {getStatesForRoom} from "@/api/statesApi";
import type {StateDto} from "@/api/statesApi.types";
import {sortNpcsByName} from "@/utils/sortNpcsByName";
import {getTagsForRoom, type ItemTagDto} from "@/api/itemTagApi";
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
import MasterGuidebookStateModal from "@/views/master/modals/MasterGuidebookStateModal.vue";
import MasterBundlesView from "@/views/master/tabs/MasterBundlesView.vue";
import {useGuidebookStore} from "@/stores/GuidebookStore";

const route = useRoute();
const ionRouter = useIonRouter();
const roomStore = useRoomStore();
const fullRaceStore = useFullRaceStore();
const fullClassStore = useFullClassStore();
const fullBackgroundStore = useFullBackgroundStore();
const guidebookStore = useGuidebookStore();
const createInventoryItemStore = useCreateInventoryItemStore();

type Section = "list" | "races" | "classes" | "backgrounds" | "items" | "spells" | "npcs" | "states" | "bundles";
const props = withDefaults(defineProps<{ lockedSection?: Section | null; externalSearchQuery?: string }>(), {
  lockedSection: null,
  externalSearchQuery: ""
});
const currentSection = ref<Section>("list");
const isLockedSection = computed(() => props.lockedSection !== null);

watch(
    () => props.lockedSection,
    (section) => {
      currentSection.value = section ?? "list";
    },
    {immediate: true}
);

const SECTIONS: { id: Section; label: string; icon: string; description: string; accent: string }[] = [
  {id: "races", label: "Расы", icon: "peopleOutline", description: "Расы и их подвиды", accent: "197, 0, 15"},
  {id: "classes", label: "Классы", icon: "bookOutline", description: "Классы и архетипы", accent: "255, 196, 9"},
  {id: "backgrounds", label: "Предыстории", icon: "documentTextOutline", description: "Происхождение героев", accent: "208, 188, 254"},
  {id: "items", label: "Предметы", icon: "cubeOutline", description: "Снаряжение и артефакты", accent: "149, 115, 253"},
  {id: "spells", label: "Заклинания", icon: "sparklesOutline", description: "Магия по уровням", accent: "85, 191, 255"},
  {id: "npcs", label: "NPC", icon: "personOutline", description: "Персонажи мира", accent: "45, 213, 91"},
  {id: "states", label: "Состояния", icon: "alertCircleOutline", description: "Состояния персонажей", accent: "208, 188, 254"},
  {id: "bundles", label: "Наборы", icon: "layersOutline", description: "Наборы предметов", accent: "45, 213, 91"}
];

const sectionIcons: Record<string, unknown> = {
  peopleOutline,
  personOutline,
  bookOutline,
  documentTextOutline,
  cubeOutline,
  sparklesOutline,
  alertCircleOutline,
  layersOutline
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
const spells = shallowRef<SpellDto[]>([]);
const loadedSpellKey = ref<string | null>(null);
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
const itemTagFilter = ref<Set<string>>(new Set());
const itemTypeFilter = ref<string>("");
const itemSubtypeFilter = ref<string>("");
const itemRarityFilter = ref<string>("");
const itemCustomizationFilter = ref<"" | "true" | "false">("");
const itemVisibleFilter = ref<"" | "true" | "false">("");
const itemHasSkillsFilter = ref<"" | "true" | "false">("");
const itemBundleFilter = ref<string>("");
const availableBundles = ref<ItemBundle[]>([]);
const showItemFiltersModal = ref(false);
const availableItemTags = ref<ItemTagDto[]>([]);
const shownTagInfo = ref<ItemTagDto | null>(null);
function toggleTagInfo(tag: ItemTagDto) {
  shownTagInfo.value = shownTagInfo.value?.id === tag.id ? null : tag;
}

const RARITY_ORDER = ["COMMON", "UNCOMMON", "RARE", "VERY_RARE", "LEGENDARY"];
const RARITY_LABELS: Record<string, string> = {
  COMMON: "Обычная",
  UNCOMMON: "Необычная",
  RARE: "Редкая",
  VERY_RARE: "Очень редкая",
  LEGENDARY: "Легендарная",
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

const allItemTags = computed(() => availableItemTags.value);
const allBundles = computed(() => availableBundles.value);
const selectedBundleName = computed(
  () => availableBundles.value.find((b) => b.id === itemBundleFilter.value)?.name ?? itemBundleFilter.value
);

const itemActiveFiltersCount = computed(() => {
  let c = 0;
  if (itemTypeFilter.value) c++;
  if (itemSubtypeFilter.value) c++;
  if (itemRarityFilter.value) c++;
  if (itemCustomizationFilter.value !== "") c++;
  if (itemVisibleFilter.value !== "") c++;
  if (itemHasSkillsFilter.value !== "") c++;
  if (itemTagFilter.value.size > 0) c++;
  if (itemBundleFilter.value) c++;
  return c;
});

const filteredItems = computed(() => items.value);

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
  itemVisibleFilter.value = "";
  itemHasSkillsFilter.value = "";
  itemTagFilter.value = new Set();
  itemBundleFilter.value = "";
}

watch(itemTypeFilter, () => { itemSubtypeFilter.value = ""; searchItems(true); });
watch(itemSubtypeFilter, () => { searchItems(true); });
watch(itemRarityFilter, () => { searchItems(true); });
watch(itemCustomizationFilter, () => { searchItems(true); });
watch(itemVisibleFilter, () => { searchItems(true); });
watch(itemHasSkillsFilter, () => { searchItems(true); });
watch(itemBundleFilter, () => { searchItems(true); });
watch(itemTagFilter, () => { searchItems(true); }, { deep: true });

async function loadItemTags() {
  try {
    availableItemTags.value = await getTagsForRoom(String(roomId.value));
  } catch (e) {
    console.error("Failed to load item tags", e);
  }
}

async function loadRoomBundles() {
  try {
    const bundles = await getBundlesForRoom(String(roomId.value));
    // Только наборы, подключённые в комнате.
    availableBundles.value = bundles.filter((b) => b.enabled);
  } catch (e) {
    console.error("Failed to load room bundles", e);
  }
}

const selectedItem = ref<Item | null>(null);
const showItemModal = ref(false);
const selectedSpell = ref<SpellDto | null>(null);
const showSpellModal = ref(false);

type SpellCatalog = "DND5E" | "DND2024";
const selectedSpellCatalog = ref<SpellCatalog>("DND5E");

const npcs = ref<NpcDto[]>([]);
const npcsLoading = ref(false);
const npcRelations = ref<CharacterNpcRelationDto[]>([]);
const npcNpcRelationsAll = ref<NpcNpcRelationDto[]>([]);

const RELATION_LABELS: Record<RelationTypeEnum, string> = {
  FRIEND: "Друг",
  ENEMY: "Враг",
  RULER: "Правитель",
  PET: "Питомец",
  OTHER: "Другое",
};
const RELATION_COLORS: Record<RelationTypeEnum, { bg: string; border: string; text: string }> = {
  FRIEND:  { bg: "rgba(45,213,91,0.12)",   border: "rgba(45,213,91,0.4)",   text: "rgb(45,213,91)" },
  ENEMY:   { bg: "rgba(235,68,90,0.12)",   border: "rgba(235,68,90,0.4)",   text: "rgb(235,68,90)" },
  RULER:   { bg: "rgba(255,196,9,0.12)",   border: "rgba(255,196,9,0.4)",   text: "rgb(255,196,9)" },
  PET:     { bg: "rgba(85,191,255,0.12)",  border: "rgba(85,191,255,0.4)",  text: "rgb(85,191,255)" },
  OTHER:   { bg: "rgba(208,188,254,0.12)", border: "rgba(208,188,254,0.4)", text: "rgb(208,188,254)" },
};

const npcRelationsMap = computed(() => {
  const map = new Map<string, Array<{ characterName: string; relationType: RelationTypeEnum; label: string; colors: { bg: string; border: string; text: string } }>>();
  const charMap = new Map<string, string>(roomCharacters.value.map((c) => [c.id, c.name ?? c.id] as [string, string]));
  for (const rel of npcRelations.value) {
    if (!rel.npcId || !rel.relationType) continue;
    if (!map.has(rel.npcId)) map.set(rel.npcId, []);
    map.get(rel.npcId)!.push({
      characterName: rel.characterId ? (charMap.get(rel.characterId) ?? "Персонаж") : "Персонаж",
      relationType: rel.relationType,
      label: RELATION_LABELS[rel.relationType] ?? rel.relationType,
      colors: RELATION_COLORS[rel.relationType],
    });
  }
  return map;
});

const npcNpcRelationsMap = computed(() => {
  const map = new Map<string, Array<{ otherNpcName: string; relationType: RelationTypeEnum; label: string; colors: { bg: string; border: string; text: string } }>>();
  const npcNameMap = new Map<string, string>(npcs.value.map((n) => [n.id, n.name] as [string, string]));
  for (const rel of npcNpcRelationsAll.value) {
    if (!rel.relationType) continue;
    const colors = RELATION_COLORS[rel.relationType];
    const label = RELATION_LABELS[rel.relationType] ?? rel.relationType;
    for (const [npcId, otherId] of [[rel.fromNpcId, rel.toNpcId], [rel.toNpcId, rel.fromNpcId]] as [string, string][]) {
      if (!map.has(npcId)) map.set(npcId, []);
      map.get(npcId)!.push({ otherNpcName: npcNameMap.get(otherId) ?? "NPC", relationType: rel.relationType, label, colors });
    }
  }
  return map;
});

const states = ref<StateDto[]>([]);
const statesLoading = ref(false);
const selectedState = ref<StateDto | null>(null);
const showStateModal = ref(false);
const npcFilterType = ref<NpcTypeEnum | "">("");
const npcFilterClass = ref<string>("");
const npcFilterRace = ref<string>("");
const npcFilterCharacterId = ref<string>("");
const npcFilterUnique = ref<boolean | null>(null);
const npcSearch = ref<string>("");
const npcTagFilter = ref<Set<string>>(new Set());
const npcTagInput = ref<string>("");
const npcTagInputNpcId = ref<string | null>(null);
const showNpcFiltersModal = ref(false);

const roomCharacters = ref<Character[]>([]);
const roomCharactersLoading = ref(false);

// Popover: добавление связи между выбранным NPC и персонажем комнаты
const npcRelationPopoverOpen = ref(false);
const npcRelationPopoverEvent = ref<Event | null>(null);
const npcRelationPopoverNpcId = ref<string | null>(null);
const npcRelationPopoverCharacterId = ref<string>("");
const npcRelationPopoverType = ref<RelationTypeEnum | "">("");
const npcRelationPopoverNote = ref<string>("");

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

const roomSpellCatalogDefault = computed<SpellCatalog>(() =>
    baseRuleType.value === "DND2024" ? "DND2024" : "DND5E"
);

const orderedSpellCatalogs = computed<SpellCatalog[]>(() =>
    roomSpellCatalogDefault.value === "DND2024"
        ? ["DND2024", "DND5E"]
        : ["DND5E", "DND2024"]
);

function getSpellCatalogLabel(catalog: SpellCatalog): string {
  return catalog === "DND2024" ? "2024" : "2014";
}

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

// Инвалидация кэша справочника при изменении наборов правил (вкл/выкл бандла или элемента).
watch(
    () => guidebookStore.lastUpdatedAt,
    () => {
      guidebookCache.clear();
      races.value = [];
      classes.value = [];
      backgrounds.value = [];
      if (currentSection.value !== "list") {
        void ensureSectionDataLoaded(currentSection.value);
      }
    }
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
  const normalize = (value: string | null | undefined) => (value ?? "").trim();

  for (const race of races.value) {
    const code = normalize(race.code);
    const speciesCode = normalize(race.speciesCode);
    const imgUrl = normalize(race.imgUrl);
    const rootCode = speciesCode || code;
    if (!rootCode) continue;
    const isDeclaredRoot = speciesCode.length === 0 || speciesCode === code;
    // Fallback for backend payloads where code is UUID and speciesCode is catalog key (e.g. ELF),
    // while root entity still has species image code equal to speciesCode.
    const isSpeciesImageRoot = speciesCode.length > 0 && imgUrl === speciesCode;
    const isRoot = isDeclaredRoot || isSpeciesImageRoot;

    const group = groupsByRootCode.get(rootCode) ?? {root: null, subs: [] as RaceDto[]};
    if (!groupsByRootCode.has(rootCode)) {
      groupsByRootCode.set(rootCode, group);
    }
    if (isRoot) {
      if (!group.root) {
        group.root = race;
      } else {
        group.subs.push(race);
      }
    } else {
      group.subs.push(race);
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

const normalizedExternalSearchQuery = computed(() => props.externalSearchQuery.trim().toLowerCase());
const filteredRaceGroups = computed<RaceGroup[]>(() => {
  const q = normalizedExternalSearchQuery.value;
  if (!q || currentSection.value !== "races") return raceGroups.value;
  return raceGroups.value
      .map((group) => {
        const rootMatches = group.root?.name?.toLowerCase().includes(q) ?? false;
        const subs = group.subs.filter((sub) => sub.name?.toLowerCase().includes(q));
        if (rootMatches) return group;
        if (!rootMatches && !subs.length) return null;
        return {...group, root: null, subs};
      })
      .filter((g): g is RaceGroup => Boolean(g));
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

const filteredClassGroups = computed<ClassGroup[]>(() => {
  const q = normalizedExternalSearchQuery.value;
  if (!q || currentSection.value !== "classes") return classGroups.value;
  return classGroups.value
      .map((group) => {
        const rootMatches = group.root?.name?.toLowerCase().includes(q) ?? false;
        const subs = group.subs.filter((sub) => sub.name?.toLowerCase().includes(q));
        if (rootMatches) return group;
        if (!rootMatches && !subs.length) return null;
        return {...group, root: null, subs};
      })
      .filter((g): g is ClassGroup => Boolean(g));
});

const filteredBackgrounds = computed(() => {
  const q = normalizedExternalSearchQuery.value;
  if (!q || currentSection.value !== "backgrounds") return backgrounds.value;
  return backgrounds.value.filter((bg) => (bg.name ?? "").toLowerCase().includes(q));
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
const allNpcTags = computed(() => {
  const set = new Set<string>();
  for (const npc of npcs.value) {
    for (const tag of npc.tags ?? []) set.add(tag);
  }
  return Array.from(set).sort();
});

const filteredNpcs = computed(() => {
  let result = npcs.value;
  if (npcFilterType.value) result = result.filter((n) => n.type === npcFilterType.value);
  if (npcFilterClass.value) result = result.filter((n) => n.clazzCode === npcFilterClass.value);
  if (npcFilterRace.value) result = result.filter((n) => n.raceCode === npcFilterRace.value);
  if (npcFilterUnique.value !== null) result = result.filter((n) => (n.unique ?? false) === npcFilterUnique.value);
  if (npcFilterCharacterId.value) {
    const charId = npcFilterCharacterId.value;
    const npcIdsWithChar = new Set(
      npcRelations.value.filter((r) => r.characterId === charId).map((r) => r.npcId)
    );
    result = result.filter((n) => npcIdsWithChar.has(n.id));
  }
  if (npcTagFilter.value.size > 0) {
    result = result.filter((n) =>
      [...npcTagFilter.value].every((t) => (n.tags ?? []).includes(t))
    );
  }
  const q = npcSearch.value.trim().toLowerCase() || normalizedExternalSearchQuery.value;
  if (q && currentSection.value === "npcs") {
    result = result.filter((n) =>
      (n.name ?? "").toLowerCase().includes(q) ||
      (n.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  }
  return sortNpcsByName(result);
});

const npcActiveFiltersCount = computed(() => {
  let count = 0;
  if (npcFilterType.value) count++;
  if (npcFilterClass.value) count++;
  if (npcFilterRace.value) count++;
  if (npcFilterCharacterId.value) count++;
  if (npcFilterUnique.value !== null) count++;
  if (npcTagFilter.value.size > 0) count++;
  return count;
});

function resetNpcFilters() {
  npcFilterType.value = "";
  npcFilterClass.value = "";
  npcFilterRace.value = "";
  npcFilterCharacterId.value = "";
  npcFilterUnique.value = null;
  npcTagFilter.value = new Set();
}

const filteredStates = computed(() => {
  const q = normalizedExternalSearchQuery.value;
  if (!q || currentSection.value !== "states") return states.value;
  return states.value.filter(
      (s) => (s.name ?? "").toLowerCase().includes(q) || (s.code ?? "").toLowerCase().includes(q)
  );
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

interface SpellRow {
  id: string;
  name: string;
  line1: string;
  imgUrl: string;
  raw: SpellDto;
}

const spellsByLevel = computed(() => {
  const byLevel = new Map<string, SpellRow[]>();
  for (const spell of filteredSpells.value) {
    const level = spell.level ?? "0";
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push({
      id: spell.id ?? "",
      name: getSpellName(spell),
      line1: [spell.school, spell.damageType].filter(Boolean).join(" — "),
      imgUrl: getSpellImageUrl(spell.imgUrl),
      raw: spell,
    });
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

async function loadBackgrounds(options?: { force?: boolean }) {
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
    const requestBody: Record<string, unknown> = {
      searchQuery: q,
      limit: ITEMS_PAGE_LIMIT,
      lastSeenCreatedAt,
      lastSeenId
    };
    if (itemTypeFilter.value) requestBody.type = itemTypeFilter.value;
    if (itemSubtypeFilter.value) requestBody.subtype = itemSubtypeFilter.value;
    if (itemRarityFilter.value) requestBody.rarity = itemRarityFilter.value;
    if (itemTagFilter.value.size > 0) requestBody.tags = [...itemTagFilter.value];
    if (itemCustomizationFilter.value !== "") requestBody.customization = itemCustomizationFilter.value === "true";
    if (itemHasSkillsFilter.value !== "") requestBody.hasSkills = itemHasSkillsFilter.value === "true";
    if (itemBundleFilter.value) requestBody.itemBundleId = itemBundleFilter.value;

    const {data} = await axios.post<Item[]>(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId.value}${GATEWAY_INTEGRATION_ROUTES.items}${GATEWAY_INTEGRATION_ROUTES.search}`,
        requestBody,
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

async function deleteItemFromModal() {
  const item = selectedItem.value;
  if (!item) return;
  try {
    await axios.delete(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId.value}${GATEWAY_INTEGRATION_ROUTES.items}/${item.id}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
    );
    items.value = items.value.filter(i => i.id !== item.id);
    closeItemModal();
  } catch (e) {
    console.error("Ошибка при удалении предмета:", e);
  }
}

function editItemFromModal() {
  const item = selectedItem.value;
  if (!item) return;
  showItemModal.value = false;
  createInventoryItemStore.clearAll();
  createInventoryItemStore.item = { ...item };
  if (item.creatorId) {
    createInventoryItemStore.keepExistingId = true;
  }
  ionRouter.navigate('/rooms/' + roomId.value + '/master/create/item', "forward", "push");
}

function openSpellModal(spell: SpellDto) {
  selectedSpell.value = spell;
  showSpellModal.value = true;
}

function closeSpellModal() {
  showSpellModal.value = false;
  selectedSpell.value = null;
}

function getSpellCacheKey() {
  return `${selectedSpellCatalog.value}:${selectedSpellClass.value}`;
}

async function loadSpells() {
  const key = getSpellCacheKey();
  if (spells.value.length > 0 && loadedSpellKey.value === key) return;
  loading.value = true;
  try {
    const spellClass =
        selectedSpellClass.value === "ALL" ? undefined : (selectedSpellClass.value as string);
    const rootSpellClass =
        spellClass != null
            ? (spellClasses.value.find((c) => c.value === spellClass)?.groupCode ?? undefined)
            : undefined;
    if (selectedSpellCatalog.value === "DND2024") {
      spells.value = await listSpellsDnd2024(spellClass);
    } else {
      spells.value = await listSpells(spellClass, rootSpellClass ?? undefined);
    }
    loadedSpellKey.value = key;
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

watch([selectedSpellClass, selectedSpellCatalog], () => {
  selectedSpellSchool.value = "";
  selectedSpellLevel.value = "";
  loadedSpellKey.value = null;
  loadSpells();
});

watch(
    () => props.externalSearchQuery,
    (q) => {
      const normalized = q.trim();
      if (currentSection.value === "items" && itemSearchQuery.value !== normalized) {
        itemSearchQuery.value = normalized;
      }
      if (currentSection.value === "spells" && spellSearchQuery.value !== normalized) {
        spellSearchQuery.value = normalized;
      }
    },
    {immediate: true}
);

function getSpellLevelLabel(level: string): string {
  return level === "0" ? "Фокусы" : `${level} уровень`;
}

watch(
    itemSearchQuery,
    (q) => {
      if (itemSearchTimeout) clearTimeout(itemSearchTimeout);
      const value = q.trim();
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

function isHidden(entity: { hidden?: boolean } | null | undefined): boolean {
  return entity?.hidden === true;
}

async function toggleRaceHidden(race: RaceDto) {
  if (!race.id) {
    alert("Невозможно изменить скрытие: отсутствует id расы.");
    return;
  }
  try {
    const saved = await setRaceHidden(race.id, !isHidden(race));
    races.value = races.value.map((r) => (r.id === saved.id || r.code === saved.code ? saved : r));
    guidebookStore.races = races.value;
    guidebookStore.lastUpdatedAt = Date.now();
  } catch (e) {
    console.error("Failed to toggle race hidden:", e);
    alert("Не удалось изменить видимость расы.");
  }
}

async function toggleClassHidden(clazz: ClazzDto) {
  if (!clazz.id) {
    alert("Невозможно изменить скрытие: отсутствует id класса.");
    return;
  }
  try {
    const saved = await setClassHidden(clazz.id, !isHidden(clazz));
    classes.value = classes.value.map((c) => (c.id === saved.id || c.code === saved.code ? saved : c));
    guidebookStore.classes = classes.value;
    guidebookStore.lastUpdatedAt = Date.now();
  } catch (e) {
    console.error("Failed to toggle class hidden:", e);
    alert("Не удалось изменить видимость класса.");
  }
}

async function toggleBackgroundHidden(bg: BackgroundDto) {
  if (!bg.id) {
    alert("Невозможно изменить скрытие: отсутствует id предыстории.");
    return;
  }
  try {
    const saved = await setBackgroundHidden(bg.id, !isHidden(bg));
    backgrounds.value = backgrounds.value.map((b) => (b.id === saved.id || b.code === saved.code ? saved : b));
    guidebookStore.backgrounds = backgrounds.value;
    guidebookStore.lastUpdatedAt = Date.now();
  } catch (e) {
    console.error("Failed to toggle background hidden:", e);
    alert("Не удалось изменить видимость предыстории.");
  }
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
    const [loadedNpcs, loadedRelations] = await Promise.all([
      getNpcsByRoomIdForRoom(roomId.value, {forceAll: true}),
      getAllNpcRelationsForRoom(roomId.value),
    ]);
    npcs.value = loadedNpcs;
    npcRelations.value = loadedRelations;
    const npcIds = loadedNpcs.map((n) => n.id);
    npcNpcRelationsAll.value = await getAllNpcNpcRelationsForRoom(roomId.value, npcIds);
    if (classes.value.length === 0) classes.value = await getClassesForRoom(roomId.value, baseRuleType.value ?? undefined);
    if (races.value.length === 0) races.value = await getRacesForRoom(roomId.value, baseRuleType.value ?? undefined);
    // Load characters for chip name resolution if not yet loaded
    if (roomCharacters.value.length === 0) void loadRoomCharactersIfNeeded();
  } catch (e) {
    console.error("Failed to load NPCs:", e);
  } finally {
    npcsLoading.value = false;
  }
}

function openStateModal(state: StateDto) {
  selectedState.value = state;
  showStateModal.value = true;
}

function closeStateModal() {
  showStateModal.value = false;
  selectedState.value = null;
}

async function loadStates() {
  if (!roomId.value) return;
  statesLoading.value = true;
  try {
    states.value = await getStatesForRoom(roomId.value);
  } catch (e) {
    console.error("Failed to load states:", e);
  } finally {
    statesLoading.value = false;
  }
}

function getNpcImageUrl(imgUrl: string | undefined | null) {
  if (!imgUrl) return "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
}

function getNpcTypeLabel(type: NpcTypeEnum | undefined | null) {
  return type ? (NPC_TYPE_LABELS[type] ?? type) : "";
}

const NPC_TYPE_ABBR: Record<NpcTypeEnum, string> = {
  RATIONAL: "Разумное",
  BEAST: "Животное",
  MONSTER: "Монстр",
  DEITY: "Божество",
  UNDEAD: "Нежить",
};

function getNpcTypeAbbr(type: NpcTypeEnum | undefined | null) {
  return type ? (NPC_TYPE_ABBR[type] ?? "?") : "?";
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
  npcRelationPopoverNote.value = "";
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
      note: npcRelationPopoverNote.value || null,
    });
  } catch (e) {
    console.error("Failed to create NPC relation:", e);
    // No toast right now: just keep it simple.
    return;
  } finally {
    dismissNpcRelationPopover();
  }
}

function toggleTagFilter(tag: string) {
  const next = new Set(npcTagFilter.value);
  if (next.has(tag)) next.delete(tag); else next.add(tag);
  npcTagFilter.value = next;
}

function openTagInput(npcId: string) {
  npcTagInputNpcId.value = npcId;
  npcTagInput.value = "";
}

async function addTagToNpc(npc: NpcDto) {
  const tag = npcTagInput.value.trim().toLowerCase();
  npcTagInputNpcId.value = null;
  npcTagInput.value = "";
  if (!tag || !roomId.value) return;
  const currentTags = npc.tags ?? [];
  if (currentTags.includes(tag)) return;
  const newTags = [...currentTags, tag];
  try {
    const saved = await saveNpcForRoom(roomId.value, {
      id: npc.id,
      roomId: roomId.value,
      name: npc.name,
      description: npc.description,
      type: npc.type,
      visible: npc.visible,
      unique: npc.unique,
      clazzCode: npc.clazzCode,
      raceCode: npc.raceCode,
      armoryClass: npc.armoryClass,
      speed: npc.speed,
      initiative: npc.initiative,
      imgUrl: npc.imgUrl,
      createdBy: npc.createdBy,
      tags: newTags,
    });
    const idx = npcs.value.findIndex((n) => n.id === npc.id);
    if (idx !== -1) npcs.value[idx] = { ...npcs.value[idx], tags: saved.tags ?? newTags };
  } catch (e) {
    console.error("Failed to add tag:", e);
  }
}

async function removeTagFromNpc(npc: NpcDto, tag: string) {
  if (!roomId.value) return;
  const newTags = (npc.tags ?? []).filter((t) => t !== tag);
  try {
    const saved = await saveNpcForRoom(roomId.value, {
      id: npc.id,
      roomId: roomId.value,
      name: npc.name,
      description: npc.description,
      type: npc.type,
      visible: npc.visible,
      unique: npc.unique,
      clazzCode: npc.clazzCode,
      raceCode: npc.raceCode,
      armoryClass: npc.armoryClass,
      speed: npc.speed,
      initiative: npc.initiative,
      imgUrl: npc.imgUrl,
      createdBy: npc.createdBy,
      tags: newTags,
    });
    const idx = npcs.value.findIndex((n) => n.id === npc.id);
    if (idx !== -1) npcs.value[idx] = { ...npcs.value[idx], tags: saved.tags ?? newTags };
  } catch (e) {
    console.error("Failed to remove tag:", e);
  }
}

function handleTagInputKey(e: KeyboardEvent, npc: NpcDto) {
  if (e.key === "Enter") { void addTagToNpc(npc); }
  if (e.key === "Escape") { npcTagInputNpcId.value = null; npcTagInput.value = ""; }
}

function goToNpc(npcId: string) {
  ionRouter.push(`/rooms/${roomId.value}/npcs/${npcId}/full`);
}

function goToCreateNpc() {
  ionRouter.push(`/rooms/${roomId.value}/npcs/create`);
}

function goToSection(section: Section) {
  if (isLockedSection.value) return;
  ionRouter.push(`/rooms/${roomId.value}/master/guidebook/${section}`);
}

function goBack() {
  if (isLockedSection.value) {
    ionRouter.push(`/rooms/${roomId.value}/master`);
    return;
  }
  currentSection.value = "list";
}

async function initializeView() {
  if (!roomId.value) return;
  guidebookStore.roomId = roomId.value;
  if (!roomStore.room?.id) {
    await roomStore.getRoomInfo(roomId.value);
  }
  if (roomStore.room?.baseRuleType) {
    guidebookStore.baseRuleType = roomStore.room.baseRuleType;
  }
  hydrateFromStoreIfPossible();
  if (currentSection.value !== "list") {
    await ensureSectionDataLoaded(currentSection.value);
  }
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
    const nextCatalog = orderedSpellCatalogs.value[0];
    if (selectedSpellCatalog.value !== nextCatalog) {
      selectedSpellCatalog.value = nextCatalog;
    } else {
      await loadSpells();
    }
  } else if (section === "items") {
    if (availableBundles.value.length === 0) void loadRoomBundles();
    if (items.value.length === 0) await Promise.all([searchItems(true), loadItemTags()]);
  } else if (section === "npcs" && npcs.value.length === 0) {
    await loadNpcs();
  } else if (section === "states" && states.value.length === 0) {
    await loadStates();
  }
}

const sectionTitles: Record<string, string> = {
  races: "Расы",
  classes: "Классы",
  backgrounds: "Предыстории",
  items: "Предметы",
  spells: "Заклинания",
  npcs: "NPC",
  states: "Состояния",
  bundles: "Наборы"
};

onIonViewDidEnter(async () => {
  await initializeView();
  // NPCs can be edited on a separate Ionic view; refresh them when returning
  // so the list reflects the just-saved entity without a full page reload.
  if (currentSection.value === "npcs") await loadNpcs();
});

onMounted(() => {
  // For nested usage in dedicated guidebook routes where ion lifecycle may not fire.
  void initializeView();
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

const createSpell = () => {
  const id = roomId.value;
  ionRouter.navigate('/rooms/' + id + '/master/create/spell', "forward", "push");
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
        | { kind: "races"; saved: RaceDto[] }
        | { kind: "classes"; saved: ClazzDto[] }
        | { kind: "backgrounds"; saved: BackgroundDto[] }
) {
  await refreshAfterCatalogAdd(payload.kind);
  mergeCatalogSavedIntoGuidebook(payload.kind, payload.saved);
}
</script>

<template>
  <div class="guidebook">
    <!-- Список разделов -->
    <div v-show="!isLockedSection && currentSection === 'list'" class="sections-list">
      <div class="sections-grid">
        <button
            v-for="section in SECTIONS"
            :key="section.id"
            type="button"
            class="section-card"
            :style="{ '--accent': section.accent }"
            @click="goToSection(section.id)"
        >
          <span class="section-card__glow" aria-hidden="true"/>
          <span class="section-card__icon">
            <ion-icon :icon="sectionIcons[section.icon]"/>
          </span>
          <span class="section-card__body">
            <span class="section-card__title">{{ section.label }}</span>
            <span class="section-card__desc">{{ section.description }}</span>
          </span>
          <ion-icon class="section-card__chevron" :icon="chevronForwardOutline" aria-hidden="true"/>
        </button>
      </div>
    </div>

    <!-- Контент раздела с кнопкой назад -->
    <template v-if="currentSection !== 'list'">
      <div v-if="!isLockedSection" class="section-header">
        <button type="button" class="section-back" aria-label="Назад к разделам" @click="goBack">
          <ion-icon :icon="menuOutline"/>
        </button>
        <h2 class="section-title">{{ sectionTitles[currentSection] }}</h2>
      </div>

      <!-- Расы -->
      <div v-show="currentSection === 'races'" class="segment-content segment-content--preline-labels">
        <ion-list v-if="!loading && filteredRaceGroups.length" class="guidebook-list">
          <template v-for="group in filteredRaceGroups" :key="group.key">
            <ion-item
                v-if="group.root"
                :button="true"
                color="dark"
                @click="goToRace(group.root)"
            >
              <ion-avatar slot="start">
                <img :src="getRaceImageUrl(group.root.imgUrl)" alt=""/>
              </ion-avatar>
              <div slot="end" class="row-end-actions">
                <button type="button" class="row-action-btn" @click.stop="toggleRaceHidden(group.root)">
                  <ion-icon :icon="isHidden(group.root) ? eyeOffOutline : eyeOutline"
                            :color="isHidden(group.root) ? 'danger' : 'secondary'"/>
                </button>
                <ion-icon :icon="chevronForwardOutline"/>
              </div>
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
              <div slot="end" class="row-end-actions">
                <button type="button" class="row-action-btn" @click.stop="toggleRaceHidden(group.subs[0])">
                  <ion-icon :icon="isHidden(group.subs[0]) ? eyeOffOutline : eyeOutline"
                            :color="isHidden(group.subs[0]) ? 'danger' : 'secondary'"/>
                </button>
                <ion-icon :icon="chevronForwardOutline"/>
              </div>
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
              <div slot="end" class="row-end-actions">
                <button type="button" class="row-action-btn" @click.stop="toggleRaceHidden(sub)">
                  <ion-icon :icon="isHidden(sub) ? eyeOffOutline : eyeOutline"
                            :color="isHidden(sub) ? 'danger' : 'secondary'"/>
                </button>
                <ion-icon :icon="chevronForwardOutline"/>
              </div>
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
      <div v-show="currentSection === 'classes'" class="segment-content segment-content--preline-labels">
        <ion-list v-if="!loading && filteredClassGroups.length" class="guidebook-list">
          <template v-for="group in filteredClassGroups" :key="group.key">
            <ion-item
                v-if="group.root"
                :button="true"
                color="dark"
                @click="goToClass(group.root)"
            >
              <ion-avatar slot="start">
                <img :src="getClassImageUrl(group.root.imgUrl)" alt=""/>
              </ion-avatar>
              <div slot="end" class="row-end-actions">
                <button type="button" class="row-action-btn" @click.stop="toggleClassHidden(group.root)">
                  <ion-icon :icon="isHidden(group.root) ? eyeOffOutline : eyeOutline"
                            :color="isHidden(group.root) ? 'danger' : 'secondary'"/>
                </button>
                <ion-icon :icon="chevronForwardOutline"/>
              </div>
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
              <div slot="end" class="row-end-actions">
                <button type="button" class="row-action-btn" @click.stop="toggleClassHidden(group.subs[0])">
                  <ion-icon :icon="isHidden(group.subs[0]) ? eyeOffOutline : eyeOutline"
                            :color="isHidden(group.subs[0]) ? 'danger' : 'secondary'"/>
                </button>
                <ion-icon :icon="chevronForwardOutline"/>
              </div>
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
              <div slot="end" class="row-end-actions">
                <button type="button" class="row-action-btn" @click.stop="toggleClassHidden(sub)">
                  <ion-icon :icon="isHidden(sub) ? eyeOffOutline : eyeOutline"
                            :color="isHidden(sub) ? 'danger' : 'secondary'"/>
                </button>
                <ion-icon :icon="chevronForwardOutline"/>
              </div>
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
      <div v-show="currentSection === 'backgrounds'" class="segment-content segment-content--preline-labels">
        <ion-list v-if="!loading && filteredBackgrounds.length" class="guidebook-list">
          <ion-item
              v-for="bg in filteredBackgrounds"
              :key="bg.code + (bg.id ?? '')"
              :button="true"
              color="dark"
              @click="goToBackground(bg)"
          >
            <ion-avatar slot="start">
              <img :src="getBackgroundImageUrl(bg.imgUrl)" alt=""/>
            </ion-avatar>
            <div slot="end" class="row-end-actions">
              <button type="button" class="row-action-btn" @click.stop="toggleBackgroundHidden(bg)">
                <ion-icon :icon="isHidden(bg) ? eyeOffOutline : eyeOutline"
                          :color="isHidden(bg) ? 'danger' : 'secondary'"/>
              </button>
              <ion-icon :icon="chevronForwardOutline"/>
            </div>
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
        <div class="items-search-row">
          <ion-searchbar
              v-model="itemSearchQuery"
              placeholder="Поиск предметов"
              debounce="300"
              class="items-searchbar"
          />
          <button
              :class="['items-filter-btn', { 'items-filter-btn--active': itemActiveFiltersCount > 0 }]"
              @click="showItemFiltersModal = true"
          >
            <ion-icon :icon="filterOutline"/>
            <span v-if="itemActiveFiltersCount > 0" class="items-filter-btn__badge">{{ itemActiveFiltersCount }}</span>
          </button>
        </div>

        <!-- Active filter chips -->
        <div v-if="itemActiveFiltersCount > 0" class="items-active-filters">
          <span v-if="itemTypeFilter" class="item-active-chip">
            {{ allItemTypes.find(([k]) => k === itemTypeFilter)?.[1] ?? itemTypeFilter }}
            <button @click="itemTypeFilter = ''"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-if="itemSubtypeFilter" class="item-active-chip">
            {{ allItemSubtypes.find(([k]) => k === itemSubtypeFilter)?.[1] ?? itemSubtypeFilter }}
            <button @click="itemSubtypeFilter = ''"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-if="itemRarityFilter" class="item-active-chip">
            {{ RARITY_LABELS[itemRarityFilter] ?? itemRarityFilter }}
            <button @click="itemRarityFilter = ''"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-if="itemCustomizationFilter !== ''" class="item-active-chip">
            {{ itemCustomizationFilter === 'true' ? 'Настройка: да' : 'Настройка: нет' }}
            <button @click="itemCustomizationFilter = ''"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-if="itemVisibleFilter !== ''" class="item-active-chip">
            {{ itemVisibleFilter === 'true' ? 'Видно игрокам' : 'Скрыто от игроков' }}
            <button @click="itemVisibleFilter = ''"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-if="itemHasSkillsFilter !== ''" class="item-active-chip">
            {{ itemHasSkillsFilter === 'true' ? 'Есть навыки' : 'Нет навыков' }}
            <button @click="itemHasSkillsFilter = ''"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-if="itemBundleFilter" class="item-active-chip">
            {{ selectedBundleName }}
            <button @click="itemBundleFilter = ''"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-for="tag in [...itemTagFilter]" :key="tag" class="item-active-chip">
            #{{ tag }}
            <button @click="toggleItemTagFilter(tag)"><ion-icon :icon="closeOutline"/></button>
          </span>
          <button class="item-active-chip item-active-chip--reset" @click="resetItemFilters">Сбросить</button>
        </div>

        <!-- Filters modal -->
        <Teleport to="body">
          <div v-if="showItemFiltersModal" class="item-filters-overlay" @click.self="showItemFiltersModal = false">
            <div class="item-filters-modal">
              <div class="item-filters-modal__header">
                <span>Фильтры</span>
                <button class="item-filters-modal__close" @click="showItemFiltersModal = false">
                  <ion-icon :icon="closeOutline"/>
                </button>
              </div>
              <div class="item-filters-modal__body">

                <div v-if="allBundles.length" class="item-filters-section">
                  <div class="item-filters-label">Набор</div>
                  <div class="item-filters-chips">
                    <button
                        v-for="bundle in allBundles" :key="bundle.id"
                        :class="['item-filters-chip', { 'item-filters-chip--active': itemBundleFilter === bundle.id }]"
                        @click="itemBundleFilter = itemBundleFilter === bundle.id ? '' : bundle.id"
                    >{{ bundle.name }}</button>
                  </div>
                </div>

                <div v-if="allItemTypes.length" class="item-filters-section">
                  <div class="item-filters-label">Тип</div>
                  <div class="item-filters-chips">
                    <button
                        v-for="[val, label] in allItemTypes" :key="val"
                        :class="['item-filters-chip', { 'item-filters-chip--active': itemTypeFilter === val }]"
                        @click="itemTypeFilter = itemTypeFilter === val ? '' : val"
                    >{{ label }}</button>
                  </div>
                </div>

                <div v-if="allItemSubtypes.length" class="item-filters-section">
                  <div class="item-filters-label">Подтип</div>
                  <div class="item-filters-chips">
                    <button
                        v-for="[val, label] in allItemSubtypes" :key="val"
                        :class="['item-filters-chip', { 'item-filters-chip--active': itemSubtypeFilter === val }]"
                        @click="itemSubtypeFilter = itemSubtypeFilter === val ? '' : val"
                    >{{ label }}</button>
                  </div>
                </div>

                <div v-if="allItemRarities.length" class="item-filters-section">
                  <div class="item-filters-label">Редкость</div>
                  <div class="item-filters-chips">
                    <button
                        v-for="r in allItemRarities" :key="r"
                        :class="['item-filters-chip', `item-filters-chip--rarity-${r.toLowerCase()}`, { 'item-filters-chip--active': itemRarityFilter === r }]"
                        @click="itemRarityFilter = itemRarityFilter === r ? '' : r"
                    >{{ RARITY_LABELS[r] }}</button>
                  </div>
                </div>

                <div v-if="allItemTags.length" class="item-filters-section">
                  <div class="item-filters-label">Теги</div>
                  <div class="item-filters-chips">
                    <span v-for="tag in allItemTags" :key="tag.id" class="item-tag-chip-wrapper">
                      <button
                          :class="['item-filters-chip', { 'item-filters-chip--active': itemTagFilter.has(tag.name) }]"
                          @click="toggleItemTagFilter(tag.name)"
                      >#{{ tag.name }}</button>
                      <button
                          v-if="tag.description"
                          :class="['item-tag-info-btn', { 'item-tag-info-btn--active': shownTagInfo?.id === tag.id }]"
                          @click.stop="toggleTagInfo(tag)"
                      >?</button>
                    </span>
                  </div>
                  <div v-if="shownTagInfo && shownTagInfo.description" class="item-tag-description">
                    <span class="item-tag-description__name">{{ shownTagInfo.name }}</span>
                    {{ shownTagInfo.description }}
                  </div>
                </div>

                <div class="item-filters-section">
                  <div class="item-filters-label">Настройка</div>
                  <div class="item-filters-chips">
                    <button :class="['item-filters-chip', { 'item-filters-chip--active': itemCustomizationFilter === 'true' }]" @click="itemCustomizationFilter = itemCustomizationFilter === 'true' ? '' : 'true'">Требуется</button>
                    <button :class="['item-filters-chip', { 'item-filters-chip--active': itemCustomizationFilter === 'false' }]" @click="itemCustomizationFilter = itemCustomizationFilter === 'false' ? '' : 'false'">Не требуется</button>
                  </div>
                </div>

                <div class="item-filters-section">
                  <div class="item-filters-label">Видимость для игроков</div>
                  <div class="item-filters-chips">
                    <button :class="['item-filters-chip', { 'item-filters-chip--active': itemVisibleFilter === 'true' }]" @click="itemVisibleFilter = itemVisibleFilter === 'true' ? '' : 'true'">Видно</button>
                    <button :class="['item-filters-chip', { 'item-filters-chip--active': itemVisibleFilter === 'false' }]" @click="itemVisibleFilter = itemVisibleFilter === 'false' ? '' : 'false'">Скрыто</button>
                  </div>
                </div>

                <div class="item-filters-section">
                  <div class="item-filters-label">Навыки</div>
                  <div class="item-filters-chips">
                    <button :class="['item-filters-chip', { 'item-filters-chip--active': itemHasSkillsFilter === 'true' }]" @click="itemHasSkillsFilter = itemHasSkillsFilter === 'true' ? '' : 'true'">Есть навыки</button>
                    <button :class="['item-filters-chip', { 'item-filters-chip--active': itemHasSkillsFilter === 'false' }]" @click="itemHasSkillsFilter = itemHasSkillsFilter === 'false' ? '' : 'false'">Нет навыков</button>
                  </div>
                </div>

              </div>
              <div class="item-filters-modal__footer">
                <button class="item-filters-reset" @click="resetItemFilters">Сбросить</button>
                <button class="item-filters-apply" @click="showItemFiltersModal = false">Применить</button>
              </div>
            </div>
          </div>
        </Teleport>

        <div v-if="filteredItems.length" class="items-list">
          <button
              v-for="item in filteredItems"
              :key="item.id"
              type="button"
              class="item-card"
              @click="openItemModal(item)"
          >
            <div class="item-card__media">
              <img :src="getItemImageUrl(item.imgUrl)" :alt="getItemName(item)" class="item-card__img"/>
            </div>
            <div class="item-card__body">
              <div class="item-card__name">{{ getItemName(item) }}</div>
              <div class="item-card__meta">
                {{ item.typeName }}<span v-if="item.subtypeName"> · {{ item.subtypeName }}</span>
              </div>
              <span v-if="item.stats?.armorClass" class="item-card__pill">КБ {{ item.stats.armorClass }}</span>
              <span v-else-if="item.stats?.damage?.value" class="item-card__pill">{{ item.stats.damage.value + ' (' + item.stats.damage.damageTypeName + ')'}}</span>
              <div v-if="item.stats?.tags?.length" class="item-card__tags">
                <span v-for="tag in item.stats.tags" :key="tag" class="item-card__tag"
                      :title="availableItemTags.find(t => t.name === tag)?.description">#{{ tag }}</span>
              </div>
            </div>
            <ion-icon class="item-card__chevron" :icon="chevronForwardOutline"/>
          </button>
        </div>
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
        <div v-else-if="loading" class="loading-placeholder">
          Загрузка...
        </div>
        <div v-else-if="!filteredItems.length" class="empty-placeholder">
          Ничего не найдено
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
      <div v-show="currentSection === 'spells'" class="segment-content spells-section">
        <div class="spells-filters">
          <ion-segment v-model="selectedSpellCatalog" class="spell-rule-segment" mode="ios">
            <ion-segment-button
                v-for="catalog in orderedSpellCatalogs"
                :key="catalog"
                :value="catalog"
            >
              <ion-label>{{ getSpellCatalogLabel(catalog) }}</ion-label>
            </ion-segment-button>
          </ion-segment>
          <ion-searchbar
              v-model="spellSearchQuery"
              placeholder="Найти заклинание"
              debounce="200"
              class="spells-searchbar"
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
                  v-for="row in levelSpells"
                  :key="row.id"
                  :button="true"
                  color="dark"
                  class="spell-item-cv"
                  @click="openSpellModal(row.raw)"
              >
                <ion-avatar slot="start">
                  <img :src="row.imgUrl" :alt="row.name" loading="lazy"/>
                </ion-avatar>
                <ion-icon :icon="chevronForwardOutline" slot="end"/>
                <ion-label>
                  <h3>{{ row.name }}</h3>
                  <p class="spell-school">{{ row.line1 }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </div>
        </div>
        <div v-else-if="loading" class="loading-placeholder">Загрузка...</div>
        <div v-else-if="spells.length" class="empty-placeholder">Заклинания не найдены</div>
        <div v-else class="empty-placeholder">Нет заклинаний</div>
        <div class="add-new-button add-new-button--centered">
          <ion-button size="large" shape="round" color="secondary" @click="createSpell()">
            <ion-icon slot="icon-only" :icon="add"/>
          </ion-button>
        </div>
      </div>

      <!-- NPC -->
      <div v-show="currentSection === 'npcs'" class="segment-content npcs-section">

        <!-- Search bar + filter button -->
        <div class="npcs-search-row">
          <div class="npcs-search-bar">
            <ion-icon :icon="searchOutline" class="npcs-search-icon"/>
            <input
                v-model="npcSearch"
                class="npcs-search-input"
                placeholder="Поиск по имени или тегу..."
            />
            <button v-if="npcSearch" class="npcs-search-clear" @click="npcSearch = ''">
              <ion-icon :icon="closeOutline"/>
            </button>
          </div>
          <button
              :class="['npcs-filter-btn', { 'npcs-filter-btn--active': npcActiveFiltersCount > 0 }]"
              @click="showNpcFiltersModal = true"
          >
            <ion-icon :icon="filterOutline"/>
            <span>Фильтры</span>
            <span v-if="npcActiveFiltersCount > 0" class="npcs-filter-btn__badge">{{ npcActiveFiltersCount }}</span>
          </button>
        </div>

        <!-- Active filter chips summary -->
        <div v-if="npcActiveFiltersCount > 0" class="npcs-active-filters">
          <span v-if="npcFilterType" class="npc-active-chip">
            {{ NPC_TYPE_LABELS[npcFilterType] }}
            <button @click="npcFilterType = ''"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-if="npcFilterClass" class="npc-active-chip">
            {{ npcClassOptions.find(o => o.value === npcFilterClass)?.label ?? npcFilterClass }}
            <button @click="npcFilterClass = ''"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-if="npcFilterRace" class="npc-active-chip">
            {{ npcRaceOptions.find(o => o.value === npcFilterRace)?.label ?? npcFilterRace }}
            <button @click="npcFilterRace = ''"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-if="npcFilterCharacterId" class="npc-active-chip">
            {{ roomCharacters.find(c => c.id === npcFilterCharacterId)?.name ?? 'Персонаж' }}
            <button @click="npcFilterCharacterId = ''"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-if="npcFilterUnique !== null" class="npc-active-chip">
            {{ npcFilterUnique ? 'Уникальный' : 'Не уникальный' }}
            <button @click="npcFilterUnique = null"><ion-icon :icon="closeOutline"/></button>
          </span>
          <span v-for="tag in [...npcTagFilter]" :key="tag" class="npc-active-chip npc-active-chip--tag">
            #{{ tag }}
            <button @click="toggleTagFilter(tag)"><ion-icon :icon="closeOutline"/></button>
          </span>
          <button class="npc-active-chip npc-active-chip--reset" @click="resetNpcFilters">Сбросить всё</button>
        </div>

        <!-- Filters modal -->
        <Teleport to="body">
          <div v-if="showNpcFiltersModal" class="npc-filters-overlay" @click.self="showNpcFiltersModal = false">
            <div class="npc-filters-modal">
              <div class="npc-filters-modal__header">
                <span>Фильтры</span>
                <button class="npc-filters-modal__close" @click="showNpcFiltersModal = false">
                  <ion-icon :icon="closeOutline"/>
                </button>
              </div>

              <div class="npc-filters-modal__body">
                <div class="npc-filters-section">
                  <div class="npc-filters-label">Уникальность</div>
                  <div class="npc-filters-chips">
                    <button
                        :class="['npc-filters-chip', { 'npc-filters-chip--active': npcFilterUnique === true }]"
                        @click="npcFilterUnique = npcFilterUnique === true ? null : true"
                    >Уникальный</button>
                    <button
                        :class="['npc-filters-chip', { 'npc-filters-chip--active': npcFilterUnique === false }]"
                        @click="npcFilterUnique = npcFilterUnique === false ? null : false"
                    >Не уникальный</button>
                  </div>
                </div>

                <div class="npc-filters-section">
                  <div class="npc-filters-label">Тип</div>
                  <div class="npc-filters-chips">
                    <button
                        v-for="(label, type) in NPC_TYPE_LABELS" :key="type"
                        :class="['npc-filters-chip', { 'npc-filters-chip--active': npcFilterType === type }]"
                        @click="npcFilterType = npcFilterType === type ? '' : type"
                    >{{ label }}</button>
                  </div>
                </div>

                <div class="npc-filters-section">
                  <div class="npc-filters-label">Класс</div>
                  <div class="npc-filters-chips">
                    <button
                        v-for="opt in npcClassOptions" :key="opt.value"
                        :class="['npc-filters-chip', { 'npc-filters-chip--active': npcFilterClass === opt.value }]"
                        @click="npcFilterClass = npcFilterClass === opt.value ? '' : opt.value"
                    >{{ opt.label }}</button>
                  </div>
                </div>

                <div class="npc-filters-section">
                  <div class="npc-filters-label">Раса</div>
                  <div class="npc-filters-chips">
                    <button
                        v-for="opt in npcRaceOptions" :key="opt.value"
                        :class="['npc-filters-chip', { 'npc-filters-chip--active': npcFilterRace === opt.value }]"
                        @click="npcFilterRace = npcFilterRace === opt.value ? '' : opt.value"
                    >{{ opt.label }}</button>
                  </div>
                </div>

                <div class="npc-filters-section">
                  <div class="npc-filters-label">Персонаж</div>
                  <div class="npc-filters-chips">
                    <button
                        v-for="char in roomCharacters" :key="char.id"
                        :class="['npc-filters-chip', { 'npc-filters-chip--active': npcFilterCharacterId === char.id }]"
                        @click="npcFilterCharacterId = npcFilterCharacterId === char.id ? '' : char.id"
                    >{{ char.name ?? char.id }}</button>
                  </div>
                  <div v-if="!roomCharacters.length" class="npc-filters-empty">Нет персонажей в комнате</div>
                </div>

                <div v-if="allNpcTags.length" class="npc-filters-section">
                  <div class="npc-filters-label">Теги</div>
                  <div class="npc-filters-chips">
                    <button
                        v-for="tag in allNpcTags" :key="tag"
                        :class="['npc-filters-chip', { 'npc-filters-chip--active': npcTagFilter.has(tag) }]"
                        @click="toggleTagFilter(tag)"
                    >#{{ tag }}</button>
                  </div>
                </div>
              </div>

              <div class="npc-filters-modal__footer">
                <button class="npc-filters-reset" @click="resetNpcFilters">Сбросить</button>
                <button class="npc-filters-apply" @click="showNpcFiltersModal = false">Применить</button>
              </div>
            </div>
          </div>
        </Teleport>

        <!-- placeholder for removed tag-filter row (now in modal) -->
        <div v-if="false" class="npcs-tag-filter">
          <button
              v-for="tag in allNpcTags"
              :key="tag"
              :class="['npc-filter-tag', { 'npc-filter-tag--active': npcTagFilter.has(tag) }]"
              @click="toggleTagFilter(tag)"
          >
            {{ tag }}
            <ion-icon v-if="npcTagFilter.has(tag)" :icon="closeOutline" class="npc-filter-tag__x"/>
          </button>
        </div>

        <!-- NPC cards -->
        <div v-if="!npcsLoading && filteredNpcs.length" class="npc-cards">
          <div v-for="npc in filteredNpcs" :key="npc.id" class="npc-card">

            <!-- Top row: avatar + name/meta + actions -->
            <div class="npc-card__top" @click="goToNpc(npc.id)">
              <div class="npc-card__avatar-wrap">
                <img :src="getNpcImageUrl(npc.imgUrl)" :alt="npc.name" class="npc-card__avatar"/>
                <span v-if="npc.unique" class="npc-card__unique-dot" title="Уникальный"/>
              </div>
              <div class="npc-card__info">
                <div class="npc-card__name">{{ npc.name }}</div>
                <div class="npc-card__meta">
                  <span class="npc-card__type-badge" :data-type="npc.type">{{ getNpcTypeAbbr(npc.type) }}</span>
                  <span v-if="npc.clazzInfo?.name || npc.clazzCode">{{ npc.clazzInfo?.name || npc.clazzCode }}</span>
                  <span v-if="(npc.clazzInfo?.name || npc.clazzCode) && (npc.raceInfo?.name || npc.raceCode)" class="npc-card__meta-dot">·</span>
                  <span v-if="npc.raceInfo?.name || npc.raceCode">{{ npc.raceInfo?.name || npc.raceCode }}</span>
                </div>
              </div>
              <div class="npc-card__actions" @click.stop>
                <button class="npc-card__action-btn npc-card__action-btn--chevron" @click="goToNpc(npc.id)">
                  <ion-icon :icon="chevronForwardOutline"/>
                </button>
              </div>
            </div>

            <!-- Tags row -->
            <div class="npc-card__tags" @click.stop>
              <span
                  v-for="tag in (npc.tags ?? [])"
                  :key="tag"
                  class="npc-tag"
                  @click="removeTagFromNpc(npc, tag)"
                  title="Удалить тег"
              >{{ tag }}<span class="npc-tag__x">×</span></span>

              <template v-if="npcTagInputNpcId === npc.id">
                <input
                    v-model="npcTagInput"
                    class="npc-tag-input"
                    placeholder="тег..."
                    autofocus
                    @keydown="handleTagInputKey($event, npc)"
                    @blur="addTagToNpc(npc)"
                />
              </template>
              <button v-else class="npc-tag npc-tag--add" @click="openTagInput(npc.id)">
                <ion-icon :icon="addOutline"/>
              </button>
            </div>

            <!-- Relations -->
            <div class="npc-card__divider"/>
            <div class="npc-card__relations" @click.stop>
              <span
                  v-for="rel in npcRelationsMap.get(npc.id)"
                  :key="'c-' + rel.characterName + rel.relationType"
                  class="npc-relation-chip"
                  :style="{ background: rel.colors.bg, borderColor: rel.colors.border, color: rel.colors.text }"
              >
                <span class="npc-relation-chip__kind">П</span>
                <span class="npc-relation-chip__dot">·</span>
                <span class="npc-relation-chip__name">{{ rel.characterName }}</span>
                <span class="npc-relation-chip__dot">·</span>
                <span class="npc-relation-chip__type">{{ rel.label }}</span>
              </span>
              <span
                  v-for="rel in npcNpcRelationsMap.get(npc.id)"
                  :key="'n-' + rel.otherNpcName + rel.relationType"
                  class="npc-relation-chip"
                  :style="{ background: rel.colors.bg, borderColor: rel.colors.border, color: rel.colors.text }"
              >
                <span class="npc-relation-chip__kind">N</span>
                <span class="npc-relation-chip__dot">·</span>
                <span class="npc-relation-chip__name">{{ rel.otherNpcName }}</span>
                <span class="npc-relation-chip__dot">·</span>
                <span class="npc-relation-chip__type">{{ rel.label }}</span>
              </span>
              <button class="npc-card__add-relation-btn" @click="openNpcRelationPopover(npc.id, $event)" title="Добавить связь">
                <ion-icon :icon="addOutline"/>
              </button>
            </div>
          </div>
        </div>
        <div v-else-if="npcsLoading" class="loading-placeholder">Загрузка...</div>
        <div v-else class="empty-placeholder">Нет NPC</div>

        <ion-button fill="solid" color="primary" shape="round" class="add-npc-fab" @click="goToCreateNpc">
          <ion-icon :icon="add"/>
        </ion-button>
      </div>

      <!-- Состояния -->
      <div v-show="currentSection === 'states'" class="segment-content">
        <div v-if="!statesLoading && filteredStates.length" class="states-grid">
          <button
              v-for="state in filteredStates"
              :key="state.id ?? state.code ?? ''"
              type="button"
              class="state-card"
              @click="openStateModal(state)"
          >
            <span class="state-card__name">{{ state.name ?? state.code }}</span>
            <span v-if="state.description" class="state-card__desc">{{ state.description }}</span>
          </button>
        </div>
        <div v-else-if="statesLoading" class="loading-placeholder">Загрузка...</div>
        <div v-else class="empty-placeholder">Нет состояний в этой комнате</div>
      </div>

      <div v-show="currentSection === 'bundles'" class="segment-content">
        <MasterBundlesView v-if="currentSection === 'bundles'"/>
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

            <div class="npc-relation-field">
              <div class="npc-relation-label">Заметка</div>
              <textarea v-model="npcRelationPopoverNote" class="npc-relation-textarea" placeholder="Необязательно..." rows="2"/>
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
        :available-tags="availableItemTags"
        @close="closeItemModal"
        @edit="editItemFromModal"
        @delete="deleteItemFromModal"
    />
    <MasterGuidebookSpellModal
        :spell="selectedSpell"
        :is-open="showSpellModal"
        @close="closeSpellModal"
    />
    <MasterGuidebookStateModal
        :state="selectedState"
        :is-open="showStateModal"
        @close="closeStateModal"
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
  padding-top: 12px;
}

.sections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.section-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.92) 100%);
  cursor: pointer;
  overflow: hidden;
  text-align: left;
  isolation: isolate;
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.22s ease, box-shadow 0.22s ease;
}

.section-card__glow {
  position: absolute;
  inset: -1px;
  z-index: -1;
  background: radial-gradient(120% 90% at 0% 0%, rgba(var(--accent), 0.16), transparent 62%);
  opacity: 0.85;
  transition: opacity 0.25s ease;
}

.section-card:hover {
  transform: translateY(-3px);
  border-color: rgba(var(--accent), 0.5);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.4);
}

.section-card:hover .section-card__glow {
  opacity: 1;
}

.section-card:active {
  transform: translateY(-1px) scale(0.992);
}

.section-card__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(var(--accent), 0.14);
  border: 1px solid rgba(var(--accent), 0.3);
}

.section-card__icon ion-icon {
  font-size: 24px;
  color: rgb(var(--accent));
}

.section-card__body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.section-card__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ion-color-light);
  line-height: 1.2;
}

.section-card__desc {
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  line-height: 1.3;
}

.section-card__chevron {
  flex-shrink: 0;
  font-size: 18px;
  color: rgba(var(--ion-color-light-rgb), 0.3);
  transition: transform 0.22s ease, color 0.22s ease;
}

.section-card:hover .section-card__chevron {
  transform: translateX(3px);
  color: rgb(var(--accent));
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0 14px;
}

.section-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 12px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
  background: rgba(var(--ion-color-medium-rgb), 0.6);
  color: var(--ion-color-light);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}

.section-back ion-icon {
  font-size: 20px;
}

.section-back:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.16);
  border-color: rgba(var(--ion-color-primary-rgb), 0.4);
}

.section-back:active {
  transform: scale(0.94);
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.segment-content {
  min-height: 200px;
}

.segment-content--preline-labels :deep(ion-label) {
  white-space: pre-line;
}

.guidebook-list {
  background: transparent;
  padding: 0;
}

.guidebook-list ion-item {
  --min-height: 60px;
  --background: transparent;
  --background-hover: transparent;
  --background-activated: transparent;
  --inner-border-width: 0;
  --padding-start: 12px;
  --inner-padding-end: 12px;
  --color: var(--ion-color-light);
  margin-bottom: 8px;
}

.guidebook-list ion-item::part(native) {
  border-radius: 14px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  background: linear-gradient(150deg, rgba(var(--ion-color-medium-rgb), 0.9) 0%, rgba(var(--ion-color-dark-rgb), 0.85) 100%);
  transition: border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
}

.guidebook-list ion-item:hover::part(native) {
  border-color: rgba(var(--ion-color-primary-rgb), 0.4);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.32);
}

.guidebook-list ion-item:active::part(native) {
  transform: scale(0.992);
}

.guidebook-list ion-label h3 {
  font-weight: 600;
  color: var(--ion-color-light);
}

.guidebook-list ion-avatar {
  width: 42px;
  height: 42px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  background: rgba(var(--ion-color-dark-rgb), 0.6);
}

.guidebook-list ion-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.loading-placeholder,
.empty-placeholder {
  margin-top: 8px;
  padding: 32px 24px;
  text-align: center;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  font-size: 14px;
  border: 1px dashed rgba(var(--ion-color-light-rgb), 0.12);
  border-radius: 16px;
  background: rgba(var(--ion-color-medium-rgb), 0.35);
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
  gap: 10px;
}

.spells-section .spell-rule-segment {
  width: 100%;
  --background: var(--ion-color-medium);
  border-radius: 8px;
  margin: 10px 4px 0;
  padding: 3px;
}

.spells-section .spells-searchbar {
  padding-top: 0;
  padding-bottom: 0;
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

.spell-item-cv {
  content-visibility: auto;
  contain-intrinsic-size: 0 68px;
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
  color: var(--ion-color-secondary);
  margin-top: 2px;
}

.npc-relation-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}

.npc-relation-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  max-width: 180px;
}

.npc-relation-chip__kind {
  font-size: 9px;
  font-weight: 800;
  opacity: 0.65;
  text-transform: uppercase;
  flex-shrink: 0;
}

.npc-relation-chip__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
}

.npc-relation-chip__dot {
  opacity: 0.5;
  flex-shrink: 0;
}

.npc-relation-chip__type {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
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
  color: var(--ion-color-secondary);
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

.npc-relation-textarea {
  width: 100%;
  background: var(--ion-color-medium);
  color: var(--ion-color-light);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  resize: none;
  font-family: inherit;
  font-size: 14px;
  box-sizing: border-box;
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

.row-end-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.row-action-btn {
  border: none;
  background: transparent;
  color: var(--ion-color-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  cursor: pointer;
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

.states-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}

.state-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.15);
  background: linear-gradient(135deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.9) 100%);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.15s ease;
  width: 100%;
}

.state-card:hover {
  border-color: rgba(var(--ion-color-primary-rgb), 0.4);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}

.state-card:active {
  transform: scale(0.985);
}

.state-card__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ion-color-primary);
  line-height: 1.25;
}

.state-card__desc {
  font-size: 13px;
  color: rgba(var(--ion-color-light-rgb), 0.55);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}


/** Как в MagicView / InventoryView: плавающая кнопка по центру снизу */
.add-new-button--centered {
  left: 0;
  right: 0;
  justify-content: center;
  gap: 0;
  background: transparent;
}

/* ── NPC search row (bar + filter button) ───────────────────────── */
.npcs-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.npcs-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 13px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: var(--ion-color-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  flex-shrink: 0;
  height: 37px;
}

.npcs-filter-btn:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border-color: rgba(var(--ion-color-primary-rgb), 0.35);
  color: var(--ion-color-primary);
}

.npcs-filter-btn--active {
  background: rgba(var(--ion-color-primary-rgb), 0.18);
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary);
}

.npcs-filter-btn__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--ion-color-primary);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

/* ── Active filter summary chips ────────────────────────────────── */
.npcs-active-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.npc-active-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.4);
  background: rgba(var(--ion-color-primary-rgb), 0.14);
  color: var(--ion-color-primary);
  font-size: 12px;
  font-weight: 500;
}

.npc-active-chip button {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  display: flex;
  align-items: center;
  font-size: 13px;
  opacity: 0.7;
}

.npc-active-chip button:hover { opacity: 1; }

.npc-active-chip--tag {
  border-color: rgba(var(--ion-color-secondary-rgb), 0.4);
  background: rgba(var(--ion-color-secondary-rgb), 0.12);
  color: var(--ion-color-secondary);
}

.npc-active-chip--reset {
  background: transparent;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  color: var(--ion-color-secondary);
  font-size: 11px;
  cursor: pointer;
  padding: 3px 10px;
}

.npc-active-chip--reset:hover {
  border-color: rgba(220, 60, 60, 0.5);
  color: #e07070;
}

/* ── Filters modal (teleported) ─────────────────────────────────── */
.npc-filters-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 99998;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.npc-filters-modal {
  background: #1e1e2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.npc-filters-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  font-size: 16px;
  font-weight: 600;
  color: var(--ion-color-light);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.npc-filters-modal__close {
  background: transparent;
  border: none;
  color: var(--ion-color-secondary);
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 2px;
}

.npc-filters-modal__close:hover { color: var(--ion-color-light); }

.npc-filters-modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.npc-filters-section {}

.npc-filters-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ion-color-secondary);
  margin-bottom: 8px;
}

.npc-filters-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.npc-filters-chip {
  padding: 5px 13px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: var(--ion-color-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.13s, border-color 0.13s, color 0.13s;
}

.npc-filters-chip:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border-color: rgba(var(--ion-color-primary-rgb), 0.35);
  color: var(--ion-color-primary);
}

.npc-filters-chip--active {
  background: rgba(var(--ion-color-primary-rgb), 0.22);
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary);
  font-weight: 600;
}

.npc-filters-empty {
  font-size: 12px;
  color: var(--ion-color-secondary);
  opacity: 0.6;
  padding: 4px 0;
}

.npc-filters-modal__footer {
  display: flex;
  gap: 10px;
  padding: 12px 20px max(16px, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.npc-filters-reset {
  flex: 1;
  padding: 11px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: var(--ion-color-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.13s;
}

.npc-filters-reset:hover {
  background: rgba(255, 255, 255, 0.07);
  color: var(--ion-color-light);
}

.npc-filters-apply {
  flex: 2;
  padding: 11px;
  border-radius: 12px;
  border: none;
  background: var(--ion-color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.13s;
}

.npc-filters-apply:hover { opacity: 0.88; }

/* ── NPC search bar ─────────────────────────────────────────────── */
.npcs-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 8px 12px;
  flex: 1;
}

.npcs-search-icon {
  font-size: 18px;
  color: var(--ion-color-secondary);
  flex-shrink: 0;
}

.npcs-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--ion-color-light);
  font-size: 14px;
  font-family: inherit;
}

.npcs-search-input::placeholder {
  color: var(--ion-color-secondary);
}

.npcs-search-clear {
  background: transparent;
  border: none;
  color: var(--ion-color-secondary);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  font-size: 18px;
}

/* ── Tag filter row ─────────────────────────────────────────────── */
.npcs-tag-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.npc-filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: var(--ion-color-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.npc-filter-tag:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  border-color: rgba(var(--ion-color-primary-rgb), 0.4);
  color: var(--ion-color-primary);
}

.npc-filter-tag--active {
  background: rgba(var(--ion-color-primary-rgb), 0.2);
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary);
  font-weight: 600;
}

.npc-filter-tag__x {
  font-size: 13px;
  opacity: 0.7;
}

/* ── NPC card list ──────────────────────────────────────────────── */
.npc-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 72px;
}

.npc-card {
  background: linear-gradient(135deg, rgba(var(--ion-color-medium-rgb), 0.9) 0%, rgba(var(--ion-color-dark-rgb), 0.85) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 12px 14px 10px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.npc-card:hover {
  border-color: rgba(var(--ion-color-primary-rgb), 0.35);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* top row */
.npc-card__top {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.npc-card__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.npc-card__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.12);
}

.npc-card__unique-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd700, #ffb347);
  border: 1.5px solid var(--ion-background-color, #1a1a2e);
}

.npc-card__info {
  flex: 1;
  min-width: 0;
}

.npc-card__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ion-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.npc-card__meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  font-size: 12px;
  color: var(--ion-color-secondary);
  flex-wrap: wrap;
}

.npc-card__meta-dot {
  opacity: 0.5;
}

.npc-card__type-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  flex-shrink: 0;
  padding-left: 10px;
  padding-right: 10px;
  background: rgba(var(--ion-color-primary-rgb), 0.2);
  color: var(--ion-color-primary);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.4);
}

.npc-card__type-badge[data-type="BEAST"] { background: rgba(139,90,43,0.25); color: #c8a06c; border-color: rgba(139,90,43,0.5); }
.npc-card__type-badge[data-type="MONSTER"] { background: rgba(180,30,30,0.2); color: #e07070; border-color: rgba(180,30,30,0.45); }
.npc-card__type-badge[data-type="DEITY"] { background: rgba(200,160,20,0.2); color: #e8cc60; border-color: rgba(200,160,20,0.45); }
.npc-card__type-badge[data-type="UNDEAD"] { background: rgba(100,70,150,0.25); color: #b89ee0; border-color: rgba(100,70,150,0.5); }

.npc-card__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.npc-card__action-btn {
  background: transparent;
  border: none;
  color: var(--ion-color-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  font-size: 18px;
  transition: background 0.12s, color 0.12s;
}

.npc-card__action-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--ion-color-primary);
}

.npc-card__action-btn--chevron {
  font-size: 16px;
}

/* divider */
.npc-card__divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 8px 0;
}

/* tags row */
.npc-card__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
}

.npc-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
  color: rgba(var(--ion-color-primary-rgb), 0.9);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}

.npc-tag:hover {
  background: rgba(220, 60, 60, 0.18);
  border-color: rgba(220, 60, 60, 0.45);
  color: #e07070;
}

.npc-tag__x {
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.1s;
  margin-left: 1px;
}

.npc-tag:hover .npc-tag__x {
  opacity: 1;
}

.npc-tag--add {
  background: transparent;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  color: var(--ion-color-secondary);
  padding: 2px 8px;
  font-size: 14px;
}

.npc-tag--add:hover {
  border-color: rgba(var(--ion-color-primary-rgb), 0.5);
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.08);
}

.npc-tag-input {
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.08);
  border: 1px solid var(--ion-color-primary);
  color: var(--ion-color-light);
  font-size: 11px;
  font-family: inherit;
  outline: none;
  width: 90px;
}

/* relations row inside card */
.npc-card__relations {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.npc-card__add-relation-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  background: transparent;
  color: var(--ion-color-secondary);
  font-size: 14px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s, border-color 0.15s, color 0.15s;
  flex-shrink: 0;
}

.npc-card:hover .npc-card__add-relation-btn {
  opacity: 1;
}

.npc-card__add-relation-btn:hover {
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.1);
}

/* ── Items list ────────────────────────────────────────────── */
.items-searchbar {
  --background: rgba(var(--ion-color-light-rgb), 0.06);
  --border-radius: 14px;
  --box-shadow: none;
  padding: 0 0 8px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 16px;
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.92) 100%);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.07);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
}

.item-card:hover {
  border-color: rgba(var(--ion-color-primary-rgb), 0.35);
  box-shadow: 0 8px 24px rgba(0,0,0,0.32);
}

.item-card:active {
  transform: scale(0.99);
}

.item-card__media {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-dark);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.12);
}

.item-card__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.item-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-card__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-card__meta {
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-card__pill {
  display: inline-block;
  margin-top: 2px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.14);
  font-variant-numeric: tabular-nums;
}

.item-card__chevron {
  flex-shrink: 0;
  font-size: 18px;
  color: rgba(var(--ion-color-light-rgb), 0.3);
}

.item-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.item-card__tag {
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: rgba(var(--ion-color-primary-rgb), 0.85);
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.22);
}

/* ── Items search row + filter button ─────────────────── */
.items-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.items-search-row .items-searchbar {
  flex: 1;
  padding: 0 0 8px;
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
  margin-bottom: 8px;
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

/* ── Active filter chips row ──────────────────────────── */
.items-active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
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

.item-active-chip--reset {
  color: rgba(var(--ion-color-light-rgb), 0.55);
  background: rgba(var(--ion-color-light-rgb), 0.06);
  border-color: rgba(var(--ion-color-light-rgb), 0.14);
  cursor: pointer;
  padding: 4px 12px;
}

.item-active-chip--reset:hover {
  color: var(--ion-color-danger);
  border-color: var(--ion-color-danger);
  background: rgba(var(--ion-color-danger-rgb), 0.08);
}

/* ── Item filters modal ───────────────────────────────── */
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
  transition: color 0.12s, background 0.12s;
}

.item-filters-modal__close:hover {
  color: var(--ion-color-light);
  background: rgba(var(--ion-color-light-rgb), 0.07);
}

.item-filters-modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.item-filters-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-filters-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.4);
}

.item-filters-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

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

/* Rarity colour variants */
.item-filters-chip--rarity-common       { border-color: rgba(150,150,150,0.3); }
.item-filters-chip--rarity-uncommon     { border-color: rgba(60,180,80,0.35); }
.item-filters-chip--rarity-rare         { border-color: rgba(60,100,220,0.4); }
.item-filters-chip--rarity-very_rare    { border-color: rgba(140,60,200,0.4); }
.item-filters-chip--rarity-legendary    { border-color: rgba(220,140,30,0.5); }
.item-filters-chip--rarity-uncommon.item-filters-chip--active  { color: #4db870; background: rgba(60,180,80,0.15); border-color: #4db870; }
.item-filters-chip--rarity-rare.item-filters-chip--active      { color: #6699ff; background: rgba(60,100,220,0.15); border-color: #6699ff; }
.item-filters-chip--rarity-very_rare.item-filters-chip--active { color: #bb77ee; background: rgba(140,60,200,0.15); border-color: #bb77ee; }
.item-filters-chip--rarity-legendary.item-filters-chip--active { color: #f0a030; background: rgba(220,140,30,0.15); border-color: #f0a030; }

.item-tag-chip-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.item-tag-info-btn {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(var(--ion-color-medium-rgb), 0.4);
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

.item-tag-info-btn:hover,
.item-tag-info-btn--active {
  background: rgba(var(--ion-color-primary-rgb), 0.15);
  color: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
}

.item-tag-description {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--ion-color-primary-rgb), 0.06);
  border-left: 3px solid var(--ion-color-primary);
  font-size: 12px;
  line-height: 1.5;
  color: var(--ion-color-secondary);
}

.item-tag-description__name {
  font-weight: 600;
  color: var(--ion-color-primary);
  margin-right: 4px;
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
  transition: background 0.13s, color 0.13s;
}

.item-filters-reset:hover {
  background: rgba(var(--ion-color-danger-rgb), 0.08);
  color: var(--ion-color-danger);
  border-color: var(--ion-color-danger);
}

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
  transition: opacity 0.13s;
}

.item-filters-apply:hover { opacity: 0.88; }

</style>
