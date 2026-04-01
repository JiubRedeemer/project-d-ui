<script setup lang="ts">
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
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
import {useCreateRaceStore} from "@/stores/createEntity/CreateRaceStore";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import axios from "axios";
import {AbilityDto, RaceDto, RaceStatsDto} from "@/api/rulebookApi.types";
import {createRace, getAbilitiesForRoom, getRootRacesForRoom, updateRace} from "@/api/rulebookApi";
import {useGuidebookStore} from "@/stores/GuidebookStore";
import {useFullRaceStore} from "@/stores/FullRaceStore";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

const fileInput = ref<HTMLInputElement | null>(null);
const previewImage = ref<string | null>(null);
const avatarImage = ref<File | null>(null);
const filePath = ref<string>("");

const createRaceStore = useCreateRaceStore();
const guidebookStore = useGuidebookStore();
const fullRaceStore = useFullRaceStore();
const route = useRoute();
const router = useRouter();

const abilities = ref<AbilityDto[]>([]);
const speciesList = ref<RaceDto[]>([]);

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
  const special = [
    {code: "ANY", name: "Любая"},
    {code: "ALL", name: "Все"},
  ];
  const standard = [
    {code: "STR", name: "Сила"},
    {code: "DEX", name: "Ловкость"},
    {code: "CON", name: "Телосложение"},
    {code: "INT", name: "Интеллект"},
    {code: "WIS", name: "Мудрость"},
    {code: "CHA", name: "Харизма"},
  ];
  if (fromApi.length) return [...fromApi, ...special];
  return [...standard, ...special];
});

const raceImageUrl = computed(() => {
  const url = createRaceStore.race.imgUrl;
  if (!url) return "";
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.races_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${url}`;
});

const modifiers = computed(() => createRaceStore.race.stats?.abilityModifiers ?? []);

const canAddBonus = computed(() => {
  const list = createRaceStore.race.stats?.abilityModifiers ?? [];
  return !list.some((m) => m.code === "ALL" || m.code === "ANY");
});

function addBonus() {
  if (!createRaceStore.race.stats) return;
  const list = [...(createRaceStore.race.stats.abilityModifiers ?? [])];
  list.push({code: "STR", value: 0, count: 1});
  createRaceStore.race.stats.abilityModifiers = list;
}

function removeBonus(index: number) {
  if (!createRaceStore.race.stats?.abilityModifiers) return;
  const list = [...createRaceStore.race.stats.abilityModifiers];
  list.splice(index, 1);
  createRaceStore.race.stats.abilityModifiers = list;
}

function setModifierCode(index: number, code: string) {
  const list = createRaceStore.race.stats?.abilityModifiers;
  if (!list || !list[index]) return;
  list[index].code = code;
  if (code === "ALL" || code === "ANY") {
    const kept = {...list[index]};
    createRaceStore.race.stats!.abilityModifiers = [kept];
  }
}

function setModifierValue(index: number, value: number) {
  const list = createRaceStore.race.stats?.abilityModifiers;
  if (list && list[index]) list[index].value = value;
}

function setModifierCount(index: number, count: number) {
  const list = createRaceStore.race.stats?.abilityModifiers;
  if (list && list[index]) list[index].count = count;
}

const traits = computed(() => createRaceStore.race.stats?.traits ?? []);

function addTrait() {
  const stats = createRaceStore.race.stats;
  if (!stats) return;
  const list = [...(stats.traits ?? [])];
  list.push({name: "", description: ""});
  stats.traits = list;
}

function removeTrait(index: number) {
  const list = createRaceStore.race.stats?.traits;
  if (!list) return;
  const next = [...list];
  next.splice(index, 1);
  createRaceStore.race.stats!.traits = next;
}

const triggerFileInput = () => fileInput.value?.click();

function slugCode(name: string): string {
  const base =
    name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || "race";
  const existing = new Set(guidebookStore.races.map((r) => r.code));
  if (!existing.has(base)) return base;
  let n = 1;
  while (existing.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

function onCancel() {
  router.back();
}

async function onSave() {
  const r = createRaceStore.race;
  if (!r.name?.trim()) return;

  const routeRoomId = (() => {
    const v = route.params.roomId as string | string[] | undefined;
    return Array.isArray(v) ? v[0] : v;
  })();
  const roomId =
    createRaceStore.roomId ??
    guidebookStore.roomId ??
    routeRoomId;
  if (!roomId) return;

  const code = r.code?.trim() || slugCode(r.name);
  const normalizedTraits = (r.stats?.traits ?? [])
    .map((t) => {
      const name = t.name?.trim() ?? "";
      const description = t.description?.trim() ?? "";
      if (!name || !description) return null;
      const traitCode = t.code?.trim() || slugCode(`${r.name}_${name}`);
      return {...t, name, description, code: traitCode};
    })
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const raceDto: RaceDto = {
    id: r.id || "",
    roomId,
    name: r.name.trim(),
    description: r.description?.trim() || "",
    code,
    speciesCode: r.speciesCode || null,
    imgUrl: r.imgUrl || null,
    stats: {
      ...(r.stats as RaceStatsDto),
      abilityModifiers: r.stats?.abilityModifiers ?? [],
      traits: normalizedTraits,
      proficiencies: r.stats?.proficiencies ?? [],
    },
  };

  isSaving.value = true;
  try {
    const saved = raceDto.id
      ? await updateRace(roomId, raceDto)
      : await createRace(roomId, raceDto);

    const idx = guidebookStore.races.findIndex(
      (x) => (saved.id && x.id === saved.id) || (saved.code && x.code === saved.code)
    );
    guidebookStore.races =
      idx >= 0
        ? [...guidebookStore.races.slice(0, idx), saved, ...guidebookStore.races.slice(idx + 1)]
        : [...guidebookStore.races, saved];
    fullRaceStore.race = saved;
    createRaceStore.race = saved;
    guidebookStore.lastUpdatedAt = Date.now();

    router.back();
  } catch (e) {
    console.error("Не удалось сохранить расу:", e);
    alert("Не удалось сохранить расу. Проверьте соединение и заполнение полей.");
  } finally {
    isSaving.value = false;
  }
}

function uploadToMinio(file: File): Promise<string> {
  const userFilename = createRaceStore.race.id || createRaceStore.race.code || `race_${Date.now()}`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("userFilename", String(userFilename));

  return axios
    .put(
      `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.races_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
      formData,
      {headers: {"Content-Type": "multipart/form-data"}}
    )
    .then((res) => res.data);
}

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0] || null;
  if (!file || !allowedFormats.includes(file.type)) {
    alert("Формат файла не поддерживается. Разрешены: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG.");
    return;
  }

  avatarImage.value = file;

  const reader = new FileReader();
  reader.onload = () => {
    previewImage.value = reader.result as string;
  };
  reader.readAsDataURL(file);

  filePath.value = await uploadToMinio(file);
  createRaceStore.race.imgUrl = filePath.value;
};

onBeforeMount(async () => {
  if (!createRaceStore.race.stats) {
    createRaceStore.race.stats = {
      id: "",
      maxAge: 0,
      maxHeight: 0,
      maxWeight: 0,
      baseSpeed: null,
      abilityModifiers: [],
      traits: [],
      proficiencies: [],
    } as RaceStatsDto;
  }
  if (!createRaceStore.race.stats.abilityModifiers) {
    createRaceStore.race.stats.abilityModifiers = [];
  }
  if (!createRaceStore.race.stats.traits) {
    createRaceStore.race.stats.traits = [];
  }

  const roomId =
    createRaceStore.roomId ??
    guidebookStore.roomId ??
    (() => {
      const v = route.params.roomId as string | string[] | undefined;
      return Array.isArray(v) ? v[0] : v;
    })();
  const baseRules = guidebookStore.baseRuleType;

  if (roomId) {
    try {
      abilities.value = await getAbilitiesForRoom(roomId);
    } catch {
      abilities.value = [];
    }
    try {
      speciesList.value = await getRootRacesForRoom(ZERO_UUID, baseRules);
    } catch {
      speciesList.value = [];
    }
  }
});
</script>

<template>
  <ion-page>
    <RoomsHeader header-name="Создание вида"></RoomsHeader>
    <ion-content color="dark">
      <div class="container">
        <div class="header">
          <div class="avatar-wrap">
            <div class="avatar" @click="triggerFileInput">
              <img v-if="previewImage" :src="previewImage" class="avatar-img" alt="Room Image"/>
              <img v-else-if="createRaceStore.race.imgUrl" :src="raceImageUrl"
                   class="avatar-img" alt="avatar"/>
              <div v-else class="avatar-img placeholder">
                <ion-icon :icon="add" class="placeholder-icon"></ion-icon>
              </div>
              <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" style="display: none;"/>
            </div>
            <p class="helper-text helper-text--block">Нажмите, чтобы загрузить изображение. Форматы: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG.</p>
          </div>
        </div>

        <div class="body">
          <div class="stat-section">
            <div class="stat-section-name">Название вида</div>
            <p class="helper-text">Краткое название, например: Дварф, Эльф.</p>
            <ion-input
                type="text"
                fill="outline"
                color="primary"
                :clear-input="true"
                v-model="createRaceStore.race.name"
                label-placement="floating"
                class="input-block"
            />
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Описание</div>
            <p class="helper-text">Подробное описание вида для игроков.</p>
            <div class="section-description">
              <ion-textarea
                  fill="outline"
                  color="primary"
                  :clear-input="true"
                  v-model="createRaceStore.race.description"
                  class="input-block"
                  :rows="5"
              ></ion-textarea>
            </div>
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Базовая скорость</div>
            <p class="helper-text">Скорость в футах за ход (число).</p>
            <ion-input
                type="number"
                fill="outline"
                color="primary"
                :clear-input="true"
                v-model="createRaceStore.race.stats.baseSpeed"
                label-placement="floating"
                class="input-block"
            />
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Бонусы характеристик</div>
            <p class="helper-text">«Все» — бонус ко всем характеристикам; «Любая» — игрок выбирает указанное количество; иначе — конкретная характеристика. Для «Любая» укажите число на выбор.</p>
            <div
                v-for="(mod, index) in modifiers"
                :key="index"
                class="bonus-row"
            >
              <ion-select
                  fill="outline"
                  color="primary"
                  :value="mod.code"
                  @ionChange="(e) => setModifierCode(index, (e as CustomEvent).detail.value ?? mod.code)"
                  interface="popover"
                  class="bonus-select"
              >
                <ion-select-option
                    v-for="opt in abilityOptions"
                    :key="opt.code"
                    :value="opt.code"
                >
                  {{ opt.name }}
                </ion-select-option>
              </ion-select>
              <ion-input
                  type="number"
                  fill="outline"
                  color="primary"
                  :value="mod.value"
                  @ionInput="(e) => { const v = Number((e.target as HTMLIonInputElement).value); if (!Number.isNaN(v)) setModifierValue(index, v); }"
                  placeholder="+0"
                  class="bonus-value-input"
              />
              <ion-input
                  v-if="mod.code === 'ANY'"
                  type="number"
                  fill="outline"
                  color="primary"
                  :value="mod.count"
                  @ionInput="(e) => { const v = Number((e.target as HTMLIonInputElement).value); if (!Number.isNaN(v) && v >= 0) setModifierCount(index, v); }"
                  placeholder="кол."
                  min="1"
                  class="bonus-count-input"
              />
              <button type="button" class="clear-row-btn" aria-label="Удалить" @click="removeBonus(index)">
                <ion-icon :icon="closeCircleOutline"></ion-icon>
              </button>
            </div>
            <ion-button fill="solid" color="primary" class="add-bonus-btn" :disabled="!canAddBonus" @click="addBonus">
              <ion-icon :icon="add"></ion-icon>
            </ion-button>
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Является подвидом</div>
            <p class="helper-text">Выберите родительский вид, если это подвид (например, горный дворф — подвид дворфа).</p>
            <ion-select
                fill="outline"
                color="primary"
                :value="createRaceStore.race.speciesCode ?? ''"
                @ionChange="(e) => { const v = (e as CustomEvent).detail.value; createRaceStore.race.speciesCode = v === '' ? null : v; }"
                interface="popover"
                placeholder="Нет (основной вид)"
                class="input-block"
            >
              <ion-select-option value="">Нет (основной вид)</ion-select-option>
              <ion-select-option
                  v-for="species in speciesList"
                  :key="species.code"
                  :value="species.code"
              >
                {{ species.name }}
              </ion-select-option>
            </ion-select>
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Трейты</div>
            <p class="helper-text">Добавьте особенности вида: имя и описание.</p>
            <div
                v-for="(trait, index) in traits"
                :key="index"
                class="trait-row"
            >
              <ion-input
                  type="text"
                  fill="outline"
                  color="primary"
                  :clear-input="true"
                  v-model="trait.name"
                  placeholder="Название трейта"
                  class="trait-name-input"
              />
              <ion-textarea
                  fill="outline"
                  color="primary"
                  :clear-input="true"
                  v-model="trait.description"
                  placeholder="Описание трейта"
                  class="trait-desc-input"
                  :rows="2"
              />
              <button type="button" class="clear-row-btn" aria-label="Удалить" @click="removeTrait(index)">
                <ion-icon :icon="closeCircleOutline"></ion-icon>
              </button>
            </div>
            <ion-button fill="solid" color="primary" class="add-bonus-btn" @click="addTrait">
              <ion-icon :icon="add"></ion-icon>
            </ion-button>
          </div>
        </div>
      </div>

      <ion-buttons class="buttons-block">
        <ion-button color="primary" fill="solid" shape="round" @click="onCancel" :disabled="isSaving">
          <ion-icon slot="start" :icon="closeCircleOutline"></ion-icon>
          Отменить
        </ion-button>
        <ion-button color="primary" fill="solid" shape="round" :disabled="!createRaceStore.race.name?.trim() || isSaving" @click="onSave">
          <ion-icon slot="start" :icon="saveOutline"></ion-icon>
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

.buttons-block {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px 10px;
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

.section-description {
  overflow: hidden;
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

.bonus-value-input {
  flex: 0 0 72px;
  --background: var(--ion-color-dark-shade);
  border-radius: 8px;
}

.bonus-count-input {
  flex: 0 0 56px;
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

.trait-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 8px;
}

.trait-name-input,
.trait-desc-input {
  --background: var(--ion-color-dark-shade);
  border-radius: 8px;
}
</style>

