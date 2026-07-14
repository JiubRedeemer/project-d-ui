<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToggle,
  IonToolbar,
  toastController,
} from "@ionic/vue";
import {HEADERS, TEXTS} from "@/config/localisations";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {add, addCircleOutline, addOutline, checkmarkCircle, closeCircleOutline, eyeOutline, pencilOutline, saveOutline, trashOutline} from "ionicons/icons";
import {computed, onBeforeMount, ref, watch} from "vue";
import {extractDominantColorFromUrl} from "@/utils/imageAmbient";
import {useCreateInventoryItemStore} from "@/stores/CreateInventoryItemStore";
import axios from "axios";
import {v4 as uuidv4} from 'uuid';
import {type ItemBundle, type ItemSkill, Price} from "@/components/models/response/InventoryResponse";
import {createTagForRoom, getTagsForRoom, type ItemTagDto} from "@/api/itemTagApi";
import {getOwnBundles, importBundleItems} from "@/api/bundleApi";
import {useRoute, useRouter} from "vue-router";
import EditItemSkillValueModal from "@/views/character/tabs/inventory/EditItemSkillValueModal.vue";
import {useInventoryStore} from "@/stores/InventoryStore";
import goldenCoinIcon from "@/static/icons/GoldenCoin.svg";
import silverCoinIcon from "@/static/icons/SilverCoin.svg";
import copperCoinIcon from "@/static/icons/CopperCoin.svg";
import electrumCoinIcon from "@/static/icons/ElectrumCoin.svg";
import platinumCoinIcon from "@/static/icons/PlatinumCoin.svg";

const router = useRouter();
const route = useRoute();
const hasCharacterContext = computed(() => Boolean(route.params.characterId));
// Режим создания предмета внутри бандла (вне комнаты)
const bundleId = computed(() => route.params.bundleId ? String(route.params.bundleId) : null);
const isBundleMode = computed(() => Boolean(bundleId.value));
// Для тегов в бандл-режиме используется "нулевая" комната — вернутся только глобальные теги
const ZERO_ROOM_ID = "00000000-0000-0000-0000-000000000000";
const tagsRoomId = computed(() => isBundleMode.value ? ZERO_ROOM_ID : String(route.params.roomId));
const canCreateUnidentifiedModel = computed(() =>
    !isBundleMode.value &&
    Boolean(createInventoryItemStore.item.creatorId) &&
    hiddenStats.value &&
    !createInventoryItemStore.item.unidentifiedItemId
);
// "Неопознанная модель" — это отдельный (legacy) предмет-модель без скрытых характеристик,
// ссылающийся на родителя через unidentifiedItemId.
// НЕ путать с настоящим (опознанным) предметом: у него hiddenStats=true и unidentifiedItemId
// указывает на его маскировку — такой предмет редактируется в режиме двух колонок (split).
const isUnidentifiedModel = computed(() =>
    Boolean(createInventoryItemStore.item.unidentifiedItemId) && !hiddenStats.value
);
// Режим двух колонок: включены скрытые характеристики (редактируем предмет + его маскировку)
const isSplitMode = computed(() => hiddenStats.value && !isUnidentifiedModel.value);
const previewImage = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const createInventoryItemStore = useCreateInventoryItemStore();
const inventoryStore = useInventoryStore();
const avatarImage = ref<File | null>(null);
const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff", "image/svg+xml"];
const filePath = ref<string>("");
const itemId = uuidv4();
const itemRarity = ref<string>("COMMON");
const typeSelectRef = ref<any>(null);
const selectedType = ref(createInventoryItemStore.item.typeName);
const selectedSubtype = ref(createInventoryItemStore.item.subtypeName ?? '');
const subtypeSelectRef = ref<any>(null);
const editedValues = ref<number | undefined>(0);
const viewType = ref<string>("ARMOR");
const visibleForPlayers = ref<boolean>(true);
const customization = ref<boolean>(false);
const hiddenStats = ref<boolean>(false);
// Свои бандлы, в которые можно сразу добавить создаваемый предмет
const myBundles = ref<ItemBundle[]>([]);
const selectedBundleIds = ref<string[]>([]);
// Показывать выбор бандлов: только при создании обычного (комнатного) предмета
const canAddToBundles = computed(() => !isBundleMode.value && !isUnidentifiedModel.value && myBundles.value.length > 0);
const unidentifiedFormItem = ref({
  name: { rus: '', eng: '' } as { rus: string; eng: string },
  description: '' as string,
  type: 'OTHER' as string,
  typeName: 'Прочее' as string,
  subtype: null as string | null,
  subtypeName: '' as string,
  rarity: 'COMMON' as string,
  imgUrl: '' as string,
  stats: {
    weight: undefined as number | undefined,
    armorClass: '' as string,
    armorClassMaxDexterityBonus: '' as string,
    requirement: '' as string,
    stealthDisadvantage: null as string | null,
    damage: { value: '' as string, damageType: 'CRUSHING' as string },
    priceValue: undefined as number | undefined,
    priceCoinType: 'GOLDEN' as string,
  }
})
const unidentifiedPreviewImage = ref<string | null>(null);
const unidentifiedFileInput = ref<HTMLInputElement | null>(null);
const unidentifiedAvatarImage = ref<File | null>(null);
const pendingUnidentifiedId = ref<string | undefined>(undefined);

function getOrCreateUnidentifiedId(): string {
  if (!pendingUnidentifiedId.value) {
    pendingUnidentifiedId.value = createInventoryItemStore.item.unidentifiedItemId ?? uuidv4();
  }
  return pendingUnidentifiedId.value;
}
const unidentifiedNoDexBonusLimit = ref(false)
const unidentifiedNoStrengthRequirement = ref(false)
const unidentifiedCustomization = ref(false)
const unidentifiedSelectedTagIds = ref<string[]>([])
const unidentifiedTagSearchQuery = ref<string>("")
const unidentifiedItemSkills = ref<ItemSkill[]>([])
const skillModalTarget = ref<'main' | 'unidentified'>('main')
const invalidFields = ref<string[]>([]); // Track invalid fields
const damageType = ref<string | undefined>("CRUSHING");
const damageValue = ref<string | undefined>("");
const defaultPriceValue = ref<number | undefined>(undefined);
const defaultPriceCoinType = ref<string>("GOLDEN");
const defaultPrice = ref<Price | undefined>({value: 0, coinType: "GOLDEN"});
const showEditItemSkillModal = ref(false); // Управляем видимостью модалки
const isEditingItemSkill = ref(false); // Управляем видимостью модалки
const editingItemSkill = ref<ItemSkill>(); // Управляем видимостью модалки
const createItemSkills = ref<ItemSkill[]>([]);
const noDexBonusLimit = ref<boolean>(false);
const noStrengthRequirement = ref<boolean>(false);
const ambientColor = ref<string | null>(null);

// Tag management
const availableTags = ref<ItemTagDto[]>([]);
const selectedTagIds = ref<string[]>([]);
const tagSearchQuery = ref<string>("");
const isCreatingTag = ref(false);

async function loadAvailableTags() {
  try {
    availableTags.value = await getTagsForRoom(tagsRoomId.value);
  } catch (e) {
    console.error("Failed to load tags", e);
  }
}

async function loadMyBundles() {
  // В режиме редактирования внутри бандла выбор бандлов не нужен
  if (isBundleMode.value) return;
  try {
    myBundles.value = await getOwnBundles();
  } catch (e) {
    console.error("Failed to load own bundles", e);
  }
}

function toggleBundleSelection(id: string) {
  const idx = selectedBundleIds.value.indexOf(id);
  if (idx >= 0) {
    selectedBundleIds.value.splice(idx, 1);
  } else {
    selectedBundleIds.value.push(id);
  }
}

const filteredAvailableTags = computed(() => {
  const q = tagSearchQuery.value.trim().toLowerCase();
  if (!q) return availableTags.value;
  return availableTags.value.filter(t => t.name.toLowerCase().includes(q));
});

const showCreateTagOption = computed(() => {
  const q = tagSearchQuery.value.trim();
  return q.length > 0 && !availableTags.value.some(t => t.name.toLowerCase() === q.toLowerCase());
});

const selectedTags = computed(() =>
  availableTags.value.filter(t => selectedTagIds.value.includes(t.id))
);

function toggleTag(tag: ItemTagDto) {
  const idx = selectedTagIds.value.indexOf(tag.id);
  if (idx >= 0) {
    selectedTagIds.value.splice(idx, 1);
  } else {
    selectedTagIds.value.push(tag.id);
  }
}

function removeSelectedTag(tagId: string) {
  selectedTagIds.value = selectedTagIds.value.filter(id => id !== tagId);
}

async function createAndSelectTag() {
  const name = tagSearchQuery.value.trim();
  if (!name || isCreatingTag.value) return;
  isCreatingTag.value = true;
  try {
    const newTag = await createTagForRoom(tagsRoomId.value, name);
    availableTags.value.push(newTag);
    selectedTagIds.value.push(newTag.id);
    tagSearchQuery.value = "";
  } catch (e) {
    console.error("Failed to create tag", e);
  } finally {
    isCreatingTag.value = false;
  }
}

// Метки для неопознанной модели (своё независимое состояние)
const filteredUnidentifiedTags = computed(() => {
  const q = unidentifiedTagSearchQuery.value.trim().toLowerCase();
  if (!q) return availableTags.value;
  return availableTags.value.filter(t => t.name.toLowerCase().includes(q));
});

const showCreateUnidentifiedTagOption = computed(() => {
  const q = unidentifiedTagSearchQuery.value.trim();
  return q.length > 0 && !availableTags.value.some(t => t.name.toLowerCase() === q.toLowerCase());
});

const unidentifiedSelectedTags = computed(() =>
  availableTags.value.filter(t => unidentifiedSelectedTagIds.value.includes(t.id))
);

function toggleUnidentifiedTag(tag: ItemTagDto) {
  const idx = unidentifiedSelectedTagIds.value.indexOf(tag.id);
  if (idx >= 0) {
    unidentifiedSelectedTagIds.value.splice(idx, 1);
  } else {
    unidentifiedSelectedTagIds.value.push(tag.id);
  }
}

function removeUnidentifiedSelectedTag(tagId: string) {
  unidentifiedSelectedTagIds.value = unidentifiedSelectedTagIds.value.filter(id => id !== tagId);
}

async function createAndSelectUnidentifiedTag() {
  const name = unidentifiedTagSearchQuery.value.trim();
  if (!name || isCreatingTag.value) return;
  isCreatingTag.value = true;
  try {
    const newTag = await createTagForRoom(tagsRoomId.value, name);
    availableTags.value.push(newTag);
    unidentifiedSelectedTagIds.value.push(newTag.id);
    unidentifiedTagSearchQuery.value = "";
  } catch (e) {
    console.error("Failed to create tag", e);
  } finally {
    isCreatingTag.value = false;
  }
}

const SKILL_IMAGE_PLACEHOLDER =
    "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";

const oldItemId = ref<string>();
const oldItemCount = ref<number | undefined>();
const WEIGHT_MAX_LENGTH = 4;

const cloneSkills = (skills: ItemSkill[] | undefined): ItemSkill[] => {
  if (!skills?.length) {
    return [];
  }
  try {
    return structuredClone(skills);
  } catch {
    return JSON.parse(JSON.stringify(skills)) as ItemSkill[];
  }
};


const closeEditItemSkillModal = () => {
  showEditItemSkillModal.value = false; // Закрываем модалку
};

const openEditItemSkillModal = (isEditing: boolean, itemSkill: ItemSkill | undefined, target: 'main' | 'unidentified' = 'main') => {
  skillModalTarget.value = target;
  isEditingItemSkill.value = isEditing;
  if (!isEditing) {
    editingItemSkill.value = itemSkill;
  } else if (isEditing && !itemSkill) {
    editingItemSkill.value = undefined;
  }
  showEditItemSkillModal.value = true;
};

onBeforeMount(async () => {
  await loadAvailableTags();
  void loadMyBundles();
  if (!createInventoryItemStore.item.type) {
    createInventoryItemStore.item.id = itemId;
    createInventoryItemStore.item.typeName = "Доспех";
    createInventoryItemStore.item.type = "ARMOR";
    createInventoryItemStore.item.stats = {
      armorClassMaxDexterityBonus: "",
      requirement: "",
      tags: [],
      tagIds: [],
      defaultPrice: [{value: 0, coinType: "GOLDEN"}],
    };
    createInventoryItemStore.item.name = {
      rus: '',
      eng: ''
    };
    createInventoryItemStore.item.description = "";
    createInventoryItemStore.item.rarity = "COMMON";
    createItemSkills.value = [];
    selectedTagIds.value = [];
  } else {
    viewType.value = createInventoryItemStore.item.type;
    const existingDamageType = createInventoryItemStore.item.stats.damage?.damageType;
    // Backward/forward compatibility for damage type codes
    damageType.value =
        existingDamageType === "BLUDGEONING"
            ? "CRUSHING"
            : existingDamageType === "PIERCING"
                ? "STABBING"
                : existingDamageType === "SLASHING"
                    ? "CHOPPING"
                    : existingDamageType;
    damageValue.value = createInventoryItemStore.item.stats?.damage?.value;
    const firstDefaultPrice = createInventoryItemStore.item.stats?.defaultPrice?.[0];
    defaultPrice.value = firstDefaultPrice ?? {value: 0, coinType: "GOLDEN"};
    defaultPriceCoinType.value = firstDefaultPrice?.coinType ?? "GOLDEN";
    defaultPriceValue.value = firstDefaultPrice?.value;
    itemRarity.value = createInventoryItemStore.item.rarity ? createInventoryItemStore.item.rarity : 'COMMON';
    oldItemId.value = createInventoryItemStore.inventoryItemId
    oldItemCount.value = createInventoryItemStore.item.count;
    if (!createInventoryItemStore.keepExistingId) {
      createInventoryItemStore.item.id = itemId;
    }
    noDexBonusLimit.value = createInventoryItemStore.item.stats.armorClassMaxDexterityBonus === "-1";
    noStrengthRequirement.value = createInventoryItemStore.item.stats.requirement === "-1";
    hiddenStats.value = createInventoryItemStore.item.hiddenStats ?? false;
    if (hiddenStats.value && createInventoryItemStore.item.unidentifiedItemId) {
      try {
        // Полная модель "неопознанного" вида приходит мастеру вложенной в предмет
        // (item.unidentifiedItem). Используем её; при отсутствии — пробуем догрузить по id.
        let d: any = createInventoryItemStore.item.unidentifiedItem;
        if (!d) {
          const resp = await axios.get(
            `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}/items/by-id/${createInventoryItemStore.item.unidentifiedItemId}`,
            { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
          );
          d = resp.data;
        }
        unidentifiedFormItem.value.name = d.name ?? { rus: '', eng: '' };
        unidentifiedFormItem.value.description = d.description ?? '';
        unidentifiedFormItem.value.imgUrl = d.imgUrl ?? '';
        unidentifiedFormItem.value.type = d.type ?? 'OTHER';
        unidentifiedFormItem.value.typeName = d.typeName ?? 'Прочее';
        unidentifiedFormItem.value.subtype = d.subtype ?? null;
        unidentifiedFormItem.value.subtypeName = d.subtypeName ?? '';
        unidentifiedFormItem.value.rarity = d.rarity ?? 'COMMON';
        const s = d.stats ?? {};
        unidentifiedFormItem.value.stats.weight = s.weight;
        unidentifiedFormItem.value.stats.armorClass = s.armorClass ?? '';
        unidentifiedFormItem.value.stats.armorClassMaxDexterityBonus = s.armorClassMaxDexterityBonus ?? '';
        unidentifiedFormItem.value.stats.requirement = s.requirement ?? '';
        unidentifiedFormItem.value.stats.stealthDisadvantage = s.stealthDisadvantage ?? null;
        unidentifiedFormItem.value.stats.damage = { value: s.damage?.value ?? '', damageType: s.damage?.damageType ?? 'CRUSHING' };
        const p = s.defaultPrice?.[0];
        unidentifiedFormItem.value.stats.priceValue = p?.value;
        unidentifiedFormItem.value.stats.priceCoinType = p?.coinType ?? 'GOLDEN';
        unidentifiedNoDexBonusLimit.value = s.armorClassMaxDexterityBonus === '-1';
        unidentifiedNoStrengthRequirement.value = s.requirement === '-1';
        unidentifiedCustomization.value = d.customization ?? false;
        unidentifiedItemSkills.value = cloneSkills(d.skills);
        if (s.tagIds?.length) {
          unidentifiedSelectedTagIds.value = [...s.tagIds];
        } else if (s.tags?.length) {
          unidentifiedSelectedTagIds.value = availableTags.value
            .filter(t => s.tags.includes(t.name))
            .map(t => t.id);
        } else {
          unidentifiedSelectedTagIds.value = [];
        }
      } catch { /* ignore */ }
    }
    createItemSkills.value = cloneSkills(createInventoryItemStore.item.skills);
    // Initialize selectedTagIds from existing tagIds or resolve from tag names
    if (createInventoryItemStore.item.stats.tagIds?.length) {
      selectedTagIds.value = [...createInventoryItemStore.item.stats.tagIds];
    } else if (createInventoryItemStore.item.stats.tags?.length) {
      selectedTagIds.value = availableTags.value
        .filter(t => createInventoryItemStore.item.stats.tags!.includes(t.name))
        .map(t => t.id);
    } else {
      selectedTagIds.value = [];
    }
  }
});

watch(noDexBonusLimit, (checked) => {
  if (checked) {
    createInventoryItemStore.item.stats.armorClassMaxDexterityBonus = "-1";
    invalidFields.value = invalidFields.value.filter(field => field !== 'armorClassMaxDexterityBonus');
  } else if (createInventoryItemStore.item.stats.armorClassMaxDexterityBonus === "-1") {
    createInventoryItemStore.item.stats.armorClassMaxDexterityBonus = "";
  }
});

watch(noStrengthRequirement, (checked) => {
  if (checked) {
    createInventoryItemStore.item.stats.requirement = "-1";
    invalidFields.value = invalidFields.value.filter(field => field !== 'requirement');
  } else if (createInventoryItemStore.item.stats.requirement === "-1") {
    createInventoryItemStore.item.stats.requirement = "";
  }
});

function openTypeSelect() {
  if (typeSelectRef.value?.$el?.open) {
    typeSelectRef.value.$el.open();
  } else if (typeSelectRef.value?.open) {
    typeSelectRef.value.open();
  } else {
    console.warn('ion-select не готов');
  }
}

watch(selectedType, (newValue) => {
  createInventoryItemStore.item.typeName = newValue;
  createInventoryItemStore.item.type = mapTypeToValue(newValue);
  viewType.value = mapTypeToValue(newValue);
  createInventoryItemStore.item.description = "";
  invalidFields.value = []; // Reset invalid fields on type change
});

watch(() => createInventoryItemStore.item.type, (newType) => {
  if (!['ARMOR', 'WEAPON'].includes(newType)) {
    selectedSubtype.value = '';
    createInventoryItemStore.item.subtypeName = '';
    return;
  }
  const firstOption = getSubtypesByType(newType)[0]?.label ?? '';
  selectedSubtype.value = firstOption;
  createInventoryItemStore.item.subtypeName = firstOption;
  invalidFields.value = []; // Reset invalid fields on type change
});


watch(defaultPriceValue, (newValue) => {
  if (!defaultPrice.value) {
    defaultPrice.value = {value: newValue, coinType: defaultPriceCoinType.value};
    return;
  }
  defaultPrice.value.value = newValue;
});

watch(defaultPriceCoinType, (newValue) => {
  if (!defaultPrice.value) {
    defaultPrice.value = {value: defaultPriceValue.value, coinType: newValue};
    return;
  }
  defaultPrice.value.coinType = newValue;
});


watch(damageValue, (newValue) => {
  if (newValue?.trim()) {
    invalidFields.value = invalidFields.value.filter(field => field !== 'damageValue');
  }
});

watch(damageType, (newValue) => {
  if (newValue?.trim()) {
    invalidFields.value = invalidFields.value.filter(field => field !== 'damageType');
  }
});

function openSubtypeSelect() {
  if (subtypeSelectRef.value?.$el?.open) {
    subtypeSelectRef.value.$el.open();
  } else if (subtypeSelectRef.value?.open) {
    subtypeSelectRef.value.open();
  }
}

watch(itemRarity, (newValue) => {
  createInventoryItemStore.item.rarity = newValue;
  if (validRarities.includes(newValue)) {
    invalidFields.value = invalidFields.value.filter(field => field !== 'itemRarity');
  }
});

function getSubtypesByType(type: string) {
  if (type === 'WEAPON') {
    return [
      {value: 'SHW', label: 'Простое рукопашное'},
      {value: 'SRW', label: 'Простое дальнобойное'},
      {value: 'AHW', label: 'Воинское рукопашное'},
      {value: 'ARW', label: 'Воинское дальнобойное'},
      {value: 'EHW', label: 'Экзотическое рукопашное'},
      {value: 'ERW', label: 'Экзотическое дальнобойное'},
    ];
  } else if (type === 'ARMOR') {
    return [
      {value: 'HEAVY_ARMOR', label: 'Тяжелый доспех'},
      {value: 'MEDIUM_ARMOR', label: 'Средний доспех'},
      {value: 'LIGHT_ARMOR', label: 'Легкий доспех'},
      {value: 'SHIELD', label: 'Щит'},
    ];
  }
  return [];
}

watch(selectedSubtype, (newValue) => {
  createInventoryItemStore.item.subtypeName = newValue;
  createInventoryItemStore.item.subtype = mapSubTypeToValue(newValue)
  if (newValue && getSubtypesByType(createInventoryItemStore.item.type).some(sub => sub.label === newValue)) {
    invalidFields.value = invalidFields.value.filter(field => field !== 'selectedSubtype');
  }
});

function onTypeNameChange(event: CustomEvent) {
  const selected = event.detail.value;
  createInventoryItemStore.item.typeName = selected;
  createInventoryItemStore.item.type = mapTypeToValue(selected);
  if (selected) {
    invalidFields.value = invalidFields.value.filter(field => field !== 'selectedType');
  }
}

function mapTypeToValue(display: string): string {
  switch (display) {
    case 'Доспех':
      return 'ARMOR';
    case 'Оружие':
      return 'WEAPON';
    case 'Магический предмет':
      return 'MAGIC_ITEM';
    case 'Другое':
      return 'OTHER';
    default:
      return 'OTHER';
  }
}

function mapSubTypeToValue(name: string): string | null {
  switch (name) {
    case 'Простое рукопашное':
      return 'SHW'
    case 'Простое дальнобойное':
      return 'SRW'
    case 'Воинское рукопашное':
      return 'AHW'
    case 'Воинское дальнобойное':
      return 'ARW'
    case 'Экзотическое рукопашное':
      return 'EHW'
    case 'Экзотическое дальнобойное':
      return 'ERW'
    case 'Тяжелый доспех':
      return 'HEAVY_ARMOR'
    case 'Средний доспех':
      return 'MEDIUM_ARMOR'
    case 'Легкий доспех':
      return 'LIGHT_ARMOR'
    case 'Щит':
      return 'SHIELD'
    case 'Магический предмет':
      return 'MAGIC_ITEM'
    default:
      return null;
  }
}

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0] || null;
  if (file && allowedFormats.includes(file.type)) {
    avatarImage.value = file;
    const reader = new FileReader();
    reader.onload = () => {
      previewImage.value = reader.result as string;
    };
    reader.readAsDataURL(file);
    filePath.value = await uploadToMinio(avatarImage.value, createInventoryItemStore.item.id);
    createInventoryItemStore.item.imgUrl = filePath.value;
  } else {
    alert("Формат файла не поддерживается. Разрешены: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG.");
  }
};

const uploadToMinio = async (file: File, filename: string): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userFilename", filename);
  const res = await axios.put(
      `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
  );
  return res.data;
};

const triggerUnidentifiedFileInput = () => {
  unidentifiedFileInput.value?.click();
};

const handleUnidentifiedFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0] || null;
  if (file && allowedFormats.includes(file.type)) {
    unidentifiedAvatarImage.value = file;
    const reader = new FileReader();
    reader.onload = () => {
      unidentifiedPreviewImage.value = reader.result as string;
    };
    reader.readAsDataURL(file);
    const uploadedPath = await uploadToMinio(unidentifiedAvatarImage.value, getOrCreateUnidentifiedId());
    unidentifiedFormItem.value.imgUrl = uploadedPath;
  } else {
    alert("Формат файла не поддерживается. Разрешены: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG.");
  }
};

const currentUnidentifiedImageUrl = computed(() => {
  if (unidentifiedPreviewImage.value) {
    return unidentifiedPreviewImage.value;
  }
  const imgUrl = unidentifiedFormItem.value.imgUrl;
  if (!imgUrl?.trim()) {
    return null;
  }
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
});

const sanitizeWeightInput = (rawValue: string): string => {
  if (!rawValue) {
    return "";
  }
  let cleaned = rawValue.replace(/[^\d.]/g, "");
  const firstDotIndex = cleaned.indexOf(".");
  if (firstDotIndex !== -1) {
    cleaned = cleaned.slice(0, firstDotIndex + 1) + cleaned.slice(firstDotIndex + 1).replace(/\./g, "");
  }
  if (cleaned.length > WEIGHT_MAX_LENGTH) {
    cleaned = cleaned.slice(0, WEIGHT_MAX_LENGTH);
  }
  return cleaned;
};

const parseWeightValue = (rawValue: string): number | undefined => {
  const cleaned = sanitizeWeightInput(rawValue);
  if (cleaned === "" || cleaned === ".") {
    return undefined;
  }
  const value = Number(cleaned);
  if (Number.isNaN(value)) {
    return undefined;
  }
  return value;
};

const startWeightEditing = () => {
  editedValues.value = createInventoryItemStore.item.stats.weight;
};

const updateWeightField = (event: Event) => {
  const target = event.target as HTMLElement | null;
  if (!target) {
    return;
  }
  const cleaned = sanitizeWeightInput(target.innerText || "");
  if (cleaned !== target.innerText) {
    target.innerText = cleaned;
  }
  editedValues.value = parseWeightValue(cleaned);
};

const saveWeightField = (event: Event) => {
  const target = event.target as HTMLElement | null;
  const rawValue = target?.innerText || "";
  const cleaned = sanitizeWeightInput(rawValue);
  if (target && cleaned !== target.innerText) {
    target.innerText = cleaned;
  }
  const value = parseWeightValue(cleaned);
  createInventoryItemStore.item.stats.weight = value;
  if (value !== undefined && value >= 0) {
    invalidFields.value = invalidFields.value.filter(field => field !== 'weight');
  }
};

const handleWeightKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target) {
    return;
  }
  const key = event.key;
  if (
      key === "Backspace" ||
      key === "Delete" ||
      key === "ArrowLeft" ||
      key === "ArrowRight" ||
      key === "ArrowUp" ||
      key === "ArrowDown" ||
      key === "Tab" ||
      key === "Home" ||
      key === "End" ||
      event.ctrlKey ||
      event.metaKey
  ) {
    return;
  }
  if (!/[\d.]/.test(key)) {
    event.preventDefault();
    return;
  }
  const selection = window.getSelection();
  const selectedLength = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).toString().length : 0;
  const currentValue = target.innerText || "";
  if (key === "." && currentValue.includes(".") && selectedLength === 0) {
    event.preventDefault();
    return;
  }
  if (currentValue.length - selectedLength >= WEIGHT_MAX_LENGTH) {
    event.preventDefault();
  }
};


async function getMyId() {
  const myIdResponse = await axios.get(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}/users/myId`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
  );
  return myIdResponse;
}

function createUnidentifiedModel() {
  const parentId = createInventoryItemStore.item.id;
  createInventoryItemStore.clearAll();
  createInventoryItemStore.item.unidentifiedItemId = parentId;
  createInventoryItemStore.item.roomId = String(route.params.roomId);
  router.push(`/rooms/${route.params.roomId}/characters/${route.params.characterId ?? '_'}/inventory/add`);
}

async function saveItem() {
  if (viewType.value == "WEAPON") {
    createInventoryItemStore.item.stats.damage = {
      damageType: damageType.value,
      value: damageValue.value
    };
    createInventoryItemStore.item.stats.armorClass = undefined;
    createInventoryItemStore.item.stats.requirement = undefined;
    createInventoryItemStore.item.stats.armorClassMaxDexterityBonus = undefined;
  } else if (viewType.value == "ARMOR") {
    createInventoryItemStore.item.stats.damage = undefined;
  } else {
    createInventoryItemStore.item.stats.damage = undefined;
    createInventoryItemStore.item.stats.armorClass = undefined;
    createInventoryItemStore.item.stats.requirement = undefined;
    createInventoryItemStore.item.stats.armorClassMaxDexterityBonus = undefined;
  }

  createInventoryItemStore.item.rarity = itemRarity.value;
  createInventoryItemStore.item.visibleForPlayers = visibleForPlayers.value;
  createInventoryItemStore.item.customization = customization.value;
  createInventoryItemStore.item.hiddenStats = hiddenStats.value;
  createInventoryItemStore.item.stats.defaultPrice = [{
    coinType: defaultPriceCoinType.value,
    value: defaultPriceValue.value ?? 0
  }];
  // Set tagIds for the backend; clear tags (names) to avoid confusion
  createInventoryItemStore.item.stats.tagIds = [...selectedTagIds.value];
  createInventoryItemStore.item.stats.tags = undefined;
  console.log(createItemSkills);
  createInventoryItemStore.item.skills = createItemSkills.value;
  console.log(createInventoryItemStore.item.skills);

  if (hiddenStats.value && !isUnidentifiedModel.value && !unidentifiedFormItem.value.name.rus.trim()) {
    const toast = await toastController.create({
      message: 'Укажите название видимого (неопознанного) предмета',
      duration: 1500,
      position: 'top'
    });
    await toast.present();
    return;
  }

  if (validateItem(viewType.value)) {
    invalidFields.value = [];

    try {
      const myIdResponse = await getMyId();
      createInventoryItemStore.item.creatorId = myIdResponse.data;
      createInventoryItemStore.item.creator = "user";
    } catch (e) {
      console.error("Не удалось получить идентификатор пользователя", e);
    }

    // Куда сохраняем: в бандл (вне комнаты) или в комнату
    const saveItemUrl = isBundleMode.value
        ? `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.bundles}/${bundleId.value}${GATEWAY_INTEGRATION_ROUTES.items}`
        : `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.items}`;

    // Создаём/обновляем неопознанную модель если включены скрытые характеристики
    if (hiddenStats.value && unidentifiedFormItem.value.name.rus.trim()) {
      try {
        const unidentifiedId = getOrCreateUnidentifiedId();
        const u = unidentifiedFormItem.value;
        const uStats: Record<string, unknown> = {
          defaultPrice: [{ value: u.stats.priceValue ?? 0, coinType: u.stats.priceCoinType }],
          weight: u.stats.weight,
          tagIds: [...unidentifiedSelectedTagIds.value],
        };
        if (u.type === 'ARMOR') {
          uStats.armorClass = u.stats.armorClass;
          uStats.armorClassMaxDexterityBonus = unidentifiedNoDexBonusLimit.value ? '-1' : u.stats.armorClassMaxDexterityBonus;
          uStats.requirement = unidentifiedNoStrengthRequirement.value ? '-1' : u.stats.requirement;
          uStats.stealthDisadvantage = u.stats.stealthDisadvantage;
        } else if (u.type === 'WEAPON') {
          uStats.damage = { value: u.stats.damage.value, damageType: u.stats.damage.damageType };
        }
        await axios.put(
          saveItemUrl,
          {
            id: unidentifiedId,
            name: u.name,
            description: u.description,
            type: u.type,
            typeName: u.typeName,
            subtype: u.subtype,
            subtypeName: u.subtypeName || undefined,
            rarity: u.rarity,
            roomId: isBundleMode.value ? undefined : route.params.roomId,
            imgUrl: u.imgUrl || undefined,
            stats: uStats,
            skills: unidentifiedItemSkills.value,
            visibleForPlayers: false,
            customization: unidentifiedCustomization.value,
            hiddenStats: false,
          },
          { headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
        );
        createInventoryItemStore.item.unidentifiedItemId = unidentifiedId;
      } catch (e) {
        console.error("Ошибка создания неопознанной модели:", e);
      }
    }

    try {
      await axios.put(
          saveItemUrl,
          createInventoryItemStore.item
          , {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          },
      );

      // Копируем созданный предмет в выбранные бандлы пользователя
      if (canAddToBundles.value && selectedBundleIds.value.length > 0) {
        const savedItemId = createInventoryItemStore.item.id;
        await Promise.all(
            selectedBundleIds.value.map(bId =>
                importBundleItems(bId, [savedItemId]).catch(e =>
                    console.error(`Не удалось добавить предмет в бандл ${bId}:`, e))
            )
        );
      }

      router.back();

      if (hasCharacterContext.value) {
        if (oldItemId.value && oldItemId.value !== itemId) {
          await deleteFromInventory(oldItemId.value);
          await addItemToInventory(itemId);
        } else if (!oldItemId.value) {
          await addItemToInventory(itemId);
        }
      }
    } catch (error) {
      console.error("Ошибка при получении данных:", error);
    }
    createInventoryItemStore.clearAll()
  } else {
    const toast = await toastController.create({
      message: 'Заполните обязательные поля',
      duration: 1000,
      position: 'top'
    });
    await toast.present();
  }
}

async function deleteFromInventory(id: string) {
  try {
    const response = await axios.delete(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}/${id.trim()}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
    inventoryStore.inventory = response.data;
    router.back();
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
}

async function addItemToInventory(id: string) {
  try {
    const response = await axios.put(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}/${id}/${oldItemCount.value ? oldItemCount.value : 1}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
    inventoryStore.inventory = response.data
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
  console.log(`Добавить в инвентарь ${oldItemCount.value ? oldItemCount.value : 1} предметов с ID: ${id}`);
}

const validRarities = ['COMMON', 'UNCOMMON', 'RARE', 'VERY_RARE', 'LEGENDARY'];

function validateItem(type: string): boolean {
  invalidFields.value = []; // Reset invalid fields
  const errors: string[] = [];

  if (!createInventoryItemStore.item) {
    errors.push("Отсутствует объект предмета");
    console.error("Валидация не пройдена: Отсутствует объект предмета");
    return false;
  }

  const {item} = createInventoryItemStore;

  // Validate basic required fields
  if (!item.typeName) {
    errors.push("Не указан тип предмета (typeName)");
    invalidFields.value.push('selectedType');
  }
  if (!item.type) {
    errors.push("Не указан тип предмета (type)");
    invalidFields.value.push('selectedType');
  }
  if (!item.rarity) {
    errors.push("Не указана редкость предмета (rarity)");
    invalidFields.value.push('itemRarity');
  }
  if (!item.name?.rus?.trim()) {
    errors.push("Не указано русское название предмета");
    invalidFields.value.push('nameRus');
  }
  if (!item.name?.eng?.trim()) {
    errors.push("Не указано английское название предмета");
    invalidFields.value.push('nameEng');
  }

  // Validate stats object
  if (!item.stats) {
    errors.push("Отсутствует объект характеристик (stats)");
    console.error("Валидация не пройдена: Отсутствует объект характеристик (stats)");
    return false;
  }

  // // Validate price
  // if (!item.stats.defaultPrice?.length) {
  //   console.warn("Отсутствует массив цен (defaultPrice), добавляем пустой объект");
  // } else {
  //   if (!item.stats.defaultPrice[0]?.value) {
  //     errors.push("Не указано значение цены (defaultPrice.value)");
  //     invalidFields.value.push('defaultPriceValue');
  //   } else if (item.stats.defaultPrice[0].value < 0) {
  //     errors.push("Значение цены не может быть отрицательным");
  //     invalidFields.value.push('defaultPriceValue');
  //   }
  //   if (!item.stats.defaultPrice[0]?.coinType) {
  //     errors.push("Не указан тип валюты (defaultPrice.coinType)");
  //     invalidFields.value.push('defaultPriceCoinType');
  //   }
  // }

  // Validate rarity
  if (!validRarities.includes(item.rarity!)) {
    errors.push(`Недопустимое значение редкости. Допустимые значения: ${validRarities.join(', ')}`);
    invalidFields.value.push('itemRarity');
  }

  // Type-specific validations
  if (type === "ARMOR") {
    if (item.subtypeName && !getSubtypesByType('ARMOR').some(sub => sub.label === item.subtypeName)) {
      errors.push(`Недопустимый подтип доспеха: ${item.subtypeName}`);
      invalidFields.value.push('selectedSubtype');
    }
    if (!item.stats.weight && item.stats.weight !== 0) {
      errors.push("Не указан вес доспеха (weight)");
      invalidFields.value.push('weight');
    } else if (item.stats.weight < 0) {
      errors.push("Вес доспеха не может быть отрицательным");
      invalidFields.value.push('weight');
    }
    if (!item.stats.armorClass?.trim()) {
      errors.push("Не указан класс брони (armorClass)");
      invalidFields.value.push('armorClass');
    }
    if (!noDexBonusLimit.value && !item.stats.armorClassMaxDexterityBonus?.trim()) {
      errors.push("Не указан максимальный бонус ловкости (armorClassMaxDexterityBonus)");
      invalidFields.value.push('armorClassMaxDexterityBonus');
    }
    if (!noStrengthRequirement.value && !item.stats.requirement?.trim()) {
      errors.push("Не указано требование силы (requirement)");
      invalidFields.value.push('requirement');
    }
  }

  if (type === "WEAPON") {
    if (item.subtypeName && !getSubtypesByType('WEAPON').some(sub => sub.label === item.subtypeName)) {
      errors.push(`Недопустимый подтип оружия: ${item.subtypeName}`);
      invalidFields.value.push('selectedSubtype');
    }
    if (!item.stats.damage) {
      errors.push("Отсутствует объект урона (damage)");
      invalidFields.value.push('damageValue');
    } else {
      if (!item.stats.damage.damageType?.trim()) {
        errors.push("Не указан тип урона (damage.damageType)");
        invalidFields.value.push('damageType');
      }
      if (!item.stats.damage.value?.trim()) {
        errors.push("Не указано значение урона (damage.value)");
        invalidFields.value.push('damageValue');
      }
    }
  }

  if (type === "OTHER" || type === "MAGIC" || type === "MAGIC_ITEM") {
    if (!item.stats.weight && item.stats.weight !== 0) {
      errors.push("Не указан вес предмета (weight)");
      invalidFields.value.push('weight');
    } else if (item.stats.weight < 0) {
      errors.push("Вес предмета не может быть отрицательным");
      invalidFields.value.push('weight');
    }
  }

  if (errors.length > 0) {
    console.error("Валидация не пройдена. Ошибки:", errors.join("; "));
    return false;
  }

  if (type !== "ARMOR" && type !== "WEAPON" && type !== "OTHER" && type !== "MAGIC" && type !== "MAGIC_ITEM") {
    errors.push(`Недопустимый тип предмета: ${type}`);
    console.error(`Валидация не пройдена: Недопустимый тип предмета: ${type}`);
    invalidFields.value.push('selectedType');
    return false;
  }

  return true;
}

function addItemSkill(itemSkill: ItemSkill) {
  if (skillModalTarget.value === 'unidentified') {
    unidentifiedItemSkills.value.push(itemSkill);
  } else {
    createItemSkills.value.push(itemSkill);
  }
}

function removeSkill(itemSkill: ItemSkill) {
  createItemSkills.value = createItemSkills.value.filter((skill) => skill !== itemSkill);
}

function removeUnidentifiedSkill(itemSkill: ItemSkill) {
  unidentifiedItemSkills.value = unidentifiedItemSkills.value.filter((skill) => skill !== itemSkill);
}

const getSkillImageUrl = (imgUrl: string | undefined) =>
    imgUrl != null && imgUrl.trim()
        ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.skills_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
        : SKILL_IMAGE_PLACEHOLDER;

const currentImageUrl = computed(() => {
  if (previewImage.value) {
    return previewImage.value;
  }
  const imgUrl = createInventoryItemStore.item.imgUrl;
  if (!imgUrl?.trim()) {
    return null;
  }
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
});

watch(currentImageUrl, (src) => {
  if (!src) {
    ambientColor.value = null;
    return;
  }
  void extractDominantColorFromUrl(src).then((color) => {
    if (src === currentImageUrl.value) {
      ambientColor.value = color;
    }
  });
}, {immediate: true});

watch(hiddenStats, (value) => {
  if(value) {
    visibleForPlayers.value = false;
  }
})

const hasSubtypes = computed(() =>
    ["ARMOR", "WEAPON"].includes(createInventoryItemStore.item?.type ?? "")
);

function onUnidentifiedTypeChange(event: CustomEvent) {
  const typeName = event.detail.value as string;
  unidentifiedFormItem.value.typeName = typeName;
  unidentifiedFormItem.value.type = mapTypeToValue(typeName);
  if (['ARMOR', 'WEAPON'].includes(unidentifiedFormItem.value.type)) {
    const firstOption = getSubtypesByType(unidentifiedFormItem.value.type)[0]?.label ?? '';
    unidentifiedFormItem.value.subtypeName = firstOption;
    unidentifiedFormItem.value.subtype = mapSubTypeToValue(firstOption);
  } else {
    unidentifiedFormItem.value.subtypeName = '';
    unidentifiedFormItem.value.subtype = null;
  }
}

function onUnidentifiedSubtypeChange(event: CustomEvent) {
  const subtypeName = event.detail.value as string;
  unidentifiedFormItem.value.subtypeName = subtypeName;
  unidentifiedFormItem.value.subtype = mapSubTypeToValue(subtypeName);
}

function clampUnidentifiedPrice() {
  if (unidentifiedFormItem.value.stats.priceValue != null && unidentifiedFormItem.value.stats.priceValue < 0) {
    unidentifiedFormItem.value.stats.priceValue = 0;
  }
}

function clampUnidentifiedWeight() {
  if (unidentifiedFormItem.value.stats.weight != null && unidentifiedFormItem.value.stats.weight < 0) {
    unidentifiedFormItem.value.stats.weight = 0;
  }
}

const rarityClass = computed(() => {
  switch (itemRarity.value) {
    case "UNCOMMON":
      return "rarity-uncommon";
    case "RARE":
      return "rarity-rare";
    case "VERY_RARE":
      return "rarity-very-rare";
    case "LEGENDARY":
      return "rarity-legendary";
    default:
      return "rarity-common";
  }
});

function getCoinIcon(coinType: string | undefined) {
  switch (coinType) {
    case "SILVER":
      return silverCoinIcon;
    case "COPPER":
      return copperCoinIcon;
    case "ELECTRUM":
      return electrumCoinIcon;
    case "PLATINUM":
      return platinumCoinIcon;
    case "GOLDEN":
    default:
      return goldenCoinIcon;
  }
}

const selectedCoinIcon = computed(() => getCoinIcon(defaultPriceCoinType.value));

function getTypeAbbreviation(typeName: string | undefined): string {
  if (!typeName?.trim()) return "—";
  const name = typeName.trim();
  if (name === HEADERS.other.rus || name === "Другое" || name === "Прочее") return "П";
  if (name === HEADERS.armor.rus || name === "Доспех") return "Д";
  if (name === HEADERS.weapon.rus || name === "Оружие") return "О";
  if (name === HEADERS.magic_items.rus || name === "Магический предмет") return "М";
  return name.charAt(0).toUpperCase();
}

function getSubtypeAbbreviation(subtypeName: string | undefined): string {
  if (!subtypeName?.trim()) return "—";
  return subtypeName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
}

function getRefillLabel(refill: ItemSkill["chargesRefill"]): string {
  return refill === "SHORT_REST" ? "короткий отдых" : "долгий отдых";
}

function cancelEdit() {
  router.back();
}
</script>

<template>
  <ion-page class="item-page-root">
    <ion-header>
      <ion-toolbar color="dark" class="item-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/" text=""/>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="item-ion-content" color="dark">
      <div class="item-page">
        <div v-if="!isSplitMode" class="item-header">
          <button
              type="button"
              class="avatar"
              :class="rarityClass"
              :style="ambientColor ? { '--ambient-color': ambientColor } : undefined"
              @click="triggerFileInput"
          >
            <div v-if="currentImageUrl" class="avatar-ambient" aria-hidden="true">
              <img :src="currentImageUrl" alt="" class="avatar-ambient__img"/>
            </div>
            <img
                v-if="previewImage"
                :src="previewImage"
                class="avatar-img"
                alt=""
            />
            <img
                v-else-if="createInventoryItemStore.item.imgUrl"
                :src="currentImageUrl ?? undefined"
                class="avatar-img"
                alt=""
            />
            <div v-else class="avatar-placeholder">
              <ion-icon :icon="add" class="avatar-placeholder__icon"/>
              <span class="avatar-placeholder__text">Фото</span>
            </div>
            <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="avatar-file-input"
                @change="handleFileUpload"
            />
          </button>

          <div class="stats">
            <div class="stat">
              <span class="stat__label">Тип</span>
              <span
                  class="stat-value"
                  :class="{ 'invalid-field': invalidFields.includes('selectedType') }"
                  @click="openTypeSelect"
              >
                {{ getTypeAbbreviation(createInventoryItemStore.item?.typeName) }}
              </span>
              <ion-select
                  ref="typeSelectRef"
                  :value="createInventoryItemStore.item.typeName"
                  interface="action-sheet"
                  v-model="selectedType"
                  @ionChange="onTypeNameChange($event)"
                  class="hidden-select"
              >
                <ion-select-option :value="HEADERS.armor.rus">{{ HEADERS.armor.rus }}</ion-select-option>
                <ion-select-option :value="HEADERS.weapon.rus">{{ HEADERS.weapon.rus }}</ion-select-option>
                <ion-select-option :value="HEADERS.magic_items.rus">{{ HEADERS.magic_items.rus }}</ion-select-option>
                <ion-select-option :value="HEADERS.other.rus">{{ HEADERS.other.rus }}</ion-select-option>
              </ion-select>
            </div>

            <div v-if="hasSubtypes" class="stat">
              <span class="stat__label">Подтип</span>
              <span
                  class="stat-value stat-value--wide"
                  :class="{ 'invalid-field': invalidFields.includes('selectedSubtype') }"
                  @click="openSubtypeSelect"
              >
                {{ getSubtypeAbbreviation(createInventoryItemStore.item.subtypeName) }}
              </span>
              <ion-select
                  ref="subtypeSelectRef"
                  interface="action-sheet"
                  :value="selectedSubtype"
                  v-model="selectedSubtype"
                  class="hidden-select"
              >
                <ion-select-option
                    v-for="option in getSubtypesByType(createInventoryItemStore.item.type)"
                    :key="option.value"
                    :value="option.label"
                >
                  {{ option.label }}
                </ion-select-option>
              </ion-select>
            </div>

          </div>
        </div>

        <div v-if="isUnidentifiedModel" class="unidentified-banner">
          <ion-icon :icon="eyeOutline" class="unidentified-banner__icon"/>
          Неопознанная модель предмета
        </div>

        <div v-if="!isSplitMode" class="item-identity">
          <ion-input
              v-model="createInventoryItemStore.item.name.rus"
              type="text"
              class="identity-input identity-input--name"
              :placeholder="viewType === 'ARMOR' ? TEXTS.rus_armor_name.rus : viewType === 'WEAPON' ? TEXTS.rus_weapon_name.rus : TEXTS.rus_other_name.rus"
              :class="{ 'invalid-field': invalidFields.includes('nameRus') }"
              @ionInput="invalidFields = invalidFields.filter(field => field !== 'nameRus')"
          />
          <ion-input
              v-model="createInventoryItemStore.item.name.eng"
              type="text"
              class="identity-input identity-input--eng"
              :placeholder="viewType === 'ARMOR' ? TEXTS.eng_armor_name.rus : viewType === 'WEAPON' ? TEXTS.eng_weapon_name.rus : TEXTS.eng_other_name.rus"
              :class="{ 'invalid-field': invalidFields.includes('nameEng') }"
              @ionInput="invalidFields = invalidFields.filter(field => field !== 'nameEng')"
          />
        </div>

        <div class="item-details">
          <div :class="isSplitMode ? 'panels-split' : ''">
          <div v-if="isSplitMode" class="panels-col">
          <section class="panel panel--unidentified">
            <h2 class="panel__title">До опознания</h2>

            <div class="unidentified-header">
              <button
                  type="button"
                  class="avatar avatar--sm"
                  @click="triggerUnidentifiedFileInput"
              >
                <img
                    v-if="unidentifiedPreviewImage"
                    :src="unidentifiedPreviewImage"
                    class="avatar-img"
                    alt=""
                />
                <img
                    v-else-if="unidentifiedFormItem.imgUrl"
                    :src="currentUnidentifiedImageUrl ?? undefined"
                    class="avatar-img"
                    alt=""
                />
                <div v-else class="avatar-placeholder">
                  <ion-icon :icon="add" class="avatar-placeholder__icon"/>
                  <span class="avatar-placeholder__text">Фото</span>
                </div>
                <input
                    ref="unidentifiedFileInput"
                    type="file"
                    accept="image/*"
                    class="avatar-file-input"
                    @change="handleUnidentifiedFileUpload"
                />
              </button>

              <div class="item-identity item-identity--compact">
                <ion-input
                    v-model="unidentifiedFormItem.name.rus"
                    type="text"
                    class="identity-input identity-input--name"
                    placeholder="Загадочный предмет"
                />
                <ion-input
                    v-model="unidentifiedFormItem.name.eng"
                    type="text"
                    class="identity-input identity-input--eng"
                    placeholder="Mysterious item"
                />
              </div>
            </div>

            <div class="details-grid">
              <div class="detail-row">
                <span class="detail-row__label">Тип</span>
                <ion-select
                    v-model="unidentifiedFormItem.typeName"
                    interface="action-sheet"
                    class="detail-row__select"
                    @ionChange="onUnidentifiedTypeChange($event)"
                >
                  <ion-select-option :value="HEADERS.armor.rus">{{ HEADERS.armor.rus }}</ion-select-option>
                  <ion-select-option :value="HEADERS.weapon.rus">{{ HEADERS.weapon.rus }}</ion-select-option>
                  <ion-select-option :value="HEADERS.magic_items.rus">{{ HEADERS.magic_items.rus }}</ion-select-option>
                  <ion-select-option :value="HEADERS.other.rus">{{ HEADERS.other.rus }}</ion-select-option>
                </ion-select>
              </div>

              <div v-if="unidentifiedFormItem.type === 'ARMOR' || unidentifiedFormItem.type === 'WEAPON'" class="detail-row">
                <span class="detail-row__label">Подтип</span>
                <ion-select
                    v-model="unidentifiedFormItem.subtypeName"
                    interface="action-sheet"
                    class="detail-row__select"
                    @ionChange="onUnidentifiedSubtypeChange($event)"
                >
                  <ion-select-option
                      v-for="option in getSubtypesByType(unidentifiedFormItem.type)"
                      :key="option.value"
                      :value="option.label"
                  >{{ option.label }}</ion-select-option>
                </ion-select>
              </div>

              <div class="detail-row">
                <span class="detail-row__label">Редкость</span>
                <ion-select
                    v-model="unidentifiedFormItem.rarity"
                    interface="action-sheet"
                    class="detail-row__select"
                >
                  <ion-select-option value="COMMON">Обычный</ion-select-option>
                  <ion-select-option value="UNCOMMON">Необычный</ion-select-option>
                  <ion-select-option value="RARE">Редкий</ion-select-option>
                  <ion-select-option value="VERY_RARE">Очень редкий</ion-select-option>
                  <ion-select-option value="LEGENDARY">Легендарный</ion-select-option>
                </ion-select>
              </div>

              <div class="detail-row">
                <span class="detail-row__label">Цена</span>
                <div class="price-input-group">
                  <ion-input
                      v-model="unidentifiedFormItem.stats.priceValue"
                      type="number"
                      inputmode="numeric"
                      :min="0"
                      class="detail-row__input detail-row__input--price"
                      placeholder="0"
                      @ionInput="clampUnidentifiedPrice"
                  />
                  <div class="coin-select-wrap">
                    <ion-icon class="coin-select-wrap__icon" :src="getCoinIcon(unidentifiedFormItem.stats.priceCoinType)" aria-hidden="true"/>
                    <ion-select
                        v-model="unidentifiedFormItem.stats.priceCoinType"
                        interface="action-sheet"
                        aria-label="Монета"
                        class="coin-select-wrap__select"
                    >
                      <ion-select-option value="COPPER">Медные монеты</ion-select-option>
                      <ion-select-option value="SILVER">Серебряные монеты</ion-select-option>
                      <ion-select-option value="GOLDEN">Золотые монеты</ion-select-option>
                      <ion-select-option value="ELECTRUM">Электрумовые монеты</ion-select-option>
                      <ion-select-option value="PLATINUM">Платиновые монеты</ion-select-option>
                    </ion-select>
                  </div>
                </div>
              </div>

              <div class="detail-row">
                <span class="detail-row__label">{{ TEXTS.weight.rus }}</span>
                <ion-input
                    v-model="unidentifiedFormItem.stats.weight"
                    type="number"
                    inputmode="decimal"
                    :min="0"
                    class="detail-row__input"
                    placeholder="0"
                    @ionInput="clampUnidentifiedWeight"
                />
              </div>

              <!-- ARMOR specific -->
              <div v-if="unidentifiedFormItem.type === 'ARMOR'" class="detail-row">
                <span class="detail-row__label">{{ HEADERS.armoryClass.rus }}</span>
                <ion-input v-model="unidentifiedFormItem.stats.armorClass" type="number" inputmode="numeric" class="detail-row__input" />
              </div>
              <div v-if="unidentifiedFormItem.type === 'ARMOR'" class="detail-row detail-row--with-extra">
                <div class="detail-row__left">
                  <span class="detail-row__label">{{ HEADERS.max_dex_bonus.rus }}</span>
                  <label class="detail-row__checkbox">
                    <ion-checkbox v-model="unidentifiedNoDexBonusLimit"/>
                    <span>Нет ограничений</span>
                  </label>
                </div>
                <ion-input
                    :value="unidentifiedNoDexBonusLimit ? '' : unidentifiedFormItem.stats.armorClassMaxDexterityBonus"
                    type="number"
                    inputmode="numeric"
                    class="detail-row__input"
                    :disabled="unidentifiedNoDexBonusLimit"
                    @ionInput="unidentifiedFormItem.stats.armorClassMaxDexterityBonus = $event.detail.value"
                />
              </div>
              <div v-if="unidentifiedFormItem.type === 'ARMOR'" class="detail-row detail-row--with-extra">
                <div class="detail-row__left">
                  <span class="detail-row__label">{{ HEADERS.force_requirements.rus }}</span>
                  <label class="detail-row__checkbox">
                    <ion-checkbox v-model="unidentifiedNoStrengthRequirement"/>
                    <span>Нет требований</span>
                  </label>
                </div>
                <ion-input
                    :value="unidentifiedNoStrengthRequirement ? '' : unidentifiedFormItem.stats.requirement"
                    type="number"
                    inputmode="numeric"
                    class="detail-row__input"
                    :disabled="unidentifiedNoStrengthRequirement"
                    @ionInput="unidentifiedFormItem.stats.requirement = $event.detail.value"
                />
              </div>
              <div v-if="unidentifiedFormItem.type === 'ARMOR'" class="detail-row">
                <span class="detail-row__label">Скрытность</span>
                <ion-select v-model="unidentifiedFormItem.stats.stealthDisadvantage" interface="action-sheet" class="detail-row__select" placeholder="Не указано">
                  <ion-select-option :value="null">Не указано</ion-select-option>
                  <ion-select-option value="DISADVANTAGE">Помеха</ion-select-option>
                  <ion-select-option value="NORMAL">Без помехи</ion-select-option>
                </ion-select>
              </div>

              <!-- WEAPON specific -->
              <div v-if="unidentifiedFormItem.type === 'WEAPON'" class="detail-row detail-row--with-extra">
                <div class="detail-row__left">
                  <span class="detail-row__label">{{ HEADERS.damage.rus }}</span>
                  <p class="damage-hint">Примеры: <b>1d6 + STR</b>, <b>2d8 + 1</b></p>
                </div>
                <ion-input v-model="unidentifiedFormItem.stats.damage.value" type="text" class="detail-row__input" placeholder="1d6 + STR" />
              </div>
              <div v-if="unidentifiedFormItem.type === 'WEAPON'" class="detail-row">
                <span class="detail-row__label">{{ HEADERS.damageType.rus }}</span>
                <ion-select v-model="unidentifiedFormItem.stats.damage.damageType" interface="action-sheet" class="detail-row__select">
                  <ion-select-option value="STABBING">Колющий</ion-select-option>
                  <ion-select-option value="CHOPPING">Рубящий</ion-select-option>
                  <ion-select-option value="CRUSHING">Дробящий</ion-select-option>
                  <ion-select-option value="ACID">Кислотный</ion-select-option>
                  <ion-select-option value="COLD">Холодом</ion-select-option>
                  <ion-select-option value="FIRE">Огненный</ion-select-option>
                  <ion-select-option value="FORCE">Силовой</ion-select-option>
                  <ion-select-option value="LIGHTNING">Электрический</ion-select-option>
                  <ion-select-option value="NECROTIC">Некротический</ion-select-option>
                  <ion-select-option value="POISON">Ядовитый</ion-select-option>
                  <ion-select-option value="PSYCHIC">Психический</ion-select-option>
                  <ion-select-option value="RADIANT">Сияющий</ion-select-option>
                  <ion-select-option value="THUNDER">Громовой</ion-select-option>
                </ion-select>
              </div>

              <div class="detail-row">
                <span class="detail-row__label">{{ HEADERS.need_customization.rus }}</span>
                <div class="detail-row__control-slot">
                  <ion-toggle v-model="unidentifiedCustomization"/>
                </div>
              </div>
            </div>

            <div class="tags-block">
              <div class="tags-block__label">{{ HEADERS.tags.rus }}</div>
              <div class="tags" v-if="unidentifiedSelectedTags.length">
                <button
                    v-for="tag in unidentifiedSelectedTags"
                    :key="tag.id"
                    type="button"
                    class="tag tag--removable"
                    :title="tag.description"
                    @click="removeUnidentifiedSelectedTag(tag.id)"
                >
                  {{ tag.name }}
                  <span class="tag__remove" aria-hidden="true">×</span>
                </button>
              </div>
              <div class="tag-input-row">
                <ion-input
                    v-model="unidentifiedTagSearchQuery"
                    type="text"
                    placeholder="Поиск тегов..."
                    class="tag-input"
                    @keydown.enter.prevent="showCreateUnidentifiedTagOption ? createAndSelectUnidentifiedTag() : undefined"
                />
              </div>
              <div v-if="unidentifiedTagSearchQuery.trim() || filteredUnidentifiedTags.length" class="tag-dropdown">
                <button
                    v-for="tag in filteredUnidentifiedTags"
                    :key="tag.id"
                    type="button"
                    :class="['tag-dropdown__item', { 'tag-dropdown__item--selected': unidentifiedSelectedTagIds.includes(tag.id) }]"
                    @click="toggleUnidentifiedTag(tag)"
                >
                  <span class="tag-dropdown__name">{{ tag.name }}</span>
                  <span v-if="tag.description" class="tag-dropdown__desc">{{ tag.description }}</span>
                </button>
                <button
                    v-if="showCreateUnidentifiedTagOption"
                    type="button"
                    class="tag-dropdown__item tag-dropdown__item--create"
                    :disabled="isCreatingTag"
                    @click="createAndSelectUnidentifiedTag"
                >
                  + Создать тег «{{ unidentifiedTagSearchQuery.trim() }}»
                </button>
              </div>
            </div>

          </section>

          <section class="panel panel--unidentified">
            <h2 class="panel__title">{{ HEADERS.description.rus }}</h2>
            <ion-textarea
                v-model="unidentifiedFormItem.description"
                class="description-input"
                placeholder="Описание до опознания..."
                :rows="8"
                auto-grow
            />
          </section>

          <section class="panel panel--unidentified panel--skills">
            <h2 class="panel__title">Навыки предмета</h2>
            <div v-if="unidentifiedItemSkills.length" class="skills-list">
              <div
                  v-for="skill in unidentifiedItemSkills"
                  :key="skill.id"
                  class="skill-card"
              >
                <div class="skill-card__media">
                  <img
                      class="skill-card__img"
                      :src="getSkillImageUrl(skill.imgUrl)"
                      :alt="skill.name.rus"
                      @error="($event.target as HTMLImageElement).src = SKILL_IMAGE_PLACEHOLDER"
                  />
                </div>
                <div class="skill-card__body">
                  <div class="skill-card__name">{{ skill.name.rus }}</div>
                  <div v-if="skill.shortDescription" class="skill-card__desc">{{ skill.shortDescription }}</div>
                  <div class="skill-card__meta">
                    Зарядов: {{ skill.charges }} · {{ getRefillLabel(skill.chargesRefill) }}
                  </div>
                </div>
                <div class="skill-card__actions">
                  <ion-button size="small" shape="round" fill="clear" @click="openEditItemSkillModal(false, skill, 'unidentified')">
                    <ion-icon slot="icon-only" :icon="pencilOutline"/>
                  </ion-button>
                  <ion-button size="small" shape="round" fill="clear" color="danger" @click="removeUnidentifiedSkill(skill)">
                    <ion-icon slot="icon-only" :icon="trashOutline"/>
                  </ion-button>
                </div>
              </div>
            </div>
            <ion-button
                class="add-skill-btn"
                expand="block"
                fill="outline"
                shape="round"
                @click="openEditItemSkillModal(true, undefined, 'unidentified')"
            >
              <ion-icon slot="start" :icon="addOutline"/>
              Добавить навык
            </ion-button>
          </section>
          </div>

          <div class="panels-col">
          <section class="panel">
            <h2 class="panel__title">
              <template v-if="isSplitMode">После опознания</template>
              <template v-else>Характеристики</template>
            </h2>

            <div v-if="isSplitMode" class="unidentified-header">
              <button
                  type="button"
                  class="avatar avatar--sm"
                  :class="rarityClass"
                  @click="triggerFileInput"
              >
                <img
                    v-if="previewImage"
                    :src="previewImage"
                    class="avatar-img"
                    alt=""
                />
                <img
                    v-else-if="createInventoryItemStore.item.imgUrl"
                    :src="currentImageUrl ?? undefined"
                    class="avatar-img"
                    alt=""
                />
                <div v-else class="avatar-placeholder">
                  <ion-icon :icon="add" class="avatar-placeholder__icon"/>
                  <span class="avatar-placeholder__text">Фото</span>
                </div>
                <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    class="avatar-file-input"
                    @change="handleFileUpload"
                />
              </button>

              <div class="item-identity item-identity--compact">
                <ion-input
                    v-model="createInventoryItemStore.item.name.rus"
                    type="text"
                    class="identity-input identity-input--name"
                    :placeholder="viewType === 'ARMOR' ? TEXTS.rus_armor_name.rus : viewType === 'WEAPON' ? TEXTS.rus_weapon_name.rus : TEXTS.rus_other_name.rus"
                    :class="{ 'invalid-field': invalidFields.includes('nameRus') }"
                    @ionInput="invalidFields = invalidFields.filter(field => field !== 'nameRus')"
                />
                <ion-input
                    v-model="createInventoryItemStore.item.name.eng"
                    type="text"
                    class="identity-input identity-input--eng"
                    :placeholder="viewType === 'ARMOR' ? TEXTS.eng_armor_name.rus : viewType === 'WEAPON' ? TEXTS.eng_weapon_name.rus : TEXTS.eng_other_name.rus"
                    :class="{ 'invalid-field': invalidFields.includes('nameEng') }"
                    @ionInput="invalidFields = invalidFields.filter(field => field !== 'nameEng')"
                />
              </div>
            </div>

            <div class="details-grid">
              <div v-if="isSplitMode" class="detail-row">
                <span class="detail-row__label">Тип</span>
                <ion-select
                    v-model="selectedType"
                    interface="action-sheet"
                    class="detail-row__select"
                    :class="{ 'invalid-field': invalidFields.includes('selectedType') }"
                    @ionChange="onTypeNameChange($event)"
                >
                  <ion-select-option :value="HEADERS.armor.rus">{{ HEADERS.armor.rus }}</ion-select-option>
                  <ion-select-option :value="HEADERS.weapon.rus">{{ HEADERS.weapon.rus }}</ion-select-option>
                  <ion-select-option :value="HEADERS.magic_items.rus">{{ HEADERS.magic_items.rus }}</ion-select-option>
                  <ion-select-option :value="HEADERS.other.rus">{{ HEADERS.other.rus }}</ion-select-option>
                </ion-select>
              </div>

              <div v-if="isSplitMode && hasSubtypes" class="detail-row">
                <span class="detail-row__label">Подтип</span>
                <ion-select
                    v-model="selectedSubtype"
                    interface="action-sheet"
                    class="detail-row__select"
                    :class="{ 'invalid-field': invalidFields.includes('selectedSubtype') }"
                >
                  <ion-select-option
                      v-for="option in getSubtypesByType(createInventoryItemStore.item.type)"
                      :key="option.value"
                      :value="option.label"
                  >{{ option.label }}</ion-select-option>
                </ion-select>
              </div>

              <div class="detail-row">
                <span class="detail-row__label">Цена</span>
                <div
                    class="price-input-group"
                    :class="{ 'invalid-field': invalidFields.includes('defaultPriceValue') || invalidFields.includes('defaultPriceCoinType') }"
                >
                  <ion-input
                      v-model="defaultPriceValue"
                      type="number"
                      inputmode="numeric"
                      :min="0"
                      class="detail-row__input detail-row__input--price"
                      placeholder="0"
                      @ionInput="if (defaultPriceValue != null && defaultPriceValue < 0) defaultPriceValue = 0; invalidFields = invalidFields.filter(f => f !== 'defaultPriceValue')"
                  />
                  <div class="coin-select-wrap">
                    <ion-icon class="coin-select-wrap__icon" :src="selectedCoinIcon" aria-hidden="true"/>
                    <ion-select
                        v-model="defaultPriceCoinType"
                        interface="action-sheet"
                        aria-label="Монета"
                        class="coin-select-wrap__select"
                        @ionChange="invalidFields = invalidFields.filter(f => f !== 'defaultPriceCoinType')"
                    >
                      <ion-select-option value="COPPER">Медные монеты</ion-select-option>
                      <ion-select-option value="SILVER">Серебряные монеты</ion-select-option>
                      <ion-select-option value="GOLDEN">Золотые монеты</ion-select-option>
                      <ion-select-option value="ELECTRUM">Электрумовые монеты</ion-select-option>
                      <ion-select-option value="PLATINUM">Платиновые монеты</ion-select-option>
                    </ion-select>
                  </div>
                </div>
              </div>

              <div class="detail-row">
                <span class="detail-row__label">{{ TEXTS.weight.rus }}</span>
                <span
                    class="detail-row__input detail-row__input--weight"
                    contenteditable="true"
                    @focus="startWeightEditing()"
                    @blur="saveWeightField($event)"
                    @input="updateWeightField($event)"
                    @keydown="handleWeightKeydown($event)"
                    @keydown.enter.prevent="saveWeightField($event)"
                    :class="{ 'invalid-field': invalidFields.includes('weight') }"
                >{{ createInventoryItemStore.item?.stats?.weight ?? '' }}</span>
              </div>

              <div v-if="viewType === 'ARMOR'" class="detail-row">
                <span class="detail-row__label">{{ HEADERS.armoryClass.rus }}</span>
                <ion-input
                    v-model="createInventoryItemStore.item.stats.armorClass"
                    type="number"
                    inputmode="numeric"
                    class="detail-row__input"
                    :class="{ 'invalid-field': invalidFields.includes('armorClass') }"
                    @ionInput="invalidFields = invalidFields.filter(field => field !== 'armorClass')"
                />
              </div>

              <div v-if="viewType === 'ARMOR'" class="detail-row detail-row--with-extra">
                <div class="detail-row__left">
                  <span class="detail-row__label">{{ HEADERS.max_dex_bonus.rus }}</span>
                  <label class="detail-row__checkbox">
                    <ion-checkbox v-model="noDexBonusLimit"/>
                    <span>Нет ограничений</span>
                  </label>
                </div>
                <ion-input
                    :value="noDexBonusLimit ? '' : createInventoryItemStore.item.stats.armorClassMaxDexterityBonus"
                    type="number"
                    inputmode="numeric"
                    class="detail-row__input"
                    :disabled="noDexBonusLimit"
                    :class="{ 'invalid-field': invalidFields.includes('armorClassMaxDexterityBonus') }"
                    @ionInput="createInventoryItemStore.item.stats.armorClassMaxDexterityBonus = $event.detail.value; invalidFields = invalidFields.filter(field => field !== 'armorClassMaxDexterityBonus')"
                />
              </div>

              <div v-if="viewType === 'ARMOR'" class="detail-row detail-row--with-extra">
                <div class="detail-row__left">
                  <span class="detail-row__label">{{ HEADERS.force_requirements.rus }}</span>
                  <label class="detail-row__checkbox">
                    <ion-checkbox v-model="noStrengthRequirement"/>
                    <span>Нет требований</span>
                  </label>
                </div>
                <ion-input
                    :value="noStrengthRequirement ? '' : createInventoryItemStore.item.stats.requirement"
                    type="number"
                    inputmode="numeric"
                    class="detail-row__input"
                    :disabled="noStrengthRequirement"
                    :class="{ 'invalid-field': invalidFields.includes('requirement') }"
                    @ionInput="createInventoryItemStore.item.stats.requirement = $event.detail.value; invalidFields = invalidFields.filter(field => field !== 'requirement')"
                />
              </div>

              <div v-if="viewType === 'ARMOR'" class="detail-row">
                <span class="detail-row__label">Скрытность</span>
                <ion-select
                    v-model="createInventoryItemStore.item.stats.stealthDisadvantage"
                    interface="action-sheet"
                    class="detail-row__select"
                    placeholder="Не указано"
                >
                  <ion-select-option :value="null">Не указано</ion-select-option>
                  <ion-select-option value="DISADVANTAGE">Помеха</ion-select-option>
                  <ion-select-option value="NORMAL">Без помехи</ion-select-option>
                </ion-select>
              </div>

              <div v-if="viewType === 'WEAPON'" class="detail-row detail-row--with-extra">
                <div class="detail-row__left">
                  <span class="detail-row__label">{{ HEADERS.damage.rus }}</span>
                  <p class="damage-hint">
                    Примеры: <b>1d6 + STR</b>, <b>2d8 + 1 + WIS</b>
                  </p>
                </div>
                <ion-input
                    v-model="damageValue"
                    type="text"
                    class="detail-row__input"
                    placeholder="1d6 + STR"
                    :class="{ 'invalid-field': invalidFields.includes('damageValue') }"
                    @ionInput="invalidFields = invalidFields.filter(field => field !== 'damageValue')"
                />
              </div>

              <div v-if="viewType === 'WEAPON'" class="detail-row">
                <span class="detail-row__label">{{ HEADERS.damageType.rus }}</span>
                <ion-select
                    v-model="damageType"
                    interface="action-sheet"
                    class="detail-row__select"
                    :class="{ 'invalid-field': invalidFields.includes('damageType') }"
                    @ionChange="invalidFields = invalidFields.filter(field => field !== 'damageType')"
                >
                  <ion-select-option value="STABBING">Колющий</ion-select-option>
                  <ion-select-option value="CHOPPING">Рубящий</ion-select-option>
                  <ion-select-option value="CRUSHING">Дробящий</ion-select-option>
                  <ion-select-option value="ACID">Кислотный</ion-select-option>
                  <ion-select-option value="COLD">Холодом</ion-select-option>
                  <ion-select-option value="FIRE">Огненный</ion-select-option>
                  <ion-select-option value="FORCE">Силовой</ion-select-option>
                  <ion-select-option value="LIGHTNING">Электрический</ion-select-option>
                  <ion-select-option value="NECROTIC">Некротический</ion-select-option>
                  <ion-select-option value="POISON">Ядовитый</ion-select-option>
                  <ion-select-option value="PSYCHIC">Психический</ion-select-option>
                  <ion-select-option value="RADIANT">Сияющий</ion-select-option>
                  <ion-select-option value="THUNDER">Громовой</ion-select-option>
                </ion-select>
              </div>

              <div class="detail-row">
                <span class="detail-row__label">Редкость</span>
                <ion-select
                    v-model="itemRarity"
                    interface="action-sheet"
                    class="detail-row__select"
                    :class="[rarityClass, { 'invalid-field': invalidFields.includes('itemRarity') }]"
                >
                  <ion-select-option value="COMMON">Обычный</ion-select-option>
                  <ion-select-option value="UNCOMMON">Необычный</ion-select-option>
                  <ion-select-option value="RARE">Редкий</ion-select-option>
                  <ion-select-option value="VERY_RARE">Очень редкий</ion-select-option>
                  <ion-select-option value="LEGENDARY">Легендарный</ion-select-option>
                </ion-select>
              </div>

              <div class="detail-row">
                <span class="detail-row__label">{{ HEADERS.need_customization.rus }}</span>
                <div class="detail-row__control-slot">
                  <ion-toggle v-model="customization"/>
                </div>
              </div>
            </div>

            <div class="tags-block">
              <div class="tags-block__label">{{ HEADERS.tags.rus }}</div>
              <!-- Selected tags as removable chips -->
              <div class="tags" v-if="selectedTags.length">
                <button
                    v-for="tag in selectedTags"
                    :key="tag.id"
                    type="button"
                    class="tag tag--removable"
                    :title="tag.description"
                    @click="removeSelectedTag(tag.id)"
                >
                  {{ tag.name }}
                  <span class="tag__remove" aria-hidden="true">×</span>
                </button>
              </div>
              <!-- Tag search + dropdown -->
              <div class="tag-input-row">
                <ion-input
                    v-model="tagSearchQuery"
                    type="text"
                    placeholder="Поиск тегов..."
                    class="tag-input"
                    @keydown.enter.prevent="showCreateTagOption ? createAndSelectTag() : undefined"
                />
              </div>
              <div v-if="tagSearchQuery.trim() || filteredAvailableTags.length" class="tag-dropdown">
                <button
                    v-for="tag in filteredAvailableTags"
                    :key="tag.id"
                    type="button"
                    :class="['tag-dropdown__item', { 'tag-dropdown__item--selected': selectedTagIds.includes(tag.id) }]"
                    @click="toggleTag(tag)"
                >
                  <span class="tag-dropdown__name">{{ tag.name }}</span>
                  <span v-if="tag.description" class="tag-dropdown__desc">{{ tag.description }}</span>
                </button>
                <button
                    v-if="showCreateTagOption"
                    type="button"
                    class="tag-dropdown__item tag-dropdown__item--create"
                    :disabled="isCreatingTag"
                    @click="createAndSelectTag"
                >
                  + Создать тег «{{ tagSearchQuery.trim() }}»
                </button>
              </div>
            </div>
          </section>

          <section class="panel">
            <h2 class="panel__title">{{ HEADERS.description.rus }}</h2>
            <ion-textarea
                v-model="createInventoryItemStore.item.description"
                class="description-input"
                :rows="8"
                auto-grow
            />
          </section>

          <section class="panel panel--skills">
            <h2 class="panel__title">Навыки предмета</h2>
            <div v-if="createItemSkills.length" class="skills-list">
              <div
                  v-for="skill in createItemSkills"
                  :key="skill.id"
                  class="skill-card"
              >
                <div class="skill-card__media">
                  <img
                      class="skill-card__img"
                      :src="getSkillImageUrl(skill.imgUrl)"
                      :alt="skill.name.rus"
                      @error="($event.target as HTMLImageElement).src = SKILL_IMAGE_PLACEHOLDER"
                  />
                </div>
                <div class="skill-card__body">
                  <div class="skill-card__name">{{ skill.name.rus }}</div>
                  <div v-if="skill.shortDescription" class="skill-card__desc">{{ skill.shortDescription }}</div>
                  <div class="skill-card__meta">
                    Зарядов: {{ skill.charges }} · {{ getRefillLabel(skill.chargesRefill) }}
                  </div>
                </div>
                <div class="skill-card__actions">
                  <ion-button size="small" shape="round" fill="clear" @click="openEditItemSkillModal(false, skill)">
                    <ion-icon slot="icon-only" :icon="pencilOutline"/>
                  </ion-button>
                  <ion-button size="small" shape="round" fill="clear" color="danger" @click="removeSkill(skill)">
                    <ion-icon slot="icon-only" :icon="trashOutline"/>
                  </ion-button>
                </div>
              </div>
            </div>
            <ion-button
                class="add-skill-btn"
                expand="block"
                fill="outline"
                shape="round"
                @click="openEditItemSkillModal(true, undefined)"
            >
              <ion-icon slot="start" :icon="addOutline"/>
              Добавить навык
            </ion-button>
          </section>
          </div>
          </div>

          <section class="panel panel--settings">
            <div class="detail-row">
              <span class="detail-row__label">{{ HEADERS.gm_access.rus }}</span>
              <span class="detail-row__value detail-row__value--toggle">
                <ion-toggle :disabled="hiddenStats" v-model="visibleForPlayers"/>
              </span>
            </div>
            <div v-if="!isUnidentifiedModel" class="detail-row">
              <span class="detail-row__label">Требует опознания</span>
              <span class="detail-row__value detail-row__value--toggle">
                <ion-toggle v-model="hiddenStats"/>
              </span>
            </div>
          </section>

          <section v-if="canAddToBundles" class="panel panel--bundles">
            <h2 class="panel__title">Добавить в мои наборы</h2>
            <p class="bundles-hint">Копия предмета появится в выбранных наборах</p>
            <div class="bundle-chips">
              <button
                  v-for="bundle in myBundles"
                  :key="bundle.id"
                  type="button"
                  class="bundle-chip"
                  :class="{ 'bundle-chip--active': selectedBundleIds.includes(bundle.id) }"
                  @click="toggleBundleSelection(bundle.id)"
              >
                <ion-icon :icon="selectedBundleIds.includes(bundle.id) ? checkmarkCircle : addCircleOutline"/>
                {{ bundle.name }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </ion-content>

    <div class="item-footer">
      <ion-button
          class="item-footer__btn item-footer__btn--secondary"
          expand="block"
          fill="clear"
          shape="round"
          @click="cancelEdit"
      >
        <ion-icon slot="start" :icon="closeCircleOutline"/>
        Отменить
      </ion-button>
      <ion-button
          v-if="canCreateUnidentifiedModel"
          class="item-footer__btn item-footer__btn--primary"
          expand="block"
          fill="outline"
          shape="round"
          color="warning"
          @click="createUnidentifiedModel"
      >
        <ion-icon slot="start" :icon="eyeOutline"/>
        Неопознанная модель
      </ion-button>
      <ion-button
          class="item-footer__btn item-footer__btn--primary"
          expand="block"
          fill="solid"
          shape="round"
          color="primary"
          @click="saveItem()"
      >
        <ion-icon slot="start" :icon="saveOutline"/>
        Сохранить
      </ion-button>
    </div>

    <EditItemSkillValueModal
        v-if="showEditItemSkillModal"
        :isOpen="showEditItemSkillModal"
        :character-id="String(route.params.characterId ?? '')"
        :is-editing="isEditingItemSkill"
        :item-skill="editingItemSkill"
        @closeEditItemSkillModal="closeEditItemSkillModal"
        @saveItemSkill="(itemSkill: ItemSkill) => addItemSkill(itemSkill)"
    />
  </ion-page>
</template>

<style scoped>
.item-page-root {
  --item-footer-height: 112px;
}

.item-toolbar {
  --min-height: 44px;
}

.item-ion-content {
  --background: var(--ion-color-dark);
  --padding-top: 4px;
  --padding-bottom: calc(var(--item-footer-height) + env(safe-area-inset-bottom, 0px) + 16px);
}

.item-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 14px;
  max-width: 720px;
  margin: 0 auto;
}

.item-header {
  display: grid;
  grid-template-columns: repeat(2, 180px);
  justify-content: center;
  gap: 20px;
  width: 100%;
}

.avatar {
  position: relative;
  flex-shrink: 0;
  width: 180px;
  height: 180px;
  padding: 0;
  border-radius: 25px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ambient-color, var(--ion-color-dark));
  border: 2px solid transparent;
  cursor: pointer;
  transition: background-color 0.45s ease, border-color 0.25s ease;
}

.avatar-ambient {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

.avatar-ambient__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.14);
  filter: blur(20px) saturate(1.5);
}

.avatar-img {
  position: relative;
  z-index: 1;
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.avatar-placeholder {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.avatar-placeholder__icon {
  font-size: 36px;
}

.avatar-placeholder__text {
  font-size: 12px;
  font-weight: 600;
}

.avatar-file-input {
  display: none;
}

.stats {
  flex-shrink: 0;
  width: 180px;
  height: 180px;
  box-sizing: border-box;
  border-radius: 25px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 8px;
  background-color: var(--ion-color-medium);
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  background-color: var(--ion-color-secondary-opacity-40);
  flex: 1 1 0;
  min-height: 0;
  border-radius: 15px;
  padding: 0 8px;
  font-weight: bold;
  font-size: 11px;
  line-height: 1.2;
  color: var(--ion-color-light);
}

.stat__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-value {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border-radius: 50%;
  height: 30px;
  width: 30px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.stat-value--wide {
  width: auto;
  min-width: 30px;
  max-width: 48px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 10px;
  letter-spacing: -0.02em;
}


.inline-stat-input {
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  min-height: 24px;
  max-width: 34px;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  --background: transparent;
  --color: var(--ion-color-primary-contrast);
}

.coin-select-wrap--header {
  position: relative;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
}

.coin-select-wrap--header .coin-select-wrap__icon {
  width: 16px;
  height: 16px;
}

.hidden-select {
  display: none;
}

.item-identity {
  padding: 0 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.unidentified-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.avatar--sm {
  width: 64px;
  height: 64px;
  border-radius: 16px;
}

.avatar--sm .avatar-placeholder__icon {
  font-size: 20px;
}

.avatar--sm .avatar-placeholder__text {
  font-size: 9px;
}

.item-identity--compact {
  flex: 1;
  min-width: 0;
  padding: 0;
}

.identity-input {
  --background: transparent;
  --padding-start: 0;
  --padding-end: 0;
  --highlight-color-focused: var(--ion-color-primary);
}

.identity-input--name {
  font-size: 22px;
  font-weight: 700;
  --color: var(--ion-color-light);
  --placeholder-color: rgba(var(--ion-color-light-rgb), 0.35);
  --placeholder-opacity: 1;
}

.identity-input--eng {
  font-size: 13px;
  --color: rgba(var(--ion-color-light-rgb), 0.55);
  --placeholder-color: rgba(var(--ion-color-light-rgb), 0.3);
  --placeholder-opacity: 1;
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panels-split {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  align-items: start;
}

.panels-split > .panel,
.panels-split > .panels-col {
  min-width: 0;
}

.panels-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (min-width: 1024px) {
  .panels-split {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

.panel {
  padding: 14px;
  border-radius: 16px;
  background: var(--ion-color-medium);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.1);
}

.panel__title {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.panel__title-hint {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.6;
  margin-left: 6px;
  text-transform: none;
  letter-spacing: 0;
}

.panel--unidentified {
  border: 1px solid rgba(var(--ion-color-warning-rgb), 0.3);
  background: rgba(var(--ion-color-warning-rgb), 0.05);
}

.bundles-hint {
  margin: -4px 0 12px;
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
}

.bundle-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bundle-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(var(--ion-color-light-rgb), 0.75);
  background: rgba(var(--ion-color-light-rgb), 0.06);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.bundle-chip ion-icon {
  font-size: 16px;
}

.bundle-chip:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border-color: rgba(var(--ion-color-primary-rgb), 0.3);
  color: var(--ion-color-light);
}

.bundle-chip--active {
  background: rgba(var(--ion-color-primary-rgb), 0.18);
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary);
}

.description-input--sm {
  margin-top: 12px;
}

.details-grid {
  --detail-control-width: 132px;
  display: flex;
  flex-direction: column;
}

.detail-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--detail-control-width);
  align-items: center;
  column-gap: 12px;
  min-height: 48px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.06);

}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row--with-extra {
  align-items: center;
}

.detail-row__left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  min-height: 48px;
}

.detail-row__label {
  min-width: 0;
  font-size: 14px;
  line-height: 1.35;
  color: rgba(var(--ion-color-light-rgb), 0.62);
}

.detail-row__control-slot {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
}

.detail-row__checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 1.2;
  color: rgba(var(--ion-color-light-rgb), 0.55);
  cursor: pointer;
}

.detail-row__input,
.detail-row__select,
.price-input-group {
  width: 100%;
  max-width: var(--detail-control-width);
  justify-self: end;
  --border-radius: 999px;
}

.detail-row__input {
  --background: rgba(0, 0, 0, 0.16);
  --padding-start: 10px;
  --padding-end: 10px;
  --color: var(--ion-color-light);
  --highlight-color-focused: var(--ion-color-primary);
  min-height: 36px;
  --border-radius: 999px;
  text-align: right;
  font-weight: 600;
  font-size: 14px;
}

.price-input-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.16);
}

.price-input-group.invalid-field {
  outline: 1px solid var(--ion-color-danger);
  outline-offset: 1px;
}

.detail-row__input--price {
  flex: 1 1 auto;
  min-width: 0;
  --background: transparent;
}

.coin-select-wrap {
  position: relative;
  flex: 0 0 40px;
  width: 40px;
  height: 36px;
}

.coin-select-wrap__icon {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 20px;
  height: 20px;
  pointer-events: none;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.28));
}

.coin-select-wrap__select {
  width: 100%;
  height: 100%;
  --padding-start: 0;
  --padding-end: 0;
  opacity: 0;
}

.detail-row__input--weight {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  outline: none;
  cursor: text;
}

.detail-row__select {
  --background: rgba(0, 0, 0, 0.16);
  --padding-start: 10px;
  --padding-end: 28px;
  min-height: 36px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  text-align: right;
}

.damage-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.tags-block {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(var(--ion-color-light-rgb), 0.06);
}

.tags-block__label {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--ion-color-primary-rgb), 0.95);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.22);
}

.tag--removable {
  cursor: pointer;
}

.tag__remove {
  font-size: 14px;
  line-height: 1;
  opacity: 0.7;
}

.tag-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-input {
  flex: 1;
  --background: rgba(0, 0, 0, 0.16);
  --padding-start: 12px;
  --padding-end: 12px;
  --color: var(--ion-color-light);
  --highlight-color-focused: var(--ion-color-primary);
  border-radius: 12px;
  min-height: 40px;
}

.tag-dropdown {
  margin-top: 6px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.18);
  overflow: hidden;
  max-height: 200px;
  overflow-y: auto;
}

.tag-dropdown__item {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.06);
  cursor: pointer;
  color: var(--ion-color-light);
}

.tag-dropdown__item:last-child {
  border-bottom: none;
}

.tag-dropdown__item--selected {
  background: rgba(var(--ion-color-primary-rgb), 0.18);
}

.tag-dropdown__item--create {
  color: var(--ion-color-primary);
  font-weight: 600;
}

.tag-dropdown__name {
  font-size: 13px;
  font-weight: 600;
}

.tag-dropdown__desc {
  font-size: 11px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.description-input {
  --background: rgba(0, 0, 0, 0.16);
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 10px;
  --padding-bottom: 10px;
  --color: var(--ion-color-light);
  --highlight-color-focused: var(--ion-color-primary);
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.55;
}

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.skill-card {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.12);
}

.skill-card__media {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-dark);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.14);
}

.skill-card__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: var(--ion-color-dark);
}

.skill-card__body {
  flex: 1;
  min-width: 0;
}

.skill-card__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-card__desc,
.skill-card__meta {
  font-size: 12px;
  line-height: 1.35;
  color: rgba(var(--ion-color-light-rgb), 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-card__meta {
  margin-top: 3px;
  color: rgba(var(--ion-color-primary-rgb), 0.85);
}

.skill-card__actions {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
}

.add-skill-btn {
  margin: 0;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
  --border-radius: 14px;
}

.item-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  background: rgba(var(--ion-color-dark-rgb), 0.94);
  border-top: 1px solid rgba(var(--ion-color-primary-rgb), 0.12);
  backdrop-filter: blur(12px);
}

.item-footer__btn {
  margin: 0;
  text-transform: none;
  letter-spacing: 0;
  font-size: 15px;
  font-weight: 600;
  --border-radius: 14px;
}

.item-footer__btn--primary {
  min-height: 46px;
}

.item-footer__btn--secondary {
  min-height: 40px;
  --padding-top: 0;
  --padding-bottom: 0;
}

.invalid-field {
  --border-color: var(--ion-color-danger) !important;
  --highlight-color-focused: var(--ion-color-danger) !important;
  outline: 1px solid var(--ion-color-danger);
  outline-offset: 1px;
}

.stat-value.invalid-field {
  outline: 2px solid var(--ion-color-danger);
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

@media (min-width: 1024px) {
  .item-page {
    max-width: 700px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 8px;
  }

  /* Когда показаны две панели (скрытые характеристики) — страница шире */
  .item-page:has(.panels-split .panel--unidentified) {
    max-width: 1200px;
  }

  .item-header {
    gap: 38px;
  }

  .item-footer {
    max-width: 960px;
    left: 50%;
    transform: translateX(-50%);
    flex-direction: row;
    gap: 10px;
    border-radius: 16px 16px 0 0;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }

  .item-footer__btn--primary {
    flex: 1.2;
  }

  .item-footer__btn--secondary {
    flex: 1;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.2);
    border-radius: 14px;
  }
}

.unidentified-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(var(--ion-color-warning-rgb), 0.12);
  border: 1px solid rgba(var(--ion-color-warning-rgb), 0.35);
  color: var(--ion-color-warning);
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.unidentified-banner__icon {
  font-size: 18px;
  flex-shrink: 0;
}
</style>
