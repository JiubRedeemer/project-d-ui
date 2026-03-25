<script setup lang="ts">
import {add, closeCircleOutline, saveOutline} from "ionicons/icons";
import {
  IonButton,
  IonIcon,
  IonInput,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
} from "@ionic/vue";
import {computed, onBeforeMount, ref} from "vue";
import {useRoute, useRouter} from "vue-router";
import {useCreateBackgroundStore} from "@/stores/createEntity/CreateBackgroundStore";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import axios from "axios";
import {AbilityDto, BackgroundDto, BackgroundStatsDto} from "@/api/rulebookApi.types";
import {createBackground, getAbilitiesForRoom} from "@/api/rulebookApi";
import {useGuidebookStore} from "@/stores/GuidebookStore";

const fileInput = ref<HTMLInputElement | null>(null);
const previewImage = ref<string | null>(null);

const createBackgroundStore = useCreateBackgroundStore();
const guidebookStore = useGuidebookStore();
const route = useRoute();
const router = useRouter();

const abilities = ref<AbilityDto[]>([]);

const allowedFormats = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
  "image/tiff",
  "image/svg+xml",
];

const isSaving = ref(false);

const abilityOptions = computed(() => {
  const fromApi = abilities.value.map((a) => ({code: a.code ?? "", name: a.name ?? a.code}));
  const standard = [
    {code: "STR", name: "Сила"},
    {code: "DEX", name: "Ловкость"},
    {code: "CON", name: "Телосложение"},
    {code: "INT", name: "Интеллект"},
    {code: "WIS", name: "Мудрость"},
    {code: "CHA", name: "Харизма"},
  ];
  return fromApi.length ? fromApi : standard;
});

const abilityModifiers = computed(() => createBackgroundStore.background.stats?.abilityModifiers ?? []);

function abilityModifierOptionsForIndex(index: number) {
  const list = abilityModifiers.value;
  const usedCodes = new Set(list.map((code, i) => (i !== index ? code : null)).filter(Boolean));
  const currentCode = list[index] ?? null;
  return abilityOptions.value.filter((opt) => opt.code === currentCode || !usedCodes.has(opt.code));
}

const backgroundImageUrl = computed(() => {
  const url = createBackgroundStore.background.imgUrl;
  if (!url) return "";
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.backgrounds_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${url}`;
});

function addAbilityModifier() {
  const stats = createBackgroundStore.background.stats;
  if (!stats) return;
  const list = [...(stats.abilityModifiers ?? [])];
  const used = new Set(list);
  const firstUnused = abilityOptions.value.find((opt) => !used.has(opt.code));
  list.push(firstUnused ? firstUnused.code : "STR");
  createBackgroundStore.background.stats!.abilityModifiers = list;
}

function removeAbilityModifier(index: number) {
  const list = createBackgroundStore.background.stats?.abilityModifiers;
  if (!list) return;
  const next = [...list];
  next.splice(index, 1);
  createBackgroundStore.background.stats!.abilityModifiers = next;
}

function setAbilityModifier(index: number, code: string) {
  const list = createBackgroundStore.background.stats?.abilityModifiers;
  if (list && list[index] !== undefined) list[index] = code;
}

function slugCode(name: string): string {
  const base = name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || "background";
  const existing = new Set(guidebookStore.backgrounds.map((b) => b.code));
  if (!existing.has(base)) return base;
  let n = 1;
  while (existing.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

function onCancel() {
  router.back();
}

async function onSave() {
  const b = createBackgroundStore.background;
  if (!b.name?.trim()) return;

  const routeRoomId = (() => {
    const v = route.params.roomId as string | string[] | undefined;
    return Array.isArray(v) ? v[0] : v;
  })();
  const roomId =
    createBackgroundStore.roomId ??
    guidebookStore.roomId ??
    routeRoomId;
  if (!roomId) return;

  const code = b.code?.trim() || slugCode(b.name);
  const dto: BackgroundDto = {
    id: b.id || "",
    roomId,
    name: b.name.trim(),
    description: b.description?.trim() || null,
    code,
    imgUrl: b.imgUrl || null,
    stats: b.stats ?? undefined,
  };

  isSaving.value = true;
  try {
    const saved = await createBackground(roomId, dto);

    const idx = guidebookStore.backgrounds.findIndex((x) => x.code === saved.code);
    guidebookStore.backgrounds =
      idx >= 0
        ? [...guidebookStore.backgrounds.slice(0, idx), saved, ...guidebookStore.backgrounds.slice(idx + 1)]
        : [...guidebookStore.backgrounds, saved];
    guidebookStore.lastUpdatedAt = Date.now();

    router.back();
  } catch (e) {
    console.error("Не удалось сохранить предысторию:", e);
    alert("Не удалось сохранить предысторию. Проверьте соединение и заполнение полей.");
  } finally {
    isSaving.value = false;
  }
}

const triggerFileInput = () => fileInput.value?.click();

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0] || null;
  if (!file) return;
  if (!allowedFormats.includes(file.type)) {
    alert("Формат файла не поддерживается. Разрешены: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    previewImage.value = reader.result as string;
  };
  reader.readAsDataURL(file);

  const path = await uploadBackgroundImage(file);
  createBackgroundStore.background.imgUrl = path;
};

async function uploadBackgroundImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "userFilename",
    createBackgroundStore.background.id ||
      createBackgroundStore.background.code ||
      `background_${Date.now()}`
  );

  const res = await axios.put(
    `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.backgrounds_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
    formData,
    {headers: {"Content-Type": "multipart/form-data"}}
  );
  return res.data;
}

onBeforeMount(async () => {
  if (!createBackgroundStore.background.stats) {
    createBackgroundStore.background.stats = {
      id: "",
      abilityModifiers: [],
      traits: null,
      proficiencies: null,
    } as BackgroundStatsDto;
  }
  if (!createBackgroundStore.background.stats.abilityModifiers) {
    createBackgroundStore.background.stats.abilityModifiers = [];
  }

  const roomId =
    createBackgroundStore.roomId ??
    guidebookStore.roomId ??
    (() => {
      const v = route.params.roomId as string | string[] | undefined;
      return Array.isArray(v) ? v[0] : v;
    })();
  if (roomId) {
    try {
      abilities.value = await getAbilitiesForRoom(roomId);
    } catch {
      abilities.value = [];
    }
  }
});
</script>

<template>
  <ion-page>
    <RoomsHeader header-name="Создание предыстории" />
    <ion-content color="dark">
      <div class="container">
        <div class="header">
          <div class="avatar-wrap">
            <div class="avatar" @click="triggerFileInput">
              <img v-if="previewImage" :src="previewImage" class="avatar-img" alt="Background" />
              <img v-else-if="createBackgroundStore.background.imgUrl" :src="backgroundImageUrl" class="avatar-img" alt="Background" />
              <div v-else class="avatar-img placeholder">
                <ion-icon :icon="add" class="placeholder-icon" />
              </div>
              <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" style="display: none" />
            </div>
            <p class="helper-text helper-text--block">Нажмите, чтобы загрузить изображение. Форматы: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG.</p>
          </div>
        </div>
        <div class="body">
          <div class="stat-section">
            <div class="stat-section-name">Название предыстории</div>
            <p class="helper-text">Краткое название, например: Солдат, Благородный.</p>
            <ion-input
              type="text"
              fill="outline"
              color="primary"
              :clear-input="true"
              v-model="createBackgroundStore.background.name"
              label-placement="floating"
              class="input-block"
            />
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Описание</div>
            <p class="helper-text">Подробное описание предыстории для игроков.</p>
            <ion-textarea
              fill="outline"
              color="primary"
              :clear-input="true"
              v-model="createBackgroundStore.background.description"
              class="input-block"
              :rows="5"
            />
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Бонусы характеристик</div>
            <p class="helper-text">Характеристики, к которым предыстория даёт бонусы (например, +2 к одной и +1 к другой).</p>
            <div
              v-for="(code, index) in abilityModifiers"
              :key="index"
              class="bonus-row"
            >
              <ion-select
                fill="outline"
                color="primary"
                :value="code"
                @ionChange="(e) => setAbilityModifier(index, (e as CustomEvent).detail.value ?? code)"
                interface="popover"
                class="bonus-select"
              >
                <ion-select-option
                  v-for="opt in abilityModifierOptionsForIndex(index)"
                  :key="opt.code"
                  :value="opt.code"
                >
                  {{ opt.name }}
                </ion-select-option>
              </ion-select>
              <button type="button" class="clear-row-btn" aria-label="Удалить" @click="removeAbilityModifier(index)">
                <ion-icon :icon="closeCircleOutline" />
              </button>
            </div>
            <ion-button fill="solid" color="primary" class="add-bonus-btn" @click="addAbilityModifier">
              <ion-icon :icon="add" />
            </ion-button>
          </div>
        </div>
      </div>
      <ion-buttons class="buttons-block">
        <ion-button color="primary" fill="solid" shape="round" @click="onCancel">
          <ion-icon slot="start" :icon="closeCircleOutline" />
          Отменить
        </ion-button>
        <ion-button color="primary" fill="solid" shape="round" :disabled="!createBackgroundStore.background.name?.trim() || isSaving" @click="onSave">
          <ion-icon slot="start" :icon="saveOutline" />
          Сохранить
        </ion-button>
      </ion-buttons>
    </ion-content>
  </ion-page>
</template>

<style scoped>
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

.container {
  background: var(--ion-color-dark);
  padding-bottom: 24px;
}

.header {
  display: flex;
  justify-content: center;
  width: 100%;
}

.avatar-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
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

.input-block {
  --background: var(--ion-color-dark-shade);
  border-radius: 8px;
}

.bonus-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.bonus-select {
  flex: 1;
  min-width: 0;
  --background: var(--ion-color-dark-shade);
  border-radius: 8px;
}

.clear-row-btn {
  flex-shrink: 0;
  padding: 4px;
  background: none;
  border: none;
  color: var(--ion-color-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-row-btn ion-icon {
  font-size: 24px;
}

.add-bonus-btn {
  margin-top: 12px;
  --border-radius: 50%;
  width: 48px;
  height: 48px;
}

.buttons-block {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px 10px;
}
</style>

