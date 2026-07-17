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
import {onBeforeMount, ref, computed} from "vue";
import {useRouter} from "vue-router";
import {useCreateClassStore} from "@/stores/createEntity/CreateClassStore";
import {useRoomCreationStore} from "@/stores/RoomCreationStore";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import axios from "axios";
import {
  AbilityDto,
  ClazzDto,
  ClazzStatsDto,
} from "@/api/rulebookApi.types";
import {getAbilitiesForRoom, getRootClassesForRoom} from "@/api/rulebookApi";
import {
  HP_HIT_DIE_OPTIONS,
  formatClassHpDice,
  normalizeClassHpDice,
  parseClassHpDice,
} from "@/utils/classHpDice";

const SKILLS_LIST = [
  { name: "Атлетика", code: "ATHL" },
  { name: "Акробатика", code: "ACRO" },
  { name: "Ловкость рук", code: "SLEI" },
  { name: "Скрытность", code: "STEA" },
  { name: "История", code: "HIST" },
  { name: "Магия", code: "ARCA" },
  { name: "Природа", code: "NATR" },
  { name: "Расследование", code: "INVE" },
  { name: "Религия", code: "RELI" },
  { name: "Восприятие", code: "PERC" },
  { name: "Выживание", code: "SURV" },
  { name: "Медицина", code: "MEDI" },
  { name: "Проницательность", code: "INSI" },
  { name: "Уход за животными", code: "ANIM" },
  { name: "Выступление", code: "PERF" },
  { name: "Запугивание", code: "INTI" },
  { name: "Обман", code: "DECE" },
  { name: "Убеждение", code: "PERS" },
];

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

const fileInput = ref<HTMLInputElement | null>(null);
const previewImage = ref<string | null>(null);
const createClassStore = useCreateClassStore();
const roomCreationStore = useRoomCreationStore();
const router = useRouter();
const abilities = ref<AbilityDto[]>([]);
const rootClassesList = ref<ClazzDto[]>([]);
const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff", "image/svg+xml"];

const abilityOptions = computed(() => {
  const fromApi = abilities.value.map((a) => ({ code: a.code ?? "", name: a.name ?? a.code }));
  const standard = [
    { code: "STR", name: "Сила" },
    { code: "DEX", name: "Ловкость" },
    { code: "CON", name: "Телосложение" },
    { code: "INT", name: "Интеллект" },
    { code: "WIS", name: "Мудрость" },
    { code: "CHA", name: "Харизма" },
  ];
  return fromApi.length ? fromApi : standard;
});

const hpDiceParts = computed(() => parseClassHpDice(createClassStore.clazz.stats?.hpDice));

function setHpDiceDie(die: string) {
  if (!createClassStore.clazz.stats) return;
  createClassStore.clazz.stats.hpDice = formatClassHpDice(die, hpDiceParts.value.ability);
}

function setHpDiceAbility(ability: string) {
  if (!createClassStore.clazz.stats) return;
  createClassStore.clazz.stats.hpDice = formatClassHpDice(hpDiceParts.value.die, ability);
}

const savingThrows = computed(() => createClassStore.clazz.stats?.savingThrowsAbilities ?? []);

function savingThrowOptionsForIndex(index: number) {
  const list = savingThrows.value;
  const usedCodes = new Set(list.map((st, i) => (i !== index ? st.code : null)).filter(Boolean));
  const currentCode = list[index]?.code;
  return abilityOptions.value.filter(
    (opt) => opt.code === currentCode || !usedCodes.has(opt.code)
  );
}

const skillPool = computed(() => {
  const list = createClassStore.clazz.stats?.availableSkills;
  if (!list?.length) return [];
  return list[0].of ?? [];
});

const skillChooseCount = computed({
  get() {
    const list = createClassStore.clazz.stats?.availableSkills;
    return list?.[0]?.count ?? 2;
  },
  set(v: number) {
    const list = createClassStore.clazz.stats?.availableSkills;
    if (list?.[0]) list[0].count = v;
  },
});

const classImageUrl = computed(() => {
  const url = createClassStore.clazz.imgUrl;
  if (!url) return "";
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.classes_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${url}`;
});

function addSavingThrow() {
  if (!createClassStore.clazz.stats) return;
  const list = [...(createClassStore.clazz.stats.savingThrowsAbilities ?? [])];
  const used = new Set(list.map((st) => st.code));
  const firstUnused = abilityOptions.value.find((opt) => !used.has(opt.code));
  list.push(firstUnused ? { code: firstUnused.code, name: firstUnused.name } : { code: "STR", name: "Сила" });
  createClassStore.clazz.stats.savingThrowsAbilities = list;
}

function removeSavingThrow(index: number) {
  if (!createClassStore.clazz.stats?.savingThrowsAbilities) return;
  const list = [...createClassStore.clazz.stats.savingThrowsAbilities];
  list.splice(index, 1);
  createClassStore.clazz.stats.savingThrowsAbilities = list;
}

function setSavingThrowCode(index: number, code: string) {
  const list = createClassStore.clazz.stats?.savingThrowsAbilities;
  const ab = abilityOptions.value.find((o) => o.code === code);
  if (list && list[index] && ab) {
    list[index].code = code;
    list[index].name = ab.name;
  }
}

function ensureSkillBlock() {
  const stats = createClassStore.clazz.stats;
  if (!stats) return;
  if (!stats.availableSkills?.length) {
    stats.availableSkills = [{ type: "ABILITY", count: 2, of: [] }];
  }
}

function addSkillToPool() {
  ensureSkillBlock();
  const of = createClassStore.clazz.stats!.availableSkills![0].of;
  createClassStore.clazz.stats!.availableSkills![0].of = [...(of ?? []), null];
}

function removeSkillFromPool(index: number) {
  const of = createClassStore.clazz.stats?.availableSkills?.[0]?.of;
  if (!of) return;
  const next = [...of];
  next.splice(index, 1);
  createClassStore.clazz.stats!.availableSkills![0].of = next;
}

function setSkillInPool(index: number, code: string | null) {
  const of = createClassStore.clazz.stats?.availableSkills?.[0]?.of;
  if (of && of[index] !== undefined) of[index] = code || null;
}

function skillOptionsForIndex(index: number) {
  const pool = skillPool.value;
  const usedCodes = new Set(
    pool.map((c, i) => (i !== index && c ? c : null)).filter((c): c is string => !!c)
  );
  const currentCode = pool[index] ?? null;
  return SKILLS_LIST.filter(
    (s) => s.code === currentCode || !usedCodes.has(s.code)
  );
}

function setSkillChooseCount(v: number) {
  ensureSkillBlock();
  if (createClassStore.clazz.stats?.availableSkills?.[0])
    createClassStore.clazz.stats.availableSkills[0].count = v;
}

const triggerFileInput = () => fileInput.value?.click();

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0] || null;
  if (file && allowedFormats.includes(file.type)) {
    const reader = new FileReader();
    reader.onload = () => { previewImage.value = reader.result as string; };
    reader.readAsDataURL(file);
    const path = await uploadClassImage(file);
    createClassStore.clazz.imgUrl = path;
  } else {
    alert("Формат файла не поддерживается. Разрешены: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG.");
  }
};

async function uploadClassImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userFilename", createClassStore.clazz.id || createClassStore.clazz.code || "class");
  const res = await axios.put(
    `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.classes_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
}

function slugCode(name: string): string {
  const base = name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || "class";
  const existing = new Set(roomCreationStore.classes.map((c) => c.code));
  if (!existing.has(base)) return base;
  let n = 1;
  while (existing.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

function onCancel() {
  router.back();
}

function onSave() {
  const c = createClassStore.clazz;
  if (!c.name?.trim()) return;
  const code = c.code?.trim() || slugCode(c.name);
  const clazzDto: ClazzDto = {
    id: c.id || "",
    roomId: c.roomId || "",
    name: c.name.trim(),
    description: c.description?.trim() || null,
    code,
    groupCode: c.groupCode || null,
    imgUrl: c.imgUrl || null,
    stats: c.stats!,
  };
  roomCreationStore.classes = [...roomCreationStore.classes, clazzDto];
  router.back();
}

onBeforeMount(async () => {
  if (!createClassStore.clazz.stats) {
    createClassStore.clazz.stats = {
      id: "",
      hpDice: "8+CON",
      savingThrowsAbilities: [],
      availableSkills: [],
    } as ClazzStatsDto;
  }
  createClassStore.clazz.stats.hpDice = normalizeClassHpDice(createClassStore.clazz.stats.hpDice);
  if (!createClassStore.clazz.stats.savingThrowsAbilities) {
    createClassStore.clazz.stats.savingThrowsAbilities = [];
  }
  if (!createClassStore.clazz.stats.availableSkills?.length) {
    createClassStore.clazz.stats.availableSkills = [{ type: "ABILITY", count: 2, of: [] }];
  }
  const roomId = createClassStore.roomId ?? roomCreationStore.roomInfoCreatedId;
  if (roomId) {
    try {
      abilities.value = await getAbilitiesForRoom(roomId);
    } catch {
      abilities.value = [];
    }
  }
  try {
    rootClassesList.value = await getRootClassesForRoom(ZERO_UUID, undefined);
  } catch {
    rootClassesList.value = [];
  }
});
</script>

<template>
  <ion-page>
    <RoomsHeader header-name="Создание класса" />
    <ion-content color="dark">
      <div class="container">
        <div class="header">
          <div class="avatar-wrap">
            <div class="avatar" @click="triggerFileInput">
              <img v-if="previewImage" :src="previewImage" class="avatar-img" alt="Class" />
              <img v-else-if="createClassStore.clazz.imgUrl" :src="classImageUrl" class="avatar-img" alt="Class" />
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
            <div class="stat-section-name">Название класса</div>
            <p class="helper-text">Краткое название, например: Воин, Плут.</p>
            <ion-input
              type="text"
              fill="outline"
              color="primary"
              :clear-input="true"
              v-model="createClassStore.clazz.name"
              label-placement="floating"
              class="input-block"
            />
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Описание</div>
            <p class="helper-text">Подробное описание класса для игроков.</p>
            <ion-textarea
              fill="outline"
              color="primary"
              :clear-input="true"
              v-model="createClassStore.clazz.description"
              class="input-block"
              :rows="5"
            />
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Кость хитов</div>
            <p class="helper-text">
              Сохраняется как «кость + код характеристики», например 8+CON (хиты за уровень: кость + модификатор).
            </p>
            <div class="hp-dice-row">
              <ion-select
                fill="outline"
                color="primary"
                :value="hpDiceParts.die"
                interface="popover"
                class="hp-dice-select"
                placeholder="Кость"
                @ionChange="(e) => setHpDiceDie((e as CustomEvent).detail.value ?? hpDiceParts.die)"
              >
                <ion-select-option v-for="d in HP_HIT_DIE_OPTIONS" :key="d.value" :value="d.value">
                  {{ d.label }}
                </ion-select-option>
              </ion-select>
              <span class="hp-dice-plus" aria-hidden="true">+</span>
              <ion-select
                fill="outline"
                color="primary"
                :value="hpDiceParts.ability"
                interface="popover"
                class="hp-dice-select hp-dice-select--ability"
                placeholder="Характеристика"
                @ionChange="(e) => setHpDiceAbility((e as CustomEvent).detail.value ?? hpDiceParts.ability)"
              >
                <ion-select-option
                  v-for="opt in abilityOptions"
                  :key="opt.code"
                  :value="opt.code"
                >
                  {{ opt.name }} ({{ opt.code }})
                </ion-select-option>
              </ion-select>
            </div>
            <p class="helper-text hp-dice-preview">Итог: <code>{{ createClassStore.clazz.stats?.hpDice }}</code></p>
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Владение спасбросками</div>
            <p class="helper-text">Характеристики, по которым класс получает владение спасбросками (обычно две).</p>
            <div
              v-for="(st, index) in savingThrows"
              :key="index"
              class="bonus-row"
            >
              <ion-select
                fill="outline"
                color="primary"
                :value="st.code"
                @ionChange="(e) => setSavingThrowCode(index, (e as CustomEvent).detail.value ?? st.code)"
                interface="popover"
                class="bonus-select"
              >
                <ion-select-option
                  v-for="opt in savingThrowOptionsForIndex(index)"
                  :key="opt.code"
                  :value="opt.code"
                >
                  {{ opt.name }}
                </ion-select-option>
              </ion-select>
              <button type="button" class="clear-row-btn" aria-label="Удалить" @click="removeSavingThrow(index)">
                <ion-icon :icon="closeCircleOutline" />
              </button>
            </div>
            <ion-button fill="solid" color="primary" class="add-bonus-btn" @click="addSavingThrow">
              <ion-icon :icon="add" />
            </ion-button>
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Доступные навыки</div>
            <p class="helper-text">Навыки, из которых игрок может выбрать (например: Атлетика, Медицина).</p>
            <div
              v-for="(code, index) in skillPool"
              :key="index"
              class="bonus-row"
            >
              <ion-select
                fill="outline"
                color="primary"
                :value="code ?? ''"
                @ionChange="(e) => setSkillInPool(index, (e as CustomEvent).detail.value || null)"
                interface="popover"
                placeholder="Выберите навык"
                class="bonus-select skill-select-full"
              >
                <ion-select-option value="">—</ion-select-option>
                <ion-select-option
                  v-for="s in skillOptionsForIndex(index)"
                  :key="s.code"
                  :value="s.code"
                >
                  {{ s.name }}
                </ion-select-option>
              </ion-select>
              <button type="button" class="clear-row-btn" aria-label="Удалить" @click="removeSkillFromPool(index)">
                <ion-icon :icon="closeCircleOutline" />
              </button>
            </div>
            <ion-button fill="solid" color="primary" class="add-bonus-btn" @click="addSkillToPool">
              <ion-icon :icon="add" />
            </ion-button>
            <div class="stat-section skill-count-block">
              <div class="stat-section-name">Количество навыков к выбору:</div>
              <ion-input
                type="number"
                fill="outline"
                color="primary"
                :clear-input="true"
                :value="skillChooseCount"
                @ionInput="(e) => { const v = Number((e.target as HTMLIonInputElement).value); if (!Number.isNaN(v) && v >= 0) setSkillChooseCount(v); }"
                min="0"
                class="input-block skill-count-input"
              />
            </div>
          </div>

          <div class="stat-section">
            <div class="stat-section-name">Является подклассом</div>
            <p class="helper-text">Выберите родительский класс, если это подкласс (например, следопыт — подкласс воина).</p>
            <ion-select
              fill="outline"
              color="primary"
              :value="createClassStore.clazz.groupCode ?? ''"
              @ionChange="(e) => { const v = (e as CustomEvent).detail.value; createClassStore.clazz.groupCode = v === '' ? null : v; }"
              interface="popover"
              placeholder="Нет (основной класс)"
              class="input-block"
            >
              <ion-select-option value="">Нет (основной класс)</ion-select-option>
              <ion-select-option
                v-for="root in rootClassesList"
                :key="root.code"
                :value="root.code"
              >
                {{ root.name }}
              </ion-select-option>
            </ion-select>
          </div>
        </div>
      </div>
      <ion-buttons class="buttons-block">
        <ion-button color="primary" fill="solid" shape="round" @click="onCancel">
          <ion-icon slot="start" :icon="closeCircleOutline" />
          Отменить
        </ion-button>
        <ion-button color="primary" fill="solid" shape="round" :disabled="!createClassStore.clazz.name?.trim()" @click="onSave">
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
  color: var(--ion-color-secondary);
  margin: 0 0 6px 0;
  line-height: 1.3;
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

.helper-text--block {
  margin: 0 10px 8px;
  text-align: center;
}

.body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
}

.skill-select-full {
  flex: 1;
  min-width: 0;
}

.skill-count-block {
  margin-top: 16px;
}

.skill-count-input {
  max-width: 120px;
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

.bonus-value-input {
  flex: 0 0 72px;
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

.hp-dice-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.hp-dice-select {
  flex: 1;
  min-width: 0;
  --background: var(--ion-color-dark-shade);
  border-radius: 8px;
}

.hp-dice-select--ability {
  flex: 1.2;
}

.hp-dice-plus {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--ion-color-light);
  padding: 0 2px;
}

.hp-dice-preview {
  margin-top: 8px;
}

.hp-dice-preview code {
  font-size: 13px;
  color: var(--ion-color-secondary-tint);
}

.buttons-block {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px 10px;
}
</style>
