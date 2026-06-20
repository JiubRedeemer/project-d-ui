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
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToolbar,
  toastController,
} from "@ionic/vue";
import {add, closeCircleOutline, saveOutline} from "ionicons/icons";
import {
  getNpcByIdForRoom,
  saveCharacterNpcRelationForRoom,
  saveNpcForRoom,
} from "@/api/npcApi";
import type {
  NpcDto,
  NpcTypeEnum,
  RelationTypeEnum,
  SaveCharacterNpcRelationRequest,
  SaveNpcRequest,
} from "@/api/npcApi.types";
import {getClassesForRoom, getRacesForRoom} from "@/api/rulebookApi";
import {
  FILE_STORAGE_INTEGRATION_ROUTES,
  GATEWAY_INTEGRATION_ROUTES,
} from "@/config/integrationRoutes";
import axios from "axios";
import {useNpcRelationsStore} from "@/stores/NpcRelationsStore";
import {extractDominantColorFromUrl} from "@/utils/imageAmbient";

const NPC_TYPE_ABBREVIATIONS: Record<NpcTypeEnum, string> = {
  RATIONAL: "Р",
  BEAST: "Ж",
  MONSTER: "М",
  DEITY: "Б",
  UNDEAD: "Н",
};

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

function getNpcTypeAbbreviation(type: NpcTypeEnum | undefined | null): string {
  if (!type) return "—";
  return NPC_TYPE_ABBREVIATIONS[type] ?? type.charAt(0);
}

function formatBool(value: boolean | undefined | null): string {
  return value ? "Да" : "Нет";
}

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
          </button>

          <div class="stats">
            <div class="stat">
              <span class="stat__label">Тип</span>
              <span class="stat-value" @click="openTypeSelect">
                {{ getNpcTypeAbbreviation(npc.type) }}
              </span>
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
            </div>

            <div class="stat">
              <span class="stat__label">Видимость</span>
              <span class="stat-value stat-value--wide" @click="toggleVisible">
                {{ formatBool(npc.visible) }}
              </span>
            </div>

            <div class="stat">
              <span class="stat__label">Уникальность</span>
              <span class="stat-value stat-value--wide" @click="toggleUnique">
                {{ formatBool(npc.unique) }}
              </span>
            </div>
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
            <h2 class="panel__title">Характеристики</h2>
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
            </div>
          </section>

          <section class="panel">
            <h2 class="panel__title">Описание</h2>
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

.hidden-select {
  display: none;
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

.detail-row__label {
  min-width: 0;
  font-size: 14px;
  line-height: 1.35;
  color: rgba(var(--ion-color-light-rgb), 0.62);
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
</style>
