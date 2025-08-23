<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";
import axios from "axios";
import { FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import { TEXTS } from "@/config/localisations";
import { marked } from "marked";
import { add, saveOutline } from "ionicons/icons";
import { IonButton, IonButtons, IonIcon } from "@ionic/vue";
import { useCharacterStore } from "@/stores/CharacterStore";
import {useInventoryStore} from "@/stores/InventoryStore";

const fileInput = ref<HTMLInputElement | null>(null);

const route = useRoute();
const editedValues = ref<Record<string, string>>({});
const isBlockExpanded = ref<string | null>(null);
const inputSectionText = ref<string | null>(null);
const avatarImage = ref<File | null>(null);
const previewImage = ref<string | null>(null);
const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff", "image/svg+xml"];
const filePath = ref<string>("");
const characterStore = useCharacterStore()
const inventoryStore = useInventoryStore()

const startEditing = (field: string) => {
  editedValues.value[field] = characterStore.character.characterBio[field];
};

const updateFieldValue = (field: string, text: string) => {
  editedValues.value[field] = text;
};

// Функция для конвертации текста в HTML
const renderMarkdown = (text: string | undefined): string => {
  return text ? marked(text) : "";
};

const expandBlock = (name: string) => {
  isBlockExpanded.value = name;
  inputSectionText.value = characterStore.character.characterBio[name];
};

const saveSectionText = async (name: string) => {
  try {
    const roomId = route.params.roomId as string;
    const characterId = route.params.characterId as string;

    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterId}${GATEWAY_INTEGRATION_ROUTES.bio}/${name}`,
        { value: inputSectionText.value },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );

    await characterStore.updateCharacterInStoreById(roomId, characterId);
    await inventoryStore.updateInventoryInStoreById(route.params.roomId, route.params.characterId)
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
  inputSectionText.value = null; // Закрываем все секции
  isBlockExpanded.value = null; // Закрываем все секции
};

const saveField = async (field: string, text: string) => {
  const newValue = text;
  if (newValue === characterStore.character.characterBio[field]) return;

  try {
    const roomId = route.params.roomId as string;
    const characterId = route.params.characterId as string;

    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterId}${GATEWAY_INTEGRATION_ROUTES.bio}/${field}`,
        { value: newValue },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
    await characterStore.updateCharacterInStoreById(roomId, characterId);
    await inventoryStore.updateInventoryInStoreById(route.params.roomId, route.params.characterId)
  } catch (error) {
    console.error("Ошибка при сохранении данных:", error);
  }
};

const updateInputSectionText = (event: Event) => {
  const target = event.target as HTMLElement;
  inputSectionText.value = target.innerText;
};

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

    filePath.value = await uploadToMinio(avatarImage.value);
    await saveField("avatar", filePath.value);
  } else {
    alert("Формат файла не поддерживается. Разрешены: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG.");
  }
};

const uploadToMinio = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userFilename", characterStore.character.id);

  const res = await axios.put(
      `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.avatar_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
  );
  return res.data;
};
</script>

<template>
  <div class="container">
    <div class="header" v-show="isBlockExpanded == null">
      <div class="avatar" @click="triggerFileInput">
        <img v-if="previewImage" :src="previewImage" class="avatar-img" alt="Room Image"/>
        <img v-else-if="characterStore.character.characterBio.avatar" :src="FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                 FILE_STORAGE_INTEGRATION_ROUTES.api +
                 FILE_STORAGE_INTEGRATION_ROUTES.avatar_images_bucket +
                 FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + characterStore.character.characterBio.avatar" class="avatar-img" alt="avatar"/>
        <div v-else class="avatar-img">
          <ion-icon :icon="add" class="placeholder-icon"></ion-icon>
        </div>
        <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" style="display: none;"/>
      </div>
      <div class="stats">
        <div class="stat" v-for="field in ['age', 'height', 'weight']" :key="field">
          {{ TEXTS[field].rus }} :
          <span
              class="stat-value"
              contenteditable="true"
              @focus="startEditing(field)"
              @blur="saveField(field, $event.target?.innerText)"
              @input="updateFieldValue(field, $event.target?.innerText)"
              @keydown.enter.prevent="saveField(field, $event.target?.innerText)"
          >{{ characterStore.character.characterBio[field] }}</span>
        </div>
      </div>
    </div>

    <div
        v-for="section in ['history', 'ideals', 'personality', 'attachments', 'weaknesses', 'relationships']"
        :key="section"
        :class="{ expand: isBlockExpanded === section }"
        class="section"
        v-show="isBlockExpanded === null || isBlockExpanded === section"
        @click.stop="expandBlock(section)"
    >
      <h1 class="sectionHeader">{{ TEXTS[section].rus }}:</h1>
      <p
          contenteditable="true"
          v-html="isBlockExpanded === section ? characterStore.character.characterBio[section] : renderMarkdown(characterStore.character.characterBio[section])"
          @input="updateInputSectionText($event)"
      ></p>
      <ion-buttons slot="end" class="sectionButtons">
        <ion-button @click.stop="saveSectionText(section)">
          <ion-icon slot="icon-only" :icon="saveOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </div>
  </div>
</template>

<style scoped>
.container {
  background: transparent;
}

.section {
  margin-top: 20px;
  background-color: var(--ion-color-medium);
  border-radius: 15px;
  padding: 10px;
  overflow: hidden;
  max-height: 40vh;
  transition: max-height 4s ease;

}

.section.expand {
  height: fit-content;
  max-height: 10000px;
  transition: max-height 4s ease;

}


.section h1 {
  font-size: 16pt; /* Размер для h1 */
  font-weight: bold;
}

.section h2 {
  font-size: 14pt; /* Размер для h2 */
  font-weight: bold;
}

.section h3 {
  font-size: 12pt; /* Размер для h3 */
  font-weight: bold;
}

.section h4 {
  font-size: 10pt;
}

.section h5 {
  font-size: 8pt;
}

.section h6 {
  font-size: 6pt;
}

.sectionHeader {
  color: var(--ion-color-primary);
  font-size: 16pt;
}

.header {
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: center;
  justify-content: start;
  gap: 20px;
}

.avatar-img {
  width: 180px;
  height: 180px;
  border-radius: 25px;
  align-content: center;
  justify-content: center;
  display: flex;
}

.stats {
  border-radius: 25px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  background-color: var(--ion-color-medium);
  width: 180px;
  height: 180px;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--ion-color-secondary-opacity-40);
  margin-bottom: 3%;
  height: 23%;
  border-radius: 15px;
  padding-left: 5%;
  padding-right: 5%;
  margin-left: 5%;
  margin-right: 5%;
  font-weight: bold;
}

.stat-value {
  display: flex;
  background-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border-radius: 50%;
  height: 30px;
  width: 30px;
  align-items: center;
  justify-content: center;
  font-size: 10pt;
}

.placeholder-icon {
  align-self: center;
  justify-self: center;
  font-size: 48px;
  color: white;
}

.section {
  margin-top: 20px;
  background-color: var(--ion-color-medium);
  border-radius: 15px;
  padding: 10px;
  overflow: hidden;
  height: 40vh;
}

.sectionButtons {
  width: 100%;
  display: flex;
  justify-content: end;
}


p[contenteditable="true"] {
  outline: none;
  cursor: text;
}

p[contenteditable="true"]:focus {
  border-color: var(--ion-color-primary);
}

</style>
