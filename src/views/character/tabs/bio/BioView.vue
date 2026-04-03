<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from "vue";
import {useRoute} from "vue-router";
import axios from "axios";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {TEXTS} from "@/config/localisations";
import {marked} from "marked";
import {add, saveOutline, sparkles} from "ionicons/icons";
import {
  IonButton,
  IonButtons,
  IonIcon,
  IonPopover,
  IonSpinner,
  useIonRouter,
  onIonViewDidEnter,
} from "@ionic/vue";
import {useCharacterStore} from "@/stores/CharacterStore";
import {useInventoryStore} from "@/stores/InventoryStore";
import {useNpcRelationsStore} from "@/stores/NpcRelationsStore";
import {deleteCharacterNpcRelationByIdForRoom} from "@/api/npcApi";
import type { NpcWithRelationIdDto, RelationTypeEnum } from "@/api/npcApi.types";
import type {CharacterBio} from "@/components/models/response/Character";
import CachedFileImage from "@/components/CachedFileImage.vue";

type BioStatFieldKey = "age" | "height" | "weight";
type BioSectionKey =
  | "history"
  | "ideals"
  | "personality"
  | "attachments"
  | "weaknesses"
  | "relationships";
type BioEditableKey = BioStatFieldKey | BioSectionKey | "avatar";

const statFields: readonly BioStatFieldKey[] = ["age", "height", "weight"];
const bioSections: readonly BioSectionKey[] = [
  "history",
  "ideals",
  "personality",
  "attachments",
  "weaknesses",
  "relationships",
];

const fileInput = ref<HTMLInputElement | null>(null);

const route = useRoute();
const ionRouter = useIonRouter();
const editedValues = ref<Record<string, string>>({});
const isBlockExpanded = ref<BioSectionKey | null>(null);
const inputSectionText = ref<string | null>(null);
const avatarImage = ref<File | null>(null);
const previewImage = ref<string | null>(null);
const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff", "image/svg+xml"];
const filePath = ref<string>("");
const characterStore = useCharacterStore()
const inventoryStore = useInventoryStore()
const npcRelationsStore = useNpcRelationsStore()

const relationsByType = computed(() => npcRelationsStore.byType)

// Long-press delete for relations (like RoomsPage)
const deleteRelationPopoverOpen = ref(false);
const deleteRelationPopoverEvent = ref<Event | null>(null);
const relationToDelete = ref<NpcWithRelationIdDto | null>(null);
const didOpenDeleteRelationPopover = ref(false);
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let pressStartX = 0;
let pressStartY = 0;
const MOVE_THRESHOLD_PX = 10;

const onRelationPressMove = (e: MouseEvent | TouchEvent) => {
  if (!longPressTimer) return;
  const source = e instanceof TouchEvent ? (e as TouchEvent).touches[0] : (e as MouseEvent);
  const x = source?.clientX ?? 0;
  const y = source?.clientY ?? 0;
  const dist = Math.hypot(x - pressStartX, y - pressStartY);
  if (dist > MOVE_THRESHOLD_PX) {
    onRelationPressEnd();
  }
};

const bindMoveListener = () => {
  document.addEventListener("touchmove", onRelationPressMove, { passive: true });
  document.addEventListener("mousemove", onRelationPressMove);
};
const unbindMoveListener = () => {
  document.removeEventListener("touchmove", onRelationPressMove);
  document.removeEventListener("mousemove", onRelationPressMove);
};

const onRelationPressStart = (item: NpcWithRelationIdDto, e: MouseEvent | TouchEvent) => {
  relationToDelete.value = item;
  const source = e instanceof TouchEvent ? (e as TouchEvent).touches[0] : (e as MouseEvent);
  pressStartX = source?.clientX ?? 0;
  pressStartY = source?.clientY ?? 0;
  bindMoveListener();
  longPressTimer = setTimeout(() => {
    longPressTimer = null;
    unbindMoveListener();
    didOpenDeleteRelationPopover.value = true;
    const ev = new MouseEvent("click", { clientX: pressStartX, clientY: pressStartY, bubbles: true });
    deleteRelationPopoverEvent.value = ev;
    deleteRelationPopoverOpen.value = true;
  }, 500);
};

const onRelationPressEnd = () => {
  unbindMoveListener();
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
};

const confirmDeleteRelation = async () => {
  if (!relationToDelete.value?.relationId) return;
  const relationId = relationToDelete.value.relationId;
  relationToDelete.value = null;
  deleteRelationPopoverOpen.value = false;
  deleteRelationPopoverEvent.value = null;
  await onDeleteRelation(relationId);
};

const dismissDeleteRelationPopover = () => {
  deleteRelationPopoverOpen.value = false;
  deleteRelationPopoverEvent.value = null;
  relationToDelete.value = null;
};

const goToNpcIfNotLongPress = (npcId: string) => {
  if (didOpenDeleteRelationPopover.value) {
    didOpenDeleteRelationPopover.value = false;
    return;
  }
  ionRouter.push(`/rooms/${route.params.roomId}/npcs/${npcId}/full`);
};

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
    path: `/rooms/${roomId}/characters/${characterId}/npcs/search`,
    query: { relationType: type },
  });
}

async function onDeleteRelation(relationId: string) {
  const roomId = route.params.roomId as string;
  const characterId = route.params.characterId as string;
  try {
    console.log(relationId);
    await deleteCharacterNpcRelationByIdForRoom(roomId, characterId, relationId);
    await loadAllRelatedNpcs();
  } catch (e) {
    console.error("Failed to delete relation:", e);
  }
}

function getBioValue(bio: CharacterBio, key: BioEditableKey): string {
  const val = bio[key];
  return val != null ? String(val) : "";
}

function getEditableText(e: Event): string {
  return (e.target as HTMLElement)?.innerText ?? "";
}

const startEditing = (field: BioStatFieldKey) => {
  editedValues.value[field] = getBioValue(characterStore.character.characterBio, field);
};

const updateFieldValue = (field: BioStatFieldKey, text: string) => {
  editedValues.value[field] = text;
};

// Функция для конвертации текста в HTML
const renderMarkdown = (text: string | undefined): string => {
  return text ? marked(text, {async: false}) : "";
};

const expandBlock = (name: BioSectionKey) => {
  if (isBlockExpanded.value === name) return;
  isBlockExpanded.value = name;
  inputSectionText.value = getBioValue(characterStore.character.characterBio, name);
};

const saveSectionText = async (name: BioSectionKey) => {
  const originalValue = getBioValue(characterStore.character.characterBio, name);

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

    isBlockExpanded.value = null;
    inputSectionText.value = null;
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


const saveField = async (field: BioEditableKey, text: string) => {
  const newValue = text;
  if (newValue === getBioValue(characterStore.character.characterBio, field)) return;

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
    await inventoryStore.updateInventoryInStoreById(roomId, characterId)
  } catch (error) {
    console.error("Ошибка при сохранении данных:", error);
  }
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

onBeforeUnmount(() => {
  unbindMoveListener();
  if (longPressTimer) clearTimeout(longPressTimer);
});
</script>

<template>
  <div class="container">
    <div class="header" v-show="isBlockExpanded == null">
      <div class="avatar" @click="triggerFileInput">
        <img v-if="previewImage" :src="previewImage" class="avatar-img" alt="Room Image"/>
        <CachedFileImage
          v-else-if="characterStore.character.characterBio.avatar"
          class="avatar-img"
          alt="avatar"
          :src="FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                 FILE_STORAGE_INTEGRATION_ROUTES.api +
                 FILE_STORAGE_INTEGRATION_ROUTES.avatar_images_bucket +
                 FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + characterStore.character.characterBio.avatar"
        />
        <div v-else class="avatar-img">
          <ion-icon :icon="add" class="placeholder-icon"></ion-icon>
        </div>
        <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" style="display: none;"/>
      </div>
      <div class="stats">
        <div class="stat" v-for="field in statFields" :key="field">
          {{ TEXTS[field].rus }} :
          <span
              class="stat-value"
              contenteditable="true"
              @focus="startEditing(field)"
              @blur="saveField(field, getEditableText($event))"
              @input="updateFieldValue(field, getEditableText($event))"
              @keydown.enter.prevent="saveField(field, getEditableText($event))"
          >{{ getBioValue(characterStore.character.characterBio, field) }}</span>
        </div>
      </div>
    </div>

    <div
        v-for="section in bioSections"
        :key="section"
        class="bio-section"
        :class="{ 'bio-section--expanded': isBlockExpanded === section }"
        v-show="isBlockExpanded === null || isBlockExpanded === section"
        @click="expandBlock(section)"
    >
      <h1 class="sectionHeader">{{ TEXTS[section].rus }}:</h1>
      <div :class="{ expand: isBlockExpanded === section }" class="section">
        <textarea
            v-if="isBlockExpanded === section"
            class="bio-section-textarea"
            :value="inputSectionText ?? ''"
            @input="inputSectionText = ($event.target as HTMLTextAreaElement).value"
            @click.stop
        />
        <div
            v-else
            class="bio-section-html"
            v-html="renderMarkdown(getBioValue(characterStore.character.characterBio, section))"
        />
        <ion-buttons class="sectionButtons" v-show="isBlockExpanded === section">
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
          <div
            class="npc-card"
            v-for="item in relationsByType.FRIEND"
            :key="item.relationId"
            @click.stop="goToNpcIfNotLongPress(item.id)"
            @touchstart.passive="onRelationPressStart(item, $event)"
            @touchend="onRelationPressEnd"
            @touchcancel="onRelationPressEnd"
            @mousedown="onRelationPressStart(item, $event)"
            @mouseup="onRelationPressEnd"
            @mouseleave="onRelationPressEnd"
          >
            <div class="npc-card-avatar-wrap">
              <img class="npc-avatar" onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" :src="getNpcImageUrl(item.imgUrl)" :alt="item.name"/>
              <div v-if="item.unique" class="npc-unique-badge" title="Уникальный">
                <ion-icon :icon="sparkles" />
              </div>
            </div>
            <div class="npc-name">{{ item.name }}</div>
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
          <div
            class="npc-card"
            v-for="item in relationsByType.ENEMY"
            :key="item.relationId"
            @click.stop="goToNpcIfNotLongPress(item.id)"
            @touchstart.passive="onRelationPressStart(item, $event)"
            @touchend="onRelationPressEnd"
            @touchcancel="onRelationPressEnd"
            @mousedown="onRelationPressStart(item, $event)"
            @mouseup="onRelationPressEnd"
            @mouseleave="onRelationPressEnd"
          >
            <div class="npc-card-avatar-wrap">
              <img class="npc-avatar" onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" :src="getNpcImageUrl(item.imgUrl)" :alt="item.name"/>
              <div v-if="item.unique" class="npc-unique-badge" title="Уникальный">
                <ion-icon :icon="sparkles" />
              </div>
            </div>
            <div class="npc-name">{{ item.name }}</div>
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
          <div
            class="npc-card"
            v-for="item in relationsByType.RULER"
            :key="item.relationId"
            @click.stop="goToNpcIfNotLongPress(item.id)"
            @touchstart.passive="onRelationPressStart(item, $event)"
            @touchend="onRelationPressEnd"
            @touchcancel="onRelationPressEnd"
            @mousedown="onRelationPressStart(item, $event)"
            @mouseup="onRelationPressEnd"
            @mouseleave="onRelationPressEnd"
          >
            <div class="npc-card-avatar-wrap">
              <img class="npc-avatar" onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" :src="getNpcImageUrl(item.imgUrl)" :alt="item.name"/>
              <div v-if="item.unique" class="npc-unique-badge" title="Уникальный">
                <ion-icon :icon="sparkles" />
              </div>
            </div>
            <div class="npc-name">{{ item.name }}</div>
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
          <div
            class="npc-card"
            v-for="item in relationsByType.PET"
            :key="item.relationId"
            @click.stop="goToNpcIfNotLongPress(item.id)"
            @touchstart.passive="onRelationPressStart(item, $event)"
            @touchend="onRelationPressEnd"
            @touchcancel="onRelationPressEnd"
            @mousedown="onRelationPressStart(item, $event)"
            @mouseup="onRelationPressEnd"
            @mouseleave="onRelationPressEnd"
          >
            <div class="npc-card-avatar-wrap">
              <img class="npc-avatar" onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" :src="getNpcImageUrl(item.imgUrl)" :alt="item.name"/>
              <div v-if="item.unique" class="npc-unique-badge" title="Уникальный">
                <ion-icon :icon="sparkles" />
              </div>
            </div>
            <div class="npc-name">{{ item.name }}</div>
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
          <div
            class="npc-card"
            v-for="item in relationsByType.OTHER"
            :key="item.relationId"
            @click.stop="goToNpcIfNotLongPress(item.id)"
            @touchstart.passive="onRelationPressStart(item, $event)"
            @touchend="onRelationPressEnd"
            @touchcancel="onRelationPressEnd"
            @mousedown="onRelationPressStart(item, $event)"
            @mouseup="onRelationPressEnd"
            @mouseleave="onRelationPressEnd"
          >
            <div class="npc-card-avatar-wrap">
              <img class="npc-avatar" onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" :src="getNpcImageUrl(item.imgUrl)" :alt="item.name"/>
              <div v-if="item.unique" class="npc-unique-badge" title="Уникальный">
                <ion-icon :icon="sparkles" />
              </div>
            </div>
            <div class="npc-name">{{ item.name }}</div>
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

    <ion-popover
      :is-open="deleteRelationPopoverOpen"
      :event="deleteRelationPopoverEvent"
      @didDismiss="dismissDeleteRelationPopover"
    >
      <div class="delete-relation-popover">
        <p>Удалить связь?</p>
        <div class="delete-relation-actions">
          <ion-button fill="clear" size="small" @click="dismissDeleteRelationPopover">Нет</ion-button>
          <ion-button fill="solid" color="danger" size="small" @click="confirmDeleteRelation">Да</ion-button>
        </div>
      </div>
    </ion-popover>
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
  transition: max-height 0.45s ease;
}

.section.expand {
  display: flex;
  flex-direction: column;
  max-height: none;
  /* До низа экрана: заголовок блока, отступы, кнопка сохранения, safe area */
  height: 67vh;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  transition: min-height 0.35s ease, height 0.35s ease;
}

@media (min-width: 1024px) {
  .section.expand {
    height: 63vh;
  }
}


.bio-section-html :deep(p) {
  margin: 0 0 0.5em;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ion-color-light);
  word-break: break-word;
}

.bio-section-html :deep(p:last-child) {
  margin-bottom: 0;
}

.bio-section-textarea {
  display: block;
  width: 100%;
  min-height: 10em;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ion-color-light);
  word-break: break-word;
  white-space: pre-wrap;
  background: transparent;
  border: none;
  outline: none;
  resize: vertical;
  font-family: inherit;
}

.bio-section--expanded .bio-section-textarea {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
}

.bio-section-html :deep(ul),
.bio-section-html :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.25em;
}

.bio-section-html :deep(h1) {
  font-size: 1.15em;
}

.bio-section-html :deep(h2) {
  font-size: 1.05em;
}

.bio-section-html :deep(h3) {
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

.section.expand .sectionButtons {
  flex-shrink: 0;
  margin-top: 4px;
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
  scrollbar-width: none;

  /* Для Internet Explorer и старых Edge */
  -ms-overflow-style: none;

  /* Для Chrome, Safari и современных Opera/Edge */
  &::-webkit-scrollbar {
    display: none;
  }
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

.npc-card-avatar-wrap {
  position: relative;
}

.npc-unique-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd700, #ffb347);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  color: #5c3d00;
  font-size: 12px;
}

.npc-unique-badge ion-icon {
  font-size: 14px;
}

.npc-avatar {
  width: 75px;
  height: 75px;
  border-radius: 18px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.npc-delete-btn {
  --padding-start: 4px;
  --padding-end: 4px;
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 24px;
  min-height: 24px;
  margin: 0;
  color: var(--ion-color-danger);
  font-size: 14px;
}

.npc-name {
  width: 75px;
  text-align: center;
  font-size: 9pt;
  line-height: 1;
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

.delete-relation-popover {
  padding: 12px 16px;
  min-width: 180px;
  background-color: var(--ion-color-dark);
}
.delete-relation-popover p {
  margin: 0 0 12px 0;
  font-size: 14px;
}
.delete-relation-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}


</style>
