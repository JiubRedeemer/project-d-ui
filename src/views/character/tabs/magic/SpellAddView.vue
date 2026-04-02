<script setup lang="ts">
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
  IonToggle,
  IonToolbar,
  onIonViewDidEnter,
  toastController,
} from "@ionic/vue";
import { add } from "ionicons/icons";
import { onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  addSpellToBook,
  createSpell,
  getSpellBookByRoomAndCharacter,
  updateSpell,
} from "@/api/magicApi";
import type { SpellDto } from "@/components/models/response/MagicApi";
import { getClassesForRoom } from "@/api/rulebookApi";
import { FILE_STORAGE_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import { useMagicStore } from "@/stores/MagicStore";
import axios from "axios";

const route = useRoute();
const router = useRouter();
const magicStore = useMagicStore();

const roomId = ref(String(route.params.roomId));
const characterId = ref(String(route.params.characterId));

const spell = ref<Partial<SpellDto>>({
  name: { rus: "", en: "" },
  level: "0",
  spellClass: undefined,
  school: "",
  useTime: "",
  distance: "",
  duration: "",
  components: "",
  materialComponents: "",
  description: "",
  ritual: false,
  customization: false,
  damageType: "",
  healType: "",
  savingThrow: "",
  imgUrl: undefined,
});

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
const invalidFields = ref<string[]>([]);

/** Spell class options from the room's configured classes */
const spellClasses = ref<{ value: string; label: string }[]>([]);
const spellClassesLoading = ref(true);

const levels = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const spellSchools = [
  "некромантия",
  "очарование",
  "прорицание",
  "иллюзия",
  "ограждение",
  "вызов",
  "воплощение",
  "преобразование",
];

const selectedSpellClasses = ref<string[]>([]);

function triggerFileInput() {
  fileInput.value?.click();
}

async function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  if (file && allowedFormats.includes(file.type)) {
    const reader = new FileReader();
    reader.onload = () => {
      previewImage.value = reader.result as string;
    };
    reader.readAsDataURL(file);
    spell.value.imgUrl = await uploadToStorage(file);
  } else {
    alert(
      "Формат файла не поддерживается. Разрешены: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG."
    );
  }
}

async function uploadToStorage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userFilename", `spell-${Date.now()}`);
  const res = await axios.put(
    `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
}

function validate(): boolean {
  invalidFields.value = [];
  const nameRus = (spell.value.name as Record<string, string>)?.rus?.trim();
  const nameEn = (spell.value.name as Record<string, string>)?.en?.trim();
  if (!nameRus) {
    invalidFields.value.push("nameRus");
  }
  if (!nameEn) {
    invalidFields.value.push("nameEn");
  }
  if (!spell.value.level) {
    invalidFields.value.push("level");
  }
  if (!spell.value.school?.trim()) {
    invalidFields.value.push("school");
  }
  return invalidFields.value.length === 0;
}

async function saveSpell() {
  if (!validate()) {
    const toast = await toastController.create({
      message: "Заполните обязательные поля (название, англ. название, уровень, школа)",
      duration: 2000,
      position: "top",
    });
    await toast.present();
    return;
  }

  try {
    const spellClassStr =
      selectedSpellClasses.value.length > 0
        ? selectedSpellClasses.value.join(", ")
        : undefined;

    const body: SpellDto = {
      name: spell.value.name,
      level: spell.value.level,
      spellClass: spellClassStr,
      characterId: characterId.value,
      school: spell.value.school || undefined,
      useTime: spell.value.useTime || undefined,
      distance: spell.value.distance || undefined,
      duration: spell.value.duration || undefined,
      components: spell.value.components || undefined,
      materialComponents: spell.value.materialComponents?.trim() || undefined,
      description: spell.value.description || undefined,
      ritual: spell.value.ritual,
      customization: spell.value.customization,
      damageType: spell.value.damageType || undefined,
      healType: spell.value.healType || undefined,
      savingThrow: spell.value.savingThrow || undefined,
      imgUrl: spell.value.imgUrl,
    };

    const editing = magicStore.editingSpell;
    const isOwner = editing?.id && editing?.createdBy === characterId.value;

    let result: SpellDto;
    if (isOwner) {
      result = await updateSpell(editing.id!, body);
      await magicStore.updateSpellBookInStore(roomId.value, characterId.value);
    } else {
      result = await createSpell(body);
      if (result.id && magicStore.spellBook?.id) {
        const updated = await addSpellToBook(
          magicStore.spellBook.id,
          result.id
        );
        magicStore.setSpellBook(updated);
      }
    }

    magicStore.setEditingSpell(null);

    const toast = await toastController.create({
      message: isOwner ? "Заклинание обновлено" : "Заклинание создано",
      duration: 1000,
      position: "top",
    });
    await toast.present();

    router.back();
  } catch (e) {
    console.error("Failed to save spell:", e);
    const toast = await toastController.create({
      message: "Ошибка при сохранении заклинания",
      duration: 2000,
      position: "top",
      color: "danger",
    });
    await toast.present();
  }
}

function loadEditingSpell(s: SpellDto) {
  const name = (s.name as Record<string, string>) ?? {};
  spell.value = {
    ...spell.value,
    name: { rus: name.rus ?? "", en: name.en ?? "" },
    level: s.level ?? "0",
    school: s.school ?? "",
    useTime: s.useTime ?? "",
    distance: s.distance ?? "",
    duration: s.duration ?? "",
    components: s.components ?? "",
    materialComponents: s.materialComponents ?? "",
    description: s.description ?? "",
    ritual: s.ritual ?? false,
    customization: s.customization ?? false,
    damageType: s.damageType ?? "",
    healType: s.healType ?? "",
    savingThrow: s.savingThrow ?? "",
    imgUrl: s.imgUrl,
  };
  selectedSpellClasses.value = s.spellClass
    ? s.spellClass.split(",").map((x) => x.trim()).filter(Boolean)
    : [];
  if (s.imgUrl) {
    previewImage.value = `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${s.imgUrl}`;
  }
}

async function loadRoomSpellClasses() {
  spellClassesLoading.value = true;
  try {
    const classes = await getClassesForRoom(roomId.value, undefined);
    const options = classes.map((c) => ({
      value: c.code,
      label: c.name?.trim() || c.code,
    }));
    const editing = magicStore.editingSpell;
    if (editing?.spellClass) {
      const existingCodes = new Set(options.map((o) => o.value));
      const spellCodes = editing.spellClass.split(",").map((x) => x.trim()).filter(Boolean);
      for (const code of spellCodes) {
        if (!existingCodes.has(code)) {
          existingCodes.add(code);
          options.push({ value: code, label: code });
        }
      }
    }
    spellClasses.value = options;
  } catch {
    spellClasses.value = [];
  } finally {
    spellClassesLoading.value = false;
  }
}

onIonViewDidEnter(async () => {
  if (!magicStore.spellBook?.id) {
    try {
      const book = await getSpellBookByRoomAndCharacter(
        roomId.value,
        characterId.value
      );
      magicStore.setSpellBook(book);
    } catch {
      magicStore.setSpellBook(null);
    }
  }
  await loadRoomSpellClasses();
  const editing = magicStore.editingSpell;
  if (editing) {
    loadEditingSpell(editing);
  }
});

onUnmounted(() => {
  magicStore.setEditingSpell(null);
});
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/rooms/${roomId}/characters/${characterId}/magic/search`"/>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding" color="dark">
      <div class="container">
        <div class="header">
          <div class="avatar" @click="triggerFileInput">
            <img
              v-if="previewImage"
              :src="previewImage"
              class="avatar-img"
              alt="Spell"
            />
            <img
              v-else-if="spell.imgUrl"
              :src="`${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${spell.imgUrl}`"
              class="avatar-img"
              alt="Spell"
            />
            <div v-else class="avatar-img">
              <ion-icon :icon="add" class="placeholder-icon"/>
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

        <div class="stats-section">
          <div class="stat-section">
            <div class="stat-section-name">Название (рус)</div>
            <ion-input
              fill="outline"
              color="primary"
              v-model="(spell.name as Record<string, string>).rus"
              placeholder="Введите название"
              :class="{ 'invalid-field': invalidFields.includes('nameRus') }"
              @ionInput="invalidFields = invalidFields.filter((f) => f !== 'nameRus')"
            />
          </div>
          <div class="stat-section">
            <div class="stat-section-name">Название (англ)</div>
            <ion-input
              fill="outline"
              color="primary"
              v-model="(spell.name as Record<string, string>).en"
              placeholder="Enter name"
              :class="{ 'invalid-field': invalidFields.includes('nameEn') }"
              @ionInput="invalidFields = invalidFields.filter((f) => f !== 'nameEn')"
            />
          </div>
          <div class="stat-section">
            <div class="stat-section-name">Уровень</div>
            <ion-select
              fill="outline"
              color="primary"
              v-model="spell.level"
              placeholder="Выберите уровень"
              interface="popover"
              :class="{ 'invalid-field': invalidFields.includes('level') }"
              @ionChange="invalidFields = invalidFields.filter((f) => f !== 'level')"
            >
              <ion-select-option v-for="l in levels" :key="l" :value="l">
                {{ l === "0" ? "Заговор" : l + " уровень" }}
              </ion-select-option>
            </ion-select>
          </div>
          <div class="stat-section">
            <div class="stat-section-name">Класс заклинаний</div>
            <ion-select
              fill="outline"
              color="primary"
              interface="popover"
              v-model="selectedSpellClasses"
              :placeholder="spellClassesLoading ? 'Загрузка классов комнаты...' : (spellClasses.length ? 'Выберите классы (можно несколько или ни одного)' : 'В комнате нет классов')"
              multiple
              :disabled="spellClassesLoading"
            >
              <ion-select-option
                v-for="c in spellClasses"
                :key="c.value"
                :value="c.value"
              >
                {{ c.label }}
              </ion-select-option>
            </ion-select>
          </div>
          <div class="stat-section">
            <div class="stat-section-name">Школа магии</div>
            <ion-select
              fill="outline"
              color="primary"
              v-model="spell.school"
              interface="popover"
              placeholder="Выберите школу"
              :class="{ 'invalid-field': invalidFields.includes('school') }"
              @ionChange="invalidFields = invalidFields.filter((f) => f !== 'school')"
            >
              <ion-select-option
                v-for="school in spellSchools"
                :key="school"
                :value="school"
              >
                {{ school }}
              </ion-select-option>
            </ion-select>
          </div>
          <div class="stat-section">
            <div class="stat-section-name">Время каста</div>
            <ion-input
              fill="outline"
              color="primary"
              v-model="spell.useTime"
              placeholder="Напр. 1 действие"
            />
          </div>
          <div class="stat-section">
            <div class="stat-section-name">Дистанция</div>
            <ion-input
              fill="outline"
              color="primary"
              v-model="spell.distance"
              placeholder="Напр. 60 футов"
            />
          </div>
          <div class="stat-section">
            <div class="stat-section-name">Длительность</div>
            <ion-input
              fill="outline"
              color="primary"
              v-model="spell.duration"
              placeholder="Напр. мгновенная"
            />
          </div>
          <div class="stat-section">
            <div class="stat-section-name">Компоненты</div>
            <ion-input
              fill="outline"
              color="primary"
              v-model="spell.components"
              placeholder="Напр. V, S, M"
            />
          </div>
          <div class="stat-section">
            <div class="stat-section-name">Материальные компоненты</div>
            <ion-input
                fill="outline"
                color="primary"
                v-model="spell.materialComponents"
                placeholder="Напр. 1 алмаз"
            />
          </div>
          <div class="stat-section toggle-row">
            <div class="stat-section-name">Ритуал</div>
            <ion-toggle v-model="spell.ritual"/>
          </div>
          <div class="stat-section toggle-row">
            <div class="stat-section-name">Требует настройки</div>
            <ion-toggle v-model="spell.customization"/>
          </div>
          <div class="stat-section">
            <div class="stat-section-name">Описание</div>
            <ion-textarea
              fill="outline"
              color="primary"
              v-model="spell.description"
              placeholder="Описание заклинания"
              rows="6"
            />
          </div>
        </div>

        <div class="footer">
          <ion-button
            expand="block"
            shape="round"
            color="primary"
            @click="saveSpell"
          >
            Сохранить
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  border: 2px solid var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-icon {
  font-size: 32px;
  color: var(--ion-color-medium);
}

.stats-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-section-name {
  font-size: 14px;
  color: var(--ion-color-light);
  opacity: 0.9;
}

.toggle-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.footer {
  padding: 20px 0;
}

.invalid-field {
  --highlight-color-invalid: var(--ion-color-danger);
}
</style>
