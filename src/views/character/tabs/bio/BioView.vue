<script setup lang="ts">
import {onMounted, ref} from "vue";
import {useRoute} from "vue-router";
import axios from "axios";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {TEXTS} from "@/config/localisations";
import {marked} from "marked";
import {add, saveOutline} from "ionicons/icons";
import {
  IonButton,
  IonButtons,
  IonIcon,
  IonSpinner,
  useIonRouter,
  onIonViewDidEnter,
} from "@ionic/vue";
import {useCharacterStore} from "@/stores/CharacterStore";
import {useInventoryStore} from "@/stores/InventoryStore";
import {useNpcRelationsStore} from "@/stores/NpcRelationsStore";
import type {RelationTypeEnum} from "@/api/npcApi.types";

const fileInput = ref<HTMLInputElement | null>(null);

const route = useRoute();
const ionRouter = useIonRouter();
const editedValues = ref<Record<string, string>>({});
const isBlockExpanded = ref<string | null>(null);
const inputSectionText = ref<string | null>(null);
const avatarImage = ref<File | null>(null);
const previewImage = ref<string | null>(null);
const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff", "image/svg+xml"];
const filePath = ref<string>("");
const characterStore = useCharacterStore()
const inventoryStore = useInventoryStore()
const npcRelationsStore = useNpcRelationsStore()

const NPC_PLACEHOLDER =
    "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";

const relationTabs: Array<{ value: RelationTypeEnum; label: string }> = [
  {value: "FRIEND", label: "Друзья"},
  {value: "ENEMY", label: "Враги"},
  {value: "RULER", label: "Правитель"},
  {value: "PET", label: "Питомец"},
  {value: "OTHER", label: "Другое"},
];

function getNpcImageUrl(imgUrl: string | undefined | null): string {
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
}

async function loadAllRelatedNpcs() {
  const roomId = route.params.roomId as string;
  const characterId = route.params.characterId as string;
  await npcRelationsStore.loadAll(roomId, characterId);
}

function onAddRelation(type: RelationTypeEnum) {
  const roomId = route.params.roomId as string;
  const characterId = route.params.characterId as string;
  ionRouter.push({
    path: `/rooms/${roomId}/npcs/create`,
    query: { characterId, relationType: type },
  });
}

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
  inputSectionText.value = characterStore.character.characterBio[name] ?? "";
};

const saveSectionText = async (name: string) => {
  const originalValue =
      characterStore.character.characterBio[name] ?? "";

  const newValue = inputSectionText.value ?? "";

  // 🔒 If nothing changed — do nothing
  if (newValue.trim() === originalValue.trim()) {
    isBlockExpanded.value = null;
    inputSectionText.value = null;
    return;
  }

  try {
    const roomId = route.params.roomId as string;
    const characterId = route.params.characterId as string;

    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterId}${GATEWAY_INTEGRATION_ROUTES.bio}/${name}`,
        {value: newValue},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );

    await characterStore.updateCharacterInStoreById(roomId, characterId);
    await inventoryStore.updateInventoryInStoreById(roomId, characterId);
  } catch (error) {
    console.error("Ошибка при сохранении данных:", error);
  } finally {
    isBlockExpanded.value = null;
    inputSectionText.value = null;
  }
};


const saveField = async (field: string, text: string) => {
  const newValue = text;
  if (newValue === characterStore.character.characterBio[field]) return;

  try {
    const roomId = route.params.roomId as string;
    const characterId = route.params.characterId as string;

    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterId}${GATEWAY_INTEGRATION_ROUTES.bio}/${field}`,
        {value: newValue},
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

onMounted(loadAllRelatedNpcs);
onIonViewDidEnter(loadAllRelatedNpcs);
</script>

<template>
  <div class="container">
    <div class="header" v-show="isBlockExpanded == null">
      <div class="avatar" @click="triggerFileInput">
        <img v-if="previewImage" :src="previewImage" class="avatar-img" alt="Room Image"/>
        <img v-else-if="characterStore.character.characterBio.avatar" :src="FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                 FILE_STORAGE_INTEGRATION_ROUTES.api +
                 FILE_STORAGE_INTEGRATION_ROUTES.avatar_images_bucket +
                 FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + characterStore.character.characterBio.avatar"
             class="avatar-img" alt="avatar"/>
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
        class="bio-section"
        v-show="isBlockExpanded === null || isBlockExpanded === section"
    >
      <h1 class="sectionHeader">{{ TEXTS[section].rus }}:</h1>
      <div
          :class="{ expand: isBlockExpanded === section }"
          class="section"
          @click.stop="expandBlock(section)"
      >
        <p
            contenteditable="true"
            v-html="isBlockExpanded === section ? characterStore.character.characterBio[section] : renderMarkdown(characterStore.character.characterBio[section])"
            @input="updateInputSectionText($event)"
        ></p>
        <ion-buttons slot="end" class="sectionButtons" v-show="isBlockExpanded === section">
          <ion-button @click.stop="saveSectionText(section)">
            <ion-icon slot="icon-only" :icon="saveOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </div>
    </div>

    <!-- NPC Relations: separate blocks -->
    <template v-if="isBlockExpanded == null">
      <h1 class="sectionHeader">Друзья:</h1>
      <div class="npc-section">
        <div class="npc-relations-loading" v-if="npcRelationsStore.loading">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
          <div class="npc-relations-list" v-else>
          <div class="npc-card" v-for="npc in npcRelationsStore.byType.FRIEND" :key="npc.id">
            <img class="npc-avatar" onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" :src="getNpcImageUrl(npc.imgUrl)" :alt="npc.name" @click.stop="ionRouter.push(`/rooms/${route.params.roomId}/npcs/${npc.id}/full`)"/>
            <div class="npc-name" @click.stop="ionRouter.push(`/rooms/${route.params.roomId}/npcs/${npc.id}/full`)">{{ npc.name }}</div>
          </div>
          <div class="npc-card npc-card-add" @click="onAddRelation('FRIEND')">
            <div class="npc-avatar npc-add-avatar">
              <ion-icon class="npc-add-icon" :icon="add"></ion-icon>
            </div>
            <div class="npc-name">Добавить</div>
          </div>
        </div>
      </div>

      <h1 class="sectionHeader">Враги:</h1>
      <div class="npc-section">
        <div class="npc-relations-loading" v-if="npcRelationsStore.loading">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
        <div class="npc-relations-list" v-else>
          <div class="npc-card" v-for="npc in npcRelationsStore.byType.ENEMY" :key="npc.id">
            <img class="npc-avatar" onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" :src="getNpcImageUrl(npc.imgUrl)" :alt="npc.name" @click.stop="ionRouter.push(`/rooms/${route.params.roomId}/npcs/${npc.id}/full`)"/>
            <div class="npc-name" @click.stop="ionRouter.push(`/rooms/${route.params.roomId}/npcs/${npc.id}/full`)">{{ npc.name }}</div>
          </div>
          <div class="npc-card npc-card-add" @click="onAddRelation('ENEMY')">
            <div class="npc-avatar npc-add-avatar">
              <ion-icon class="npc-add-icon" :icon="add"></ion-icon>
            </div>
            <div class="npc-name">Добавить</div>
          </div>
        </div>
      </div>

      <h1 class="sectionHeader">Правители:</h1>
      <div class="npc-section">
        <div class="npc-relations-loading" v-if="npcRelationsStore.loading">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
        <div class="npc-relations-list" v-else>
          <div class="npc-card" v-for="npc in npcRelationsStore.byType.RULER" :key="npc.id">
            <img class="npc-avatar" onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" :src="getNpcImageUrl(npc.imgUrl)" :alt="npc.name" @click.stop="ionRouter.push(`/rooms/${route.params.roomId}/npcs/${npc.id}/full`)"/>
            <div class="npc-name" @click.stop="ionRouter.push(`/rooms/${route.params.roomId}/npcs/${npc.id}/full`)">{{ npc.name }}</div>
          </div>
          <div class="npc-card npc-card-add" @click="onAddRelation('RULER')">
            <div class="npc-avatar npc-add-avatar">
              <ion-icon class="npc-add-icon" :icon="add"></ion-icon>
            </div>
            <div class="npc-name">Добавить</div>
          </div>
        </div>
      </div>

      <h1 class="sectionHeader">Питомцы:</h1>
      <div class="npc-section">
        <div class="npc-relations-loading" v-if="npcRelationsStore.loading">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
        <div class="npc-relations-list" v-else>
          <div class="npc-card" v-for="npc in npcRelationsStore.byType.PET" :key="npc.id">
            <img class="npc-avatar" onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" :src="getNpcImageUrl(npc.imgUrl)" :alt="npc.name" @click.stop="ionRouter.push(`/rooms/${route.params.roomId}/npcs/${npc.id}/full`)"/>
            <div class="npc-name" @click.stop="ionRouter.push(`/rooms/${route.params.roomId}/npcs/${npc.id}/full`)">{{ npc.name }}</div>
          </div>
          <div class="npc-card npc-card-add" @click="onAddRelation('PET')">
            <div class="npc-avatar npc-add-avatar">
              <ion-icon class="npc-add-icon" :icon="add"></ion-icon>
            </div>
            <div class="npc-name">Добавить</div>
          </div>
        </div>
      </div>

      <h1 class="sectionHeader">Другие связи:</h1>
      <div class="npc-section">
        <div class="npc-relations-loading" v-if="npcRelationsStore.loading">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
        <div class="npc-relations-list" v-else>
          <div class="npc-card" v-for="npc in npcRelationsStore.byType.OTHER" :key="npc.id">
            <img class="npc-avatar" onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" :src="getNpcImageUrl(npc.imgUrl)" :alt="npc.name" @click.stop="ionRouter.push(`/rooms/${route.params.roomId}/npcs/${npc.id}/full`)"/>
            <div class="npc-name" @click.stop="ionRouter.push(`/rooms/${route.params.roomId}/npcs/${npc.id}/full`)">{{ npc.name }}</div>
          </div>
          <div class="npc-card npc-card-add" @click="onAddRelation('OTHER')">
            <div class="npc-avatar npc-add-avatar">
              <ion-icon class="npc-add-icon" :icon="add"></ion-icon>
            </div>
            <div class="npc-name">Добавить</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.container {
  background: transparent;
}

.section {
  background-color: var(--ion-color-medium);
  color: var(--ion-color-light);
  border-radius: 15px;
  padding: 10px;
  overflow: hidden;
  height: fit-content;
  max-height: 200px;
  transition: max-height 4s ease;

}

.section.expand {
  height: fit-content;
  max-height: 10000px;
  transition: max-height 4s ease;

}


.section :deep(p) {
  margin: 0 0 0.5em;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ion-color-light);
  word-break: break-word;
}

.section :deep(p:last-child) {
  margin-bottom: 0;
}

.section :deep(ul),
.section :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.25em;
}

.section :deep(h1) {
  font-size: 1.15em;
}

.section :deep(h2) {
  font-size: 1.05em;
}

.section :deep(h3) {
  font-size: 1em;
}

.sectionHeader {
  color: var(--ion-color-light);
  font-size: 22px;
  font-weight: normal;
  margin-top: 10px;
  margin-bottom: 8px;
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

.sectionButtons {
  width: 100%;
  display: flex;
  justify-content: end;
}

.npc-section {
  background-color: var(--ion-color-medium);
  border-radius: 15px;
}

.npc-relations-list {
  display: flex;
  flex-direction: row;
  gap: 0;
  overflow-x: auto;
  padding: 6px 4px;
}

.npc-card {
  flex: 0 0 auto;
  width: 110px;
  border-radius: 18px;
  padding: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.npc-avatar {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.npc-name {
  width: 100%;
  text-align: center;
  font-size: 11pt;
  line-height: 1.1;
  word-break: break-word;
}

.npc-add-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
}

.npc-add-icon {
  font-size: 44px;
  color: var(--ion-color-primary);
}

.npc-relations-loading {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 18px 0;
}


p[contenteditable="true"] {
  outline: none;
  cursor: text;
}

p[contenteditable="true"]:focus {
  border-color: var(--ion-color-primary);
}

</style>
