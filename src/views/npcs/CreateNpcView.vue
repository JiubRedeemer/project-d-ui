<script setup lang="ts">
import {computed, onMounted, ref, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonModal,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToolbar,
  toastController,
} from "@ionic/vue";
import {
  add,
  barbellOutline,
  cameraOutline,
  chevronDownOutline,
  closeCircleOutline,
  copyOutline,
  documentTextOutline,
  eyeOffOutline,
  eyeOutline,
  flameOutline,
  flashOutline,
  pawOutline,
  personOutline,
  ribbonOutline,
  saveOutline,
  shieldCheckmarkOutline,
  shieldHalfOutline,
  shieldOutline,
  skullOutline,
  sparkles,
  sparklesOutline,
  starOutline,
  statsChartOutline,
} from "ionicons/icons";
import {
  getNpcByIdForRoom,
  saveCharacterNpcRelationForRoom,
  saveNpcForRoom,
} from "@/api/npcApi";
import type {
  NpcDto,
  NpcActionType,
  NpcSpellDto,
  NpcTypeEnum,
  RelationTypeEnum,
  SaveCharacterNpcRelationRequest,
  SaveNpcRequest,
} from "@/api/npcApi.types";
import {getClassesForRoom, getRacesForRoom} from "@/api/rulebookApi";
import type {SpellDto} from "@/components/models/response/MagicApi";
import {loadRoomSpellMap} from "@/api/magicApi";
import {useRoomStore} from "@/stores/RoomStore";
import MagicSearchView from "@/views/character/tabs/magic/MagicSearchView.vue";
import {
  FILE_STORAGE_INTEGRATION_ROUTES,
  GATEWAY_INTEGRATION_ROUTES,
} from "@/config/integrationRoutes";
import axios from "axios";
import {useNpcRelationsStore} from "@/stores/NpcRelationsStore";
import {extractDominantColorFromUrl} from "@/utils/imageAmbient";

const route = useRoute();
const router = useRouter();

const roomId = computed(() => route.params.roomId as string);
const npcId = computed(() => (route.params.npcId as string | undefined) ?? undefined);
const characterId = computed(() => {
  const fromParams = (route.params.characterId as string | undefined) ?? undefined;
  const fromQuery = (route.query.characterId as string | undefined) ?? undefined;
  return fromParams ?? fromQuery;
});
const relationType = computed<RelationTypeEnum | null>(() => {
  const raw = (route.query.relationType as string | undefined) ?? undefined;
  if (!raw) return null;
  const allowed: RelationTypeEnum[] = ["FRIEND", "ENEMY", "RULER", "PET", "OTHER"];
  return allowed.includes(raw as RelationTypeEnum) ? (raw as RelationTypeEnum) : null;
});

const isLoading = ref(false);
const npcRelationsStore = useNpcRelationsStore();
const ambientColor = ref<string | null>(null);

const previewImage = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const typeSelectRef = ref<InstanceType<typeof IonSelect> | null>(null);

const DND_SKILLS = [
  {name: "Атлетика", code: "ATHL"},
  {name: "Акробатика", code: "ACRO"},
  {name: "Ловкость рук", code: "SLEI"},
  {name: "Скрытность", code: "STEA"},
  {name: "История", code: "HIST"},
  {name: "Магия", code: "ARCA"},
  {name: "Природа", code: "NATR"},
  {name: "Расследование", code: "INVE"},
  {name: "Религия", code: "RELI"},
  {name: "Восприятие", code: "PERC"},
  {name: "Выживание", code: "SURV"},
  {name: "Медицина", code: "MEDI"},
  {name: "Проницательность", code: "INSI"},
  {name: "Уход за животными", code: "ANIM"},
  {name: "Выступление", code: "PERF"},
  {name: "Запугивание", code: "INTI"},
  {name: "Обман", code: "DECE"},
  {name: "Убеждение", code: "PERS"},
];

const allowedFormats = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
  "image/tiff",
  "image/svg+xml",
];

const npc = ref<SaveNpcRequest>({
  id: null,
  roomId: roomId.value,
  name: "",
  description: null,
  type: "RATIONAL",
  visible: true,
  unique: true,
  clazzCode: null,
  raceCode: null,
  armoryClass: null,
  speed: null,
  initiative: null,
  maxHp: null,
  hpDiceCount: null,
  hpDieSize: null,
  hpDiceBonus: null,
  strScore: null,
  dexScore: null,
  conScore: null,
  intScore: null,
  wisScore: null,
  chaScore: null,
  level: null,
  proficiencyBonus: null,
  challengeRating: null,
  skills: [] as { name: string; bonus: number | null }[],
  actions: [] as { name: string; description: string; type: NpcActionType }[],
  features: [] as { name: string; description: string }[],
  savingThrows: [] as { name: string; bonus: number | null }[],
  resistances: [] as string[],
  immunities: [] as string[],
  senses: [] as { name: string; value: number | null }[],
  languages: null as string | null,
  spellSlots: [] as { level: number; max: number; current: number }[],
  spells: [] as NpcSpellDto[],
  imgUrl: null,
  createdBy: "",
});

const npcTypeOptions: Array<{ value: NpcTypeEnum; label: string }> = [
  {value: "RATIONAL", label: "Разумное"},
  {value: "BEAST", label: "Животное"},
  {value: "MONSTER", label: "Монстр"},
  {value: "DEITY", label: "Божество"},
  {value: "UNDEAD", label: "Нежить"},
];

const NPC_TYPE_ICONS: Record<NpcTypeEnum, string> = {
  RATIONAL: personOutline,
  BEAST: pawOutline,
  MONSTER: flameOutline,
  DEITY: sparklesOutline,
  UNDEAD: skullOutline,
};

const npcTypeLabel = computed(
    () => npcTypeOptions.find((o) => o.value === npc.value.type)?.label ?? "—"
);
const npcTypeIcon = computed(() => NPC_TYPE_ICONS[npc.value.type] ?? personOutline);

const calculatedHp = computed(() => {
  const diceCount = npc.value.hpDiceCount;
  const dieSize = npc.value.hpDieSize;
  if (!diceCount || !dieSize) return null;
  const conScore = npc.value.conScore ?? 10;
  const conMod = Math.floor((conScore - 10) / 2);
  const bonus = npc.value.hpDiceBonus ?? 0;
  return Math.max(1, Math.round(diceCount * (dieSize + 1) / 2 + conMod * diceCount) + bonus);
});

// Выбор заклинаний из справочника комнаты через MagicSearchView (модалка).
// Заклинания NPC хранятся ссылкой (spellId); детали (имя/уровень) разрешаем по каталогу.
const roomStore = useRoomStore();
const showSpellPicker = ref(false);
const spellById = ref<Map<string, SpellDto>>(new Map());

function spellLevelLabel(level: number | null | undefined): string {
  return level && level > 0 ? `${level} ур.` : "Заговор";
}

function spellName(dto: SpellDto | undefined): string {
  const n = dto?.name as Record<string, string> | undefined;
  return n?.rus ?? n?.en ?? n?.eng ?? "";
}

function resolveSpell(entry: NpcSpellDto): { name: string; level: number } {
  const ref = entry.spellId ? spellById.value.get(entry.spellId) : undefined;
  if (ref) {
    return {name: spellName(ref) || (entry.name ?? "—"), level: Number(ref.level ?? 0) || 0};
  }
  return {name: entry.name ?? "Неизвестное заклинание", level: Number(entry.level ?? 0) || 0};
}

async function loadRoomSpellCatalog() {
  try {
    if (!roomStore.room?.id) {
      await roomStore.getRoomInfo(roomId.value);
    }
    spellById.value = await loadRoomSpellMap(roomStore.room?.baseRuleType);
  } catch (e) {
    console.error("Failed to load room spell catalog:", e);
  }
}

function openSpellPicker() {
  showSpellPicker.value = true;
}

function onPickSpell(spell: SpellDto) {
  showSpellPicker.value = false;
  if (!spell.id) return;
  if (!npc.value.spells) npc.value.spells = [];
  if (npc.value.spells.some((s) => s.spellId === spell.id)) return; // уже добавлено
  spellById.value.set(spell.id, spell);
  npc.value.spells.push({spellId: spell.id, chargesPerDay: null});
}

const roomClasses = ref<{ value: string; label: string }[]>([]);
const roomRaces = ref<{ value: string; label: string }[]>([]);
const roomClassesLoading = ref(true);
const roomRacesLoading = ref(true);

const npcClazzSelect = computed({
  get: () => npc.value.clazzCode ?? "",
  set: (v: string) => {
    npc.value.clazzCode = v === "" ? null : v;
  },
});
const npcRaceSelect = computed({
  get: () => npc.value.raceCode ?? "",
  set: (v: string) => {
    npc.value.raceCode = v === "" ? null : v;
  },
});

function getNpcImageUrl(imgUrl: string | null | undefined): string | null {
  if (!imgUrl?.trim()) return null;
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
}

const currentImageUrl = computed(() => previewImage.value ?? getNpcImageUrl(npc.value.imgUrl));

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

function toggleVisible() {
  npc.value.visible = !npc.value.visible;
}

function toggleUnique() {
  npc.value.unique = !npc.value.unique;
}

function openTypeSelect() {
  if (typeSelectRef.value?.$el?.open) {
    typeSelectRef.value.$el.open();
  } else if (typeSelectRef.value?.open) {
    typeSelectRef.value.open();
  }
}

function setType(value: NpcTypeEnum) {
  npc.value.type = value;
}

function triggerFileInput() {
  fileInput.value?.click();
}

async function uploadToStorage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userFilename", `npc-${Date.now()}`);
  const res = await axios.put(
      `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
      formData,
      {headers: {"Content-Type": "multipart/form-data"}}
  );
  return res.data;
}

async function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  if (file && allowedFormats.includes(file.type)) {
    const reader = new FileReader();
    reader.onload = () => {
      previewImage.value = reader.result as string;
    };
    reader.readAsDataURL(file);
    npc.value.imgUrl = await uploadToStorage(file);
  } else {
    alert(
        "Формат файла не поддерживается. Разрешены: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG."
    );
  }
}

async function getMyId(): Promise<string> {
  const myIdResponse = await axios.get(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}/users/myId`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
  );
  const data = myIdResponse.data as unknown;
  if (typeof data === "string") return data;
  if (data && typeof data === "object" && "id" in (data as object)) {
    const id = (data as { id: unknown }).id;
    if (typeof id === "string") return id;
  }
  return String(data ?? "");
}

function fillFromDto(dto: NpcDto) {
  npc.value = {
    id: dto.id,
    roomId: dto.roomId,
    name: dto.name ?? "",
    description: dto.description ?? null,
    type: dto.type,
    visible: dto.visible ?? true,
    unique: dto.unique ?? false,
    clazzCode: dto.clazzCode ?? null,
    raceCode: dto.raceCode ?? null,
    armoryClass: dto.armoryClass ?? null,
    speed: dto.speed ?? null,
    initiative: dto.initiative ?? null,
    maxHp: dto.maxHp ?? null,
    hpDiceCount: dto.hpDiceCount ?? null,
    hpDieSize: dto.hpDieSize ?? null,
    hpDiceBonus: dto.hpDiceBonus ?? null,
    strScore: dto.strScore ?? null,
    dexScore: dto.dexScore ?? null,
    conScore: dto.conScore ?? null,
    intScore: dto.intScore ?? null,
    wisScore: dto.wisScore ?? null,
    chaScore: dto.chaScore ?? null,
    level: dto.level ?? null,
    proficiencyBonus: dto.proficiencyBonus ?? null,
    challengeRating: dto.challengeRating ?? null,
    skills: dto.skills ? dto.skills.map(s => ({name: s.name, bonus: s.bonus ?? null})) : [],
    actions: dto.actions ? dto.actions.map(a => ({
      name: a.name,
      description: a.description,
      type: a.type ?? "ACTION"
    })) : [],
    features: dto.features ? dto.features.map(f => ({name: f.name, description: f.description})) : [],
    savingThrows: dto.savingThrows?.map(s => ({name: s.name, bonus: s.bonus})) ?? [],
    resistances: dto.resistances ?? [],
    immunities: dto.immunities ?? [],
    senses: dto.senses?.map(s => ({...s, value: s.value ?? null})) ?? [],
    languages: dto.languages ?? null,
    spellSlots: dto.spellSlots ?? [],
    spells: dto.spells?.map(s => ({
      spellId: s.spellId ?? null,
      name: s.name ?? null,
      level: s.level ?? null,
      description: s.description ?? null,
      chargesPerDay: s.chargesPerDay ?? null,
    })) ?? [],
    imgUrl: dto.imgUrl ?? null,
    createdBy: npc.value.createdBy || dto.createdBy || "",
  };
  if (dto.imgUrl) {
    previewImage.value = getNpcImageUrl(dto.imgUrl);
  }
}

async function loadNpcIfEditing() {
  if (!npcId.value) return;
  try {
    isLoading.value = true;
    const dto = await getNpcByIdForRoom(roomId.value, npcId.value);
    fillFromDto(dto);
  } catch (e) {
    console.error("Failed to load NPC:", e);
    const toast = await toastController.create({
      message: "Ошибка при загрузке NPC",
      duration: 2000,
      position: "top",
      color: "danger",
    });
    await toast.present();
  } finally {
    isLoading.value = false;
  }
}

function onCancel() {
  if (characterId.value) {
    void npcRelationsStore.loadAll(roomId.value, characterId.value);
  }
  router.back();
}

function validate(): string | null {
  if (!npc.value.name?.trim()) return "Введите имя NPC";
  if (!npc.value.type) return "Выберите тип NPC";
  if (!npc.value.createdBy?.trim()) return "Не удалось определить ваш userId (createdBy)";
  return null;
}

async function onSave() {
  const err = validate();
  if (err) {
    const toast = await toastController.create({
      message: err,
      duration: 1800,
      position: "top",
      color: "warning",
    });
    await toast.present();
    return;
  }

  try {
    isLoading.value = true;
    const body: SaveNpcRequest = {
      ...npc.value,
      roomId: roomId.value,
      name: npc.value.name.trim(),
      description: npc.value.description?.trim?.() || null,
      visible: npc.value.visible ?? true,
      unique: npc.value.unique ?? false,
      clazzCode: npc.value.clazzCode?.trim?.() || null,
      raceCode: npc.value.raceCode?.trim?.() || null,
      armoryClass: npc.value.armoryClass?.trim?.() || null,
      speed: npc.value.speed?.trim?.() || null,
      imgUrl: npc.value.imgUrl?.trim?.() || null,
      createdBy: npc.value.createdBy.trim(),
    };

    const saved = await saveNpcForRoom(roomId.value, body);
    if (characterId.value && saved?.id) {
      const rel: SaveCharacterNpcRelationRequest = {
        id: null,
        characterId: characterId.value,
        npcId: saved.id,
        note: null,
        relationType: relationType.value,
      };
      try {
        await saveCharacterNpcRelationForRoom(roomId.value, characterId.value, rel);
      } catch (e) {
        console.error("Failed to create character–NPC relation:", e);
      }
      await npcRelationsStore.loadAll(roomId.value, characterId.value);
    }

    const toast = await toastController.create({
      message: npcId.value ? "NPC обновлён" : "NPC создан",
      duration: 1000,
      position: "top",
    });
    await toast.present();
    router.back();
  } catch (e) {
    console.error("Failed to save NPC:", e);
    const toast = await toastController.create({
      message: "Ошибка при сохранении NPC",
      duration: 2000,
      position: "top",
      color: "danger",
    });
    await toast.present();
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  npc.value.roomId = roomId.value;
  void (async () => {
    try {
      const id = await getMyId();
      if (id?.trim()) npc.value.createdBy = id.trim();
    } catch (e) {
      console.error("Failed to resolve myId:", e);
    }
  })();
  void loadRoomSpellCatalog();
  void (async () => {
    await loadNpcIfEditing();
    roomClassesLoading.value = true;
    roomRacesLoading.value = true;
    try {
      const classes = await getClassesForRoom(roomId.value, undefined);
      roomClasses.value = (classes ?? []).map((c) => ({
        value: c.code,
        label: c.name?.trim?.() || c.code,
      }));
    } catch {
      roomClasses.value = [];
    } finally {
      roomClassesLoading.value = false;
    }
    try {
      const races = await getRacesForRoom(roomId.value, undefined);
      roomRaces.value = (races ?? []).map((r) => ({
        value: r.code,
        label: r.name?.trim?.() || r.code,
      }));
    } catch {
      roomRaces.value = [];
    } finally {
      roomRacesLoading.value = false;
    }
  })();
});
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
        <div class="item-header">
          <button
              type="button"
              class="avatar"
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
                v-else-if="npc.imgUrl"
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
            <span class="avatar-edit-badge" aria-hidden="true">
              <ion-icon :icon="cameraOutline"/>
            </span>
          </button>

          <div class="stats">
            <button type="button" class="meta-chip meta-chip--type" @click="openTypeSelect">
              <span class="meta-chip__icon"><ion-icon :icon="npcTypeIcon"/></span>
              <span class="meta-chip__body">
                <span class="meta-chip__label">Тип существа</span>
                <span class="meta-chip__value">{{ npcTypeLabel }}</span>
              </span>
              <ion-icon class="meta-chip__chevron" :icon="chevronDownOutline"/>
            </button>
            <ion-select
                ref="typeSelectRef"
                :value="npc.type"
                interface="action-sheet"
                class="hidden-select"
                @ionChange="(e) => setType((e as CustomEvent).detail.value)"
            >
              <ion-select-option
                  v-for="opt in npcTypeOptions"
                  :key="opt.value"
                  :value="opt.value"
              >
                {{ opt.label }}
              </ion-select-option>
            </ion-select>

            <button
                type="button"
                class="meta-toggle"
                :class="{ 'meta-toggle--on': npc.visible }"
                @click="toggleVisible"
            >
              <ion-icon :icon="npc.visible ? eyeOutline : eyeOffOutline"/>
              <span>{{ npc.visible ? "Виден игрокам" : "Скрыт от игроков" }}</span>
            </button>

            <button
                type="button"
                class="meta-toggle"
                :class="{ 'meta-toggle--on': npc.unique }"
                @click="toggleUnique"
            >
              <ion-icon :icon="npc.unique ? sparklesOutline : copyOutline"/>
              <span>{{ npc.unique ? "Уникальный" : "Обычный" }}</span>
            </button>
          </div>
        </div>

        <div class="item-identity">
          <ion-input
              v-model="npc.name"
              type="text"
              class="identity-input identity-input--name"
              placeholder="Имя NPC"
          />
        </div>

        <div class="item-details">
          <section class="panel">
            <h2 class="panel__title">
              <span class="panel__icon"><ion-icon :icon="shieldHalfOutline"/></span>Основные параметры
            </h2>
            <div class="details-grid">
              <div class="detail-row">
                <span class="detail-row__label">Класс</span>
                <ion-select
                    v-model="npcClazzSelect"
                    interface="popover"
                    :placeholder="
                      roomClassesLoading
                        ? 'Загрузка...'
                        : roomClasses.length
                          ? 'Выберите класс'
                          : 'Нет классов'
                    "
                    :disabled="roomClassesLoading || isLoading"
                    class="detail-row__select"
                >
                  <ion-select-option value="">—</ion-select-option>
                  <ion-select-option
                      v-for="c in roomClasses"
                      :key="c.value"
                      :value="c.value"
                  >
                    {{ c.label }}
                  </ion-select-option>
                </ion-select>
              </div>

              <div class="detail-row">
                <span class="detail-row__label">Раса</span>
                <ion-select
                    v-model="npcRaceSelect"
                    interface="popover"
                    :placeholder="
                      roomRacesLoading
                        ? 'Загрузка...'
                        : roomRaces.length
                          ? 'Выберите расу'
                          : 'Нет рас'
                    "
                    :disabled="roomRacesLoading || isLoading"
                    class="detail-row__select"
                >
                  <ion-select-option value="">—</ion-select-option>
                  <ion-select-option
                      v-for="r in roomRaces"
                      :key="r.value"
                      :value="r.value"
                  >
                    {{ r.label }}
                  </ion-select-option>
                </ion-select>
              </div>

              <div class="detail-row">
                <span class="detail-row__label">КД</span>
                <ion-input
                    v-model="npc.armoryClass"
                    type="text"
                    class="detail-row__input"
                />
              </div>

              <div class="detail-row">
                <span class="detail-row__label">Скорость</span>
                <ion-input
                    v-model="npc.speed"
                    type="text"
                    class="detail-row__input"
                />
              </div>

              <div class="detail-row">
                <span class="detail-row__label">Инициатива</span>
                <ion-input
                    type="number"
                    inputmode="numeric"
                    class="detail-row__input"
                    :value="npc.initiative ?? ''"
                    @ionInput="
                      (e) => {
                        const v = Number((e.target as HTMLIonInputElement).value);
                        npc.initiative = Number.isFinite(v) ? v : null;
                      }
                    "
                />
              </div>

              <div class="detail-row">
                <span class="detail-row__label">Макс. ХП</span>
                <ion-input
                    type="number"
                    inputmode="numeric"
                    class="detail-row__input"
                    :value="npc.maxHp ?? ''"
                    placeholder="авто"
                    @ionInput="
                      (e) => {
                        const v = Number((e.target as HTMLIonInputElement).value);
                        npc.maxHp = Number.isFinite(v) && v > 0 ? v : null;
                      }
                    "
                />
              </div>

              <div class="detail-row detail-row--dice">
                <span class="detail-row__label">Кости ХП</span>
                <div class="dice-row">
                  <ion-input
                      type="number"
                      inputmode="numeric"
                      class="detail-row__input dice-count-input"
                      :value="npc.hpDiceCount ?? ''"
                      placeholder="кол-во"
                      @ionInput="(e) => { const v = Number((e.target as HTMLIonInputElement).value); npc.hpDiceCount = Number.isFinite(v) && v > 0 ? v : null; }"
                  />
                  <span class="dice-sep">d</span>
                  <ion-input
                      type="number"
                      inputmode="numeric"
                      class="detail-row__input dice-size-input"
                      :value="npc.hpDieSize ?? ''"
                      placeholder="размер"
                      @ionInput="(e) => { const v = Number((e.target as HTMLIonInputElement).value); npc.hpDieSize = Number.isFinite(v) && v > 0 ? v : null; }"
                  />
                  <span class="dice-sep">+</span>
                  <ion-input
                      type="number"
                      inputmode="numeric"
                      class="detail-row__input dice-bonus-input"
                      :value="npc.hpDiceBonus ?? ''"
                      placeholder="0"
                      @ionInput="(e) => { const v = Number((e.target as HTMLIonInputElement).value); npc.hpDiceBonus = Number.isFinite(v) ? v : null; }"
                  />
                  <span v-if="calculatedHp !== null" class="dice-preview">≈ {{ calculatedHp }} ХП</span>
                </div>
              </div>
            </div>
          </section>

          <section class="panel">
            <h2 class="panel__title">
              <span class="panel__icon"><ion-icon :icon="barbellOutline"/></span>Характеристики
            </h2>
            <div class="abilities-grid">
              <div v-for="ab in [
                { key: 'strScore', label: 'СИЛ' },
                { key: 'dexScore', label: 'ЛОВ' },
                { key: 'conScore', label: 'ТЕЛ' },
                { key: 'intScore', label: 'ИНТ' },
                { key: 'wisScore', label: 'МДР' },
                { key: 'chaScore', label: 'ХАР' },
              ]" :key="ab.key" class="ability-cell">
                <span class="ability-cell__label">{{ ab.label }}</span>
                <ion-input
                    type="number"
                    inputmode="numeric"
                    class="ability-cell__input"
                    :value="(npc as any)[ab.key] ?? ''"
                    placeholder="—"
                    @ionInput="(e: any) => {
                    const v = Number(e.target.value);
                    (npc as any)[ab.key] = Number.isFinite(v) && v > 0 ? v : null;
                  }"
                />
                <span class="ability-cell__mod" v-if="(npc as any)[ab.key]">
                  {{ (npc as any)[ab.key] >= 10 ? '+' : '' }}{{ Math.floor(((npc as any)[ab.key] - 10) / 2) }}
                </span>
              </div>
            </div>
          </section>

          <section class="panel">
            <h2 class="panel__title">
              <span class="panel__icon"><ion-icon :icon="statsChartOutline"/></span>Боевые параметры
            </h2>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-row__label">Уровень</span>
                <ion-input type="number" inputmode="numeric" class="detail-row__input"
                           :value="npc.level ?? ''" placeholder="—"
                           @ionInput="(e: any) => { const v = Number(e.target.value); npc.level = Number.isFinite(v) && v > 0 ? v : null; }"/>
              </div>
              <div class="detail-row">
                <span class="detail-row__label">Бонус мастерства</span>
                <ion-input type="number" inputmode="numeric" class="detail-row__input"
                           :value="npc.proficiencyBonus ?? ''" placeholder="—"
                           @ionInput="(e: any) => { const v = Number(e.target.value); npc.proficiencyBonus = Number.isFinite(v) && v > 0 ? v : null; }"/>
              </div>
              <div class="detail-row">
                <span class="detail-row__label">Опасность (CR)</span>
                <ion-input type="text" class="detail-row__input"
                           :value="npc.challengeRating ?? ''" placeholder="—"
                           @ionInput="(e: any) => { npc.challengeRating = e.target.value?.trim() || null; }"/>
              </div>
            </div>
          </section>

          <section class="panel">
            <h2 class="panel__title">
              <span class="panel__icon"><ion-icon :icon="ribbonOutline"/></span>Навыки
            </h2>
            <div class="list-editor">
              <div v-for="(skill, i) in npc.skills" :key="i" class="list-editor__row">
                <ion-select
                    class="list-editor__select"
                    :value="skill.name"
                    placeholder="Навык"
                    interface="action-sheet"
                    @ionChange="(e: any) => { skill.name = e.detail.value; }">
                  <ion-select-option
                      v-for="s in DND_SKILLS.filter(s => s.name === skill.name || !npc.skills.some(sk => sk.name === s.name))"
                      :key="s.code" :value="s.name">{{ s.name }}
                  </ion-select-option>
                </ion-select>
                <ion-input type="number" inputmode="numeric" class="list-editor__input list-editor__input--bonus"
                           :value="skill.bonus ?? ''" placeholder="бонус"
                           @ionInput="(e: any) => { const v = Number(e.target.value); skill.bonus = Number.isFinite(v) ? v : null; }"/>
                <button class="list-editor__remove" @click="npc.skills.splice(i, 1)">✕</button>
              </div>
              <button class="list-editor__add" @click="npc.skills.push({ name: '', bonus: null })">+ Добавить навык
              </button>
            </div>
          </section>

          <section class="panel">
            <h2 class="panel__title">
              <span class="panel__icon"><ion-icon :icon="starOutline"/></span>Умения
            </h2>
            <div class="list-editor">
              <div v-for="(feat, i) in npc.features" :key="i" class="list-editor__entry">
                <div class="list-editor__entry-header">
                  <ion-input label="Название действия" label-placement="stacked"
                             class="list-editor__input list-editor__input--name list-editor__input--action-name"
                             :value="feat.name" placeholder="Название умения"
                             @ionInput="(e: any) => { feat.name = e.target.value; }"/>
                  <button class="list-editor__remove" @click="npc.features.splice(i, 1)">✕</button>
                </div>
                <ion-textarea class="list-editor__textarea"
                              :value="feat.description" placeholder="Описание..."
                              :rows="3" auto-grow
                              @ionInput="(e: any) => { feat.description = e.target.value; }"/>
              </div>
              <button class="list-editor__add" @click="npc.features.push({ name: '', description: '' })">+ Добавить
                умение
              </button>
            </div>
          </section>

          <section class="panel">
            <h2 class="panel__title">
              <span class="panel__icon"><ion-icon :icon="flashOutline"/></span>Действия
            </h2>
            <div class="list-editor">
              <div v-for="(action, i) in npc.actions" :key="i" class="list-editor__entry">
                <div class="list-editor__entry-header">
                  <ion-select class="list-editor__select" :value="action.type" placeholder="Тип действия"
                              @ionChange="(e:any) => action.type=e.detail.value">
                    <ion-select-option value="ACTION">Действие</ion-select-option>
                    <ion-select-option value="BONUS_ACTION">Бонусное действие</ion-select-option>
                    <ion-select-option value="REACTION">Реакция</ion-select-option>
                    <ion-select-option value="LEGENDARY_ACTION">Легендарное действие</ion-select-option>
                    <ion-select-option value="LAIR_ACTION">Действие логова</ion-select-option>
                  </ion-select>
                  <ion-input class="list-editor__input list-editor__input--name list-editor__input--action-name"
                             :value="action.name" placeholder="Название действия"
                             @ionInput="(e: any) => { action.name = e.target.value; }"/>
                  <button class="list-editor__remove" @click="npc.actions.splice(i, 1)">✕</button>
                </div>
                <ion-textarea class="list-editor__textarea"
                              :value="action.description" placeholder="Описание..."
                              :rows="3" auto-grow
                              @ionInput="(e: any) => { action.description = e.target.value; }"/>
              </div>
              <button class="list-editor__add" @click="npc.actions.push({ name: '', description: '', type: 'ACTION' })">
                + Добавить действие
              </button>
            </div>
          </section>

          <section class="panel"><h2 class="panel__title">
            <span class="panel__icon"><ion-icon :icon="shieldOutline"/></span>Спасброски
          </h2>
            <div class="list-editor">
              <div v-for="(save, i) in npc.savingThrows" :key="i" class="list-editor__row">
                <ion-select label="Характеристика" label-placement="stacked" class="list-editor__select"
                            :value="save.name" placeholder="Выберите" @ionChange="(e:any) => save.name=e.detail.value">
                  <ion-select-option value="STR">Сила</ion-select-option>
                  <ion-select-option value="DEX">Ловкость</ion-select-option>
                  <ion-select-option value="CON">Телосложение</ion-select-option>
                  <ion-select-option value="INT">Интеллект</ion-select-option>
                  <ion-select-option value="WIS">Мудрость</ion-select-option>
                  <ion-select-option value="CHA">Харизма</ion-select-option>
                </ion-select>
                <ion-input type="number" label="Бонус" label-placement="stacked"
                           class="list-editor__input list-editor__input--bonus" :value="save.bonus ?? ''"
                           placeholder="+0" @ionInput="(e:any) => save.bonus=Number(e.target.value)"/>
                <button class="list-editor__remove" @click="npc.savingThrows.splice(i,1)">✕</button>
              </div>
              <button class="list-editor__add" @click="npc.savingThrows.push({name:'',bonus:null})">+ Добавить
                спасбросок
              </button>
            </div>
          </section>
          <section class="panel"><h2 class="panel__title">
            <span class="panel__icon"><ion-icon :icon="shieldCheckmarkOutline"/></span>Сопротивления, иммунитеты и прочее
          </h2>
            <ion-select multiple label="Сопротивления" label-placement="stacked" :value="npc.resistances"
                        @ionChange="(e:any) => npc.resistances=e.detail.value">
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
            <ion-input label="Иммунитеты к состояниям (через запятую)" label-placement="stacked"
                       :value="npc.immunities.join(', ')"
                       @ionInput="(e:any) => npc.immunities=e.target.value.split(',').map((v:string)=>v.trim()).filter(Boolean)"/>
            <div class="list-editor__entry" v-for="(sense,i) in npc.senses" :key="i">
              <div class="list-editor__entry-header">
                <ion-input :value="sense.name" placeholder="Пассивное чувство"
                           @ionInput="(e:any)=>sense.name=e.target.value"/>
                <ion-input type="number" :value="sense.value ?? ''" placeholder="Значение"
                           @ionInput="(e:any)=>sense.value=Number(e.target.value)"/>
                <button class="list-editor__remove" @click="npc.senses.splice(i,1)">✕</button>
              </div>
            </div>
            <button class="list-editor__add" @click="npc.senses.push({name:'',value:null})">+ Добавить пассивное
              чувство
            </button>
            <ion-input label="Языки" label-placement="stacked" :value="npc.languages ?? ''"
                       @ionInput="(e:any) => npc.languages=e.target.value"/>
          </section>
          <section class="panel"><h2 class="panel__title">
            <span class="panel__icon"><ion-icon :icon="sparkles"/></span>Заклинания
          </h2>
            <div class="list-editor">
              <div v-for="(spell,i) in npc.spells" :key="spell.spellId ?? i" class="list-editor__entry">
                <div class="list-editor__entry-header spell-entry-header">
                  <span class="spell-level-badge">{{ spellLevelLabel(resolveSpell(spell).level) }}</span>
                  <span class="spell-picked-name">{{ resolveSpell(spell).name }}</span>
                  <ion-input type="number" inputmode="numeric" class="list-editor__input spell-charges"
                             :value="spell.chargesPerDay ?? ''" placeholder="Заряды/день"
                             @ionInput="(e:any)=>spell.chargesPerDay=Number(e.target.value)"/>
                  <button class="list-editor__remove" @click="npc.spells.splice(i,1)">✕</button>
                </div>
              </div>
              <button class="list-editor__add" @click="openSpellPicker">
                + Добавить заклинание из справочника
              </button>
            </div>
          </section>
          <section class="panel">
            <h2 class="panel__title">
              <span class="panel__icon"><ion-icon :icon="documentTextOutline"/></span>Описание
            </h2>
            <ion-textarea
                v-model="npc.description"
                class="description-input"
                :rows="5"
                placeholder="Описание NPC..."
            />
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
          @click="onCancel"
      >
        <ion-icon slot="start" :icon="closeCircleOutline"/>
        Отменить
      </ion-button>
      <ion-button
          class="item-footer__btn item-footer__btn--primary"
          expand="block"
          fill="solid"
          shape="round"
          color="primary"
          :disabled="isLoading || !npc.name?.trim()"
          @click="onSave"
      >
        <ion-icon slot="start" :icon="saveOutline"/>
        Сохранить
      </ion-button>
    </div>

    <ion-modal :is-open="showSpellPicker" @didDismiss="showSpellPicker = false">
      <MagicSearchView pick-mode @select="onPickSpell" @close="showSpellPicker = false"/>
    </ion-modal>
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
  border: 1px solid var(--ion-color-medium);
  cursor: pointer;
  transition: background-color 0.45s ease;
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
  justify-content: center;
  gap: 8px;
  padding: 12px 10px;
  background: linear-gradient(158deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.55) 100%);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.12);
}

/* Type chip */
.meta-chip--type {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  background: linear-gradient(150deg, rgba(var(--ion-color-primary-rgb), 0.2), rgba(var(--ion-color-primary-rgb), 0.06));
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
  transition: border-color 0.15s ease, transform 0.1s ease;
}

.meta-chip--type:active {
  transform: scale(0.98);
}

.meta-chip__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: rgba(var(--ion-color-primary-rgb), 0.18);
  color: var(--ion-color-primary);
  font-size: 18px;
}

.meta-chip__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 1px;
}

.meta-chip__label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.5);
}

.meta-chip__value {
  font-size: 14px;
  font-weight: 700;
  color: var(--ion-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-chip__chevron {
  flex-shrink: 0;
  font-size: 14px;
  color: rgba(var(--ion-color-light-rgb), 0.4);
}

/* Toggle chips (visibility / uniqueness) */
.meta-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 10px;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--ion-color-light-rgb), 0.6);
  background: rgba(var(--ion-color-light-rgb), 0.04);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.meta-toggle ion-icon {
  flex-shrink: 0;
  font-size: 17px;
}

.meta-toggle span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-toggle--on {
  background: rgba(var(--ion-color-primary-rgb), 0.14);
  border-color: rgba(var(--ion-color-primary-rgb), 0.4);
  color: var(--ion-color-primary);
}

.hidden-select {
  display: none;
}

/* Avatar edit badge */
.avatar-edit-badge {
  position: absolute;
  z-index: 2;
  right: 8px;
  bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 11px;
  color: var(--ion-color-primary-contrast);
  background: var(--ion-color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  font-size: 16px;
}

.item-identity {
  padding: 0 4px;
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

.item-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel {
  padding: 16px 14px;
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--ion-color-medium-rgb), 0.96) 0%, rgba(var(--ion-color-dark-rgb), 0.42) 100%);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.06);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
}

.panel__title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.72);
}

.panel__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: rgba(var(--ion-color-primary-rgb), 0.14);
  color: var(--ion-color-primary);
  font-size: 15px;
}

.details-grid {
  --detail-control-width: 250px;
  display: flex;
  flex-direction: column;
}

.detail-row {
  display: grid;
  grid-template-columns: minmax(0, 100px) var(--detail-control-width);
  align-items: center;
  column-gap: 12px;
  min-height: 48px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.06);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row__label {
  font-size: 14px;
  line-height: 1.35;
  color: rgba(var(--ion-color-light-rgb), 0.62);
}

.dice-row {
  min-width: 200px;
}

.detail-row__input,
.detail-row__select {
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
  text-align: right;
  font-weight: 600;
  font-size: 14px;
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

@media (min-width: 1024px) {
  .item-page {
    max-width: 960px;
    padding-top: 8px;
  }

  .item-header {
    justify-content: flex-start;
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
  }
}

.detail-row--dice {
  grid-template-columns: auto 1fr;
}

.dice-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.dice-count-input, .dice-size-input, .dice-bonus-input {
  flex: 1;
}

.dice-sep {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ion-color-primary);
  flex-shrink: 0;
}

.dice-preview {
  font-size: 0.75rem;
  color: var(--ion-color-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.abilities-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.ability-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.15);
  border-radius: 10px;
  padding: 8px 6px;
}

.ability-cell__label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ion-color-primary);
}

.ability-cell__input {
  --background: transparent;
  --color: var(--ion-color-light);
  --placeholder-color: rgba(255, 255, 255, 0.3);
  text-align: center;
  font-size: 1.1rem;
  font-weight: 700;
  width: 100%;
}

.ability-cell__mod {
  font-size: 0.72rem;
  color: var(--ion-color-secondary);
  font-weight: 600;
}

/* List editor (skills, actions, features) */
.list-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-editor__row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.list-editor__row > ion-select,
.list-editor__row > ion-input {
  min-width: 0;
}

.list-editor__action-header {
  display: grid;
  grid-template-columns: minmax(170px, 0.75fr) minmax(240px, 1.5fr) auto;
  align-items: end;
}

.list-editor__entry-header:has(.list-editor__input--action-name) {
  display: grid;
  grid-template-columns: minmax(170px, 0.75fr) minmax(240px, 1.5fr) auto;
  align-items: end;
}

.list-editor__entry-header:has(.list-editor__input--action-name) ion-select,
.list-editor__entry-header:has(.list-editor__input--action-name) ion-input {
  min-width: 0;
  width: 100%;
}

.list-editor__action-header ion-select,
.list-editor__action-header ion-input {
  min-width: 0;
  width: 100%;
}

.list-editor__entry {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
}

.list-editor__entry-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.list-editor__input {
  --background: rgba(255, 255, 255, 0.06);
  --border-radius: 8px;
  --padding-start: 10px;
  --padding-end: 10px;
  --color: var(--ion-color-light);
  --placeholder-color: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 0.88rem;
  height: 36px;
}

.list-editor__input--name {
  flex: 1;
}

.list-editor__input--action-name {
  min-width: 180px;
}

.list-editor__input--bonus {
  width: 80px;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .list-editor__action-header {
    grid-template-columns: 1fr auto;
  }

  .list-editor__action-header ion-select {
    grid-column: 1 / -1;
  }

  .list-editor__action-header .list-editor__input--action-name {
    min-width: 0;
  }

  .list-editor__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 80px auto;
  }

  .list-editor__entry-header:has(.list-editor__input--action-name) {
    grid-template-columns: 1fr auto;
  }

  .list-editor__entry-header:has(.list-editor__input--action-name) ion-select {
    grid-column: 1 / -1;
  }
}

.list-editor__select {
  flex: 1;
  --background: rgba(255, 255, 255, 0.06);
  --border-radius: 8px;
  --padding-start: 10px;
  --padding-end: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  min-height: 40px;
}

.list-editor__textarea {
  --background: rgba(255, 255, 255, 0.04);
  --border-radius: 8px;
  --padding-start: 10px;
  --padding-end: 10px;
  --color: var(--ion-color-light);
  --placeholder-color: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 0.85rem;
  width: 100%;
}

.list-editor__remove {
  background: transparent;
  border: 1px solid rgba(var(--ion-color-danger-rgb), 0.3);
  color: var(--ion-color-danger);
  border-radius: 7px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s;
}

.list-editor__remove:hover {
  background: rgba(var(--ion-color-danger-rgb), 0.1);
}

/* Spell picker row */
.spell-entry-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spell-level-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  height: 30px;
  border-radius: 8px;
  font-size: 0.74rem;
  font-weight: 700;
  white-space: nowrap;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.25);
}

.spell-picked-name {
  flex: 1;
  min-width: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ion-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.spell-charges {
  width: 104px;
  flex-shrink: 0;
  text-align: right;
}

@media (max-width: 640px) {
  .spell-charges {
    width: 84px;
  }
}

.list-editor__add {
  background: transparent;
  border: 1px dashed rgba(var(--ion-color-primary-rgb), 0.35);
  color: var(--ion-color-primary);
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s;
  text-align: left;
}

.list-editor__add:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.06);
}


</style>
