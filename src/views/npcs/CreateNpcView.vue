<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  IonButton,
  IonButtons,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToggle,
  toastController,
} from "@ionic/vue";
import { add, closeCircleOutline, saveOutline } from "ionicons/icons";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
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
import { getClassesForRoom, getRacesForRoom } from "@/api/rulebookApi";
import {
  FILE_STORAGE_INTEGRATION_ROUTES,
  GATEWAY_INTEGRATION_ROUTES,
} from "@/config/integrationRoutes";
import axios from "axios";
import {useNpcRelationsStore} from "@/stores/NpcRelationsStore";

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
const npcRelationsStore = useNpcRelationsStore()

const previewImage = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
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
  unique: false,
  clazzCode: null,
  raceCode: null,
  armoryClass: null,
  speed: null,
  initiative: null,
  imgUrl: null,
  createdBy: "",
});

const npcTypeOptions: Array<{ value: NpcTypeEnum; label: string }> = [
  { value: "RATIONAL", label: "Разумное" },
  { value: "BEAST", label: "Животное" },
  { value: "MONSTER", label: "Монстр" },
  { value: "DEITY", label: "Божество" },
  { value: "UNDEAD", label: "Нежить" },
];

const roomClasses = ref<{ value: string; label: string }[]>([]);
const roomRaces = ref<{ value: string; label: string }[]>([]);
const roomClassesLoading = ref(true);
const roomRacesLoading = ref(true);

function triggerFileInput() {
  fileInput.value?.click();
}

function setVisible(checked: boolean) {
  npc.value.visible = checked;
}
function setUnique(checked: boolean) {
  npc.value.unique = checked;
}
function setType(value: NpcTypeEnum) {
  npc.value.type = value;
}

async function uploadToStorage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userFilename", `npc-${Date.now()}`);
  const res = await axios.put(
    `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
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
        Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`,
      },
    }
  );
  const data = myIdResponse.data as unknown;
  if (typeof data === "string") return data;
  if (data && typeof data === "object" && "id" in (data as any)) {
    const id = (data as any).id;
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
    previewImage.value = `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${dto.imgUrl}`;
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
    npcRelationsStore.loadAll(roomId.value, characterId.value);
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
    // If opened from BioView: create relation (relationType can be null)
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
  (async () => {
    try {
      const id = await getMyId();
      if (id?.trim()) npc.value.createdBy = id.trim();
    } catch (e) {
      console.error("Failed to resolve myId:", e);
    }
  })();
  (async () => {
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
  loadNpcIfEditing();
});
</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="npcId ? 'Редактирование NPC' : 'Создание NPC'" />
    <ion-content color="dark">
      <div class="container">
        <div class="header">
          <div class="avatar" @click="triggerFileInput">
            <img v-if="previewImage" :src="previewImage" class="avatar-img" alt="NPC" />
            <img
              v-else-if="npc.imgUrl"
              :src="`${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${npc.imgUrl}`"
              class="avatar-img"
              alt="NPC"
            />
            <div v-else class="avatar-img placeholder">
              <ion-icon :icon="add" class="placeholder-icon" />
            </div>
            <input
              type="file"
              ref="fileInput"
              @change="handleFileUpload"
              accept="image/*"
              style="display: none"
            />
          </div>
        </div>

        <div class="body">
          <div class="stat-section">
            <div class="stat-section-name">Имя</div>
            <ion-input
              type="text"
              fill="outline"
              color="primary"
              :clear-input="true"
              v-model="npc.name"
              label-placement="floating"
              class="input-block"
            />
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Тип</div>
            <ion-select
              fill="outline"
              color="primary"
              :value="npc.type"
              @ionChange="(e) => setType((e as CustomEvent).detail.value)"
              interface="popover"
              class="input-block"
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

          <ion-item lines="none" class="toggle-item">
            <ion-label>Видимый</ion-label>
            <ion-toggle :checked="npc.visible" @ionChange="(e) => setVisible((e as CustomEvent).detail.checked)" />
          </ion-item>
          <ion-item lines="none" class="toggle-item">
            <ion-label>Уникальный</ion-label>
            <ion-toggle :checked="npc.unique" @ionChange="(e) => setUnique((e as CustomEvent).detail.checked)" />
          </ion-item>

          <div class="stat-section">
            <div class="stat-section-name">Описание</div>
            <ion-textarea
              fill="outline"
              color="primary"
              :clear-input="true"
              v-model="npc.description"
              class="input-block"
              :rows="5"
            />
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Класс</div>
            <ion-select
              fill="outline"
              color="primary"
              :value="npc.clazzCode ?? ''"
              @ionChange="
                (e) => {
                  const v = (e as CustomEvent).detail.value;
                  npc.value.clazzCode = v === '' ? null : v;
                }
              "
              interface="popover"
              :placeholder="
                roomClassesLoading
                  ? 'Загрузка классов комнаты...'
                  : roomClasses.length
                    ? 'Выберите класс (можно не выбирать)'
                    : 'В комнате нет классов'
              "
              :disabled="roomClassesLoading"
              class="input-block"
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

          <div class="stat-section">
            <div class="stat-section-name">Раса</div>
            <ion-select
              fill="outline"
              color="primary"
              :value="npc.raceCode ?? ''"
              @ionChange="
                (e) => {
                  const v = (e as CustomEvent).detail.value;
                  npc.value.raceCode = v === '' ? null : v;
                }
              "
              interface="popover"
              :placeholder="
                roomRacesLoading
                  ? 'Загрузка рас комнаты...'
                  : roomRaces.length
                    ? 'Выберите расу (можно не выбирать)'
                    : 'В комнате нет рас'
              "
              :disabled="roomRacesLoading"
              class="input-block"
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

          <div class="stat-section">
            <div class="stat-section-name">КД (armoryClass)</div>
            <ion-input
              type="text"
              fill="outline"
              color="primary"
              :clear-input="true"
              v-model="npc.armoryClass"
              class="input-block"
            />
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Скорость</div>
            <ion-input
              type="text"
              fill="outline"
              color="primary"
              :clear-input="true"
              v-model="npc.speed"
              class="input-block"
            />
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Инициатива</div>
            <ion-input
              type="number"
              fill="outline"
              color="primary"
              :clear-input="true"
              :value="npc.initiative ?? ''"
              @ionInput="
                (e) => {
                  const v = Number((e.target as HTMLIonInputElement).value);
                  npc.value.initiative = Number.isFinite(v) ? v : null;
                }
              "
              class="input-block"
            />
          </div>

          <div class="stat-section">
            <ion-label class="helper-text helper-text--block"
              >Нажмите на изображение сверху, чтобы загрузить картинку (как в
              заклинаниях).</ion-label
            >
          </div>
        </div>
      </div>

      <ion-buttons class="buttons-block">
        <ion-button color="primary" fill="solid" shape="round" @click="onCancel">
          <ion-icon slot="start" :icon="closeCircleOutline" />
          Отменить
        </ion-button>
        <ion-button
          color="primary"
          fill="solid"
          shape="round"
          :disabled="isLoading || !npc.name?.trim()"
          @click="onSave"
        >
          <ion-icon slot="start" :icon="saveOutline" />
          Сохранить
        </ion-button>
      </ion-buttons>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.container {
  background: var(--ion-color-dark);
  padding-bottom: 24px;
}

.header {
  display: flex;
  justify-content: center;
  width: 100%;
}

.avatar {
  margin: 10px;
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 100%;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
}

.avatar-img {
  width: 100%;
  max-height: 280px;
  object-fit: cover;
  border-radius: 12px;
  display: block;
}

.avatar-img.placeholder {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-dark-shade);
}

.placeholder-icon {
  font-size: 48px;
  color: var(--ion-color-light);
}

.body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
}

.stat-section {
  margin-top: 16px;
  font-size: 16px;
  width: 90%;
}

.stat-section-name {
  font-size: 14px;
  color: var(--ion-color-light);
  opacity: 0.9;
  margin-bottom: 4px;
}

.helper-text {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 0 0 6px 0;
  line-height: 1.3;
}

.helper-text--block {
  margin: 0 10px 8px;
  text-align: center;
}

.input-block {
  --background: var(--ion-color-dark-shade);
  border-radius: 8px;
}

.buttons-block {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px 10px;
}

.toggle-item {
  --background: transparent;
  margin-top: 8px;
  width: 90%;
}
.toggle-item ion-label {
  color: var(--ion-color-light);
}

</style>

