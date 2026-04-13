<script setup lang="ts">
import { computed, ref, watch } from "vue";
import axios from "axios";
import CachedFileImage from "@/components/CachedFileImage.vue";
import { FILE_STORAGE_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type { PetDto, PetProfileUpdateRequest } from "@/api/petsApi.types";

const props = defineProps<{
  pet: PetDto;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const previewImage = ref<string | null>(null);
const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff", "image/svg+xml"];

const form = ref<PetProfileUpdateRequest>({
  name: props.pet.name,
  age: props.pet.age,
  description: props.pet.description,
  avatar: props.pet.avatar,
  armorClass: props.pet.armorClass,
  speed: props.pet.speed,
  size: props.pet.size,
  creatureType: props.pet.creatureType,
  proficiencyBonus: props.pet.proficiencyBonus,
  senses: props.pet.senses,
  languages: props.pet.languages,
  isSummoned: props.pet.isSummoned,
  isActive: props.pet.isActive,
});

watch(
  () => props.pet,
  (pet) => {
    form.value = {
      name: pet.name,
      age: pet.age,
      description: pet.description,
      avatar: pet.avatar,
      armorClass: pet.armorClass,
      speed: pet.speed,
      size: pet.size,
      creatureType: pet.creatureType,
      proficiencyBonus: pet.proficiencyBonus,
      senses: pet.senses,
      languages: pet.languages,
      isSummoned: pet.isSummoned,
      isActive: pet.isActive,
    };
    previewImage.value = null;
  },
  { deep: true }
);

const avatarUrl = computed(() =>
  props.pet.avatar
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.avatar_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${props.pet.avatar}`
    : ""
);

const emit = defineEmits<{
  (e: "save", payload: PetProfileUpdateRequest): void;
}>();

const triggerFileInput = () => fileInput.value?.click();

const uploadToMinio = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userFilename", props.pet.id);
  const res = await axios.put(
    `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.avatar_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
};

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0] || null;
  if (!file || !allowedFormats.includes(file.type)) {
    alert("Формат файла не поддерживается.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    previewImage.value = reader.result as string;
  };
  reader.readAsDataURL(file);
  form.value.avatar = await uploadToMinio(file);
};
</script>

<template>
  <section class="profile-body">
    <div class="header">
      <div class="avatar" @click="triggerFileInput">
        <img v-if="previewImage" :src="previewImage" class="avatar-img" alt="pet avatar" />
        <CachedFileImage v-else-if="pet.avatar" class="avatar-img" :src="avatarUrl" alt="pet avatar" />
        <div v-else class="avatar-img avatar-empty">+</div>
        <input ref="fileInput" type="file" accept="image/*" @change="handleFileUpload" style="display: none" />
      </div>
      <div class="stats">
        <div class="stat">
          <span>Возраст</span>
          <input v-model.number="form.age" type="number" placeholder="0" />
        </div>
        <div class="stat">
          <span>AC</span>
          <input v-model.number="form.armorClass" type="number" placeholder="0" />
        </div>
        <div class="stat">
          <span>Скорость</span>
          <input v-model.number="form.speed" type="number" placeholder="0" />
        </div>
        <div class="stat">
          <span>Проф.</span>
          <input v-model.number="form.proficiencyBonus" type="number" placeholder="0" />
        </div>
      </div>
    </div>

    <h1 class="sectionHeader">Основное</h1>
    <div class="section grid">
      <input v-model="form.name" placeholder="Имя питомца" />
      <input v-model="form.size" placeholder="Размер" />
      <input v-model="form.creatureType" placeholder="Тип существа" />
      <input v-model="form.senses" placeholder="Senses" />
      <input v-model="form.languages" placeholder="Languages" />
    </div>

    <h1 class="sectionHeader">Описание</h1>
    <div class="section">
      <textarea v-model="form.description" placeholder="Описание питомца" />
    </div>

    <h1 class="sectionHeader">Состояние</h1>
    <div class="section checks">
      <label><input v-model="form.isSummoned" type="checkbox" /> Призванный</label>
      <label><input v-model="form.isActive" type="checkbox" /> Активный</label>
    </div>

    <button class="save-btn" type="button" @click="emit('save', form)">Сохранить профиль</button>
  </section>
</template>

<style scoped>
.profile-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.header {
  display: flex;
  gap: 12px;
  align-items: center;
}
.avatar { width: 120px; height: 120px; cursor: pointer; flex-shrink: 0; }
.avatar-img { width: 120px; height: 120px; border-radius: 20px; object-fit: cover; display: flex; align-items: center; justify-content: center; background: var(--ion-color-dark); border: 1px solid rgba(var(--ion-color-light-rgb), 0.12); }
.avatar-empty { font-size: 40px; color: var(--ion-color-light); }
.stats {
  flex: 1;
  background-color: var(--ion-color-medium);
  border-radius: 20px;
  padding: 8px;
  display: grid;
  gap: 8px;
}
.stat {
  display: grid;
  grid-template-columns: 1fr 84px;
  align-items: center;
  gap: 8px;
  background: var(--ion-color-medium-tint);
  border-radius: 14px;
  padding: 6px 8px;
  font-size: 13px;
}
.sectionHeader {
  color: var(--ion-color-light);
  font-size: 22px;
  font-weight: normal;
  margin: 8px 0 4px;
}
.section {
  background-color: var(--ion-color-medium);
  border-radius: 15px;
  padding: 10px;
}
.grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
.checks { display: flex; gap: 12px; }
input, textarea { background: var(--ion-color-dark); color: var(--ion-color-light); border: 1px solid rgba(var(--ion-color-primary-rgb), 0.55); border-radius: 10px; padding: 10px; min-height: 40px; width: 100%; }
textarea { min-height: 96px; resize: vertical; }
.save-btn { margin-top: 10px; border: none; border-radius: 12px; background: var(--ion-color-primary); color: var(--ion-color-primary-contrast); padding: 10px 12px; font-weight: 600; min-height: 42px; transition: transform 0.12s ease; }
.save-btn:active { transform: scale(0.99); }
label { font-size: 14px; display: inline-flex; gap: 6px; align-items: center; }
label input { min-height: auto; }
@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 520px) {
  .header {
    flex-direction: column;
    align-items: stretch;
  }
  .avatar {
    width: 100%;
    height: auto;
  }
  .avatar-img {
    width: 100%;
    height: 180px;
  }
}
</style>
