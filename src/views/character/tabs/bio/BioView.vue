<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from "vue";
import {useRoute} from "vue-router";
import axios from "axios";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {TEXTS} from "@/config/localisations";
import {marked} from "marked";
import {add, chevronBackOutline, createOutline, saveOutline, sparkles} from "ionicons/icons";
import {
  IonButton,
  IonIcon,
  IonPopover,
  IonSpinner,
  useIonRouter,
  onIonViewDidEnter,
} from "@ionic/vue";
import {useCharacterStore} from "@/stores/CharacterStore";
import {useInventoryStore} from "@/stores/InventoryStore";
import {useNpcRelationsStore} from "@/stores/NpcRelationsStore";
import {useSubheaderOpenedStore} from "@/stores/SubheaderStore";
import {deleteCharacterNpcRelationByIdForRoom} from "@/api/npcApi";
import type { NpcWithRelationIdDto, RelationTypeEnum } from "@/api/npcApi.types";
import type {CharacterBio} from "@/components/models/response/Character";
import CachedFileImage from "@/components/CachedFileImage.vue";
import {extractDominantColorFromUrl} from "@/utils/imageAmbient";

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
const isSectionEditing = ref(false);
const inputSectionText = ref<string | null>(null);
const sectionTextareaRef = ref<HTMLTextAreaElement | null>(null);
const expandedPanelRef = ref<HTMLElement | null>(null);

const bindExpandedPanelRef = (el: Element | null) => {
  expandedPanelRef.value = el instanceof HTMLElement ? el : null;
};

const findIonContent = (element: HTMLElement): HTMLIonContentElement | null => {
  let current: HTMLElement | null = element;

  while (current) {
    if (current.tagName === "ION-CONTENT") {
      return current as HTMLIonContentElement;
    }
    current = current.parentElement;
  }

  return null;
};

const getScrollSafeTopPadding = (scrollElement: HTMLElement): number => {
  const basePadding = 0;
  const scrollRect = scrollElement.getBoundingClientRect();
  let anchorTop = scrollRect.top + basePadding;

  const subheaderEl = document.querySelector<HTMLElement>(".subheader-block");
  if (subheaderEl) {
    const subheaderBottom = subheaderEl.getBoundingClientRect().bottom;
    if (subheaderBottom > scrollRect.top) {
      anchorTop = Math.max(anchorTop, subheaderBottom + basePadding);
    }
  }

  const headerEl = document.querySelector<HTMLElement>(".character-header");
  if (headerEl) {
    const headerBottom = headerEl.getBoundingClientRect().bottom;
    if (headerBottom > scrollRect.top) {
      anchorTop = Math.max(anchorTop, headerBottom + basePadding);
    }
  }

  return Math.max(basePadding, anchorTop - scrollRect.top);
};

const ensureExpandedSectionVisible = async () => {
  if (!isBlockExpanded.value) return;

  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const panel =
      expandedPanelRef.value
      ?? document.querySelector<HTMLElement>(".bio-section--expanded");
  if (!panel) return;

  const contentElement = findIonContent(panel);

  if (!contentElement) {
    panel.scrollIntoView({behavior: "smooth", block: "start"});
    return;
  }

  const scrollElement = await contentElement.getScrollElement();
  const panelRect = panel.getBoundingClientRect();
  const scrollRect = scrollElement.getBoundingClientRect();
  const safeTopPadding = getScrollSafeTopPadding(scrollElement);
  const targetScrollTop = scrollElement.scrollTop + panelRect.top - scrollRect.top - safeTopPadding;
  const clampedTop = Math.max(0, targetScrollTop);

  try {
    await contentElement.scrollToPoint(0, clampedTop, 350);
  } catch {
    scrollElement.scrollTo({top: clampedTop, behavior: "smooth"});
  }
};

const scheduleExpandedSectionScroll = () => {
  void ensureExpandedSectionVisible();
  window.setTimeout(() => {
    void ensureExpandedSectionVisible();
  }, 120);
  window.setTimeout(() => {
    void ensureExpandedSectionVisible();
  }, 380);
};
const avatarImage = ref<File | null>(null);
const previewImage = ref<string | null>(null);
const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff", "image/svg+xml"];
const filePath = ref<string>("");
const characterStore = useCharacterStore()
const inventoryStore = useInventoryStore()
const npcRelationsStore = useNpcRelationsStore()
const subheaderStore = useSubheaderOpenedStore()

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
  isSectionEditing.value = false;
  inputSectionText.value = getBioValue(characterStore.character.characterBio, name);
};

const closeSection = () => {
  isBlockExpanded.value = null;
  isSectionEditing.value = false;
  inputSectionText.value = null;
};

const startSectionEdit = async () => {
  if (!isBlockExpanded.value) return;
  inputSectionText.value = getBioValue(characterStore.character.characterBio, isBlockExpanded.value);
  isSectionEditing.value = true;
  await nextTick();
  sectionTextareaRef.value?.focus();
};

const cancelSectionEdit = () => {
  if (!isBlockExpanded.value) return;
  inputSectionText.value = getBioValue(characterStore.character.characterBio, isBlockExpanded.value);
  isSectionEditing.value = false;
};

const isSectionEmpty = (section: BioSectionKey) =>
    !getBioValue(characterStore.character.characterBio, section).trim();

const saveSectionText = async (name: BioSectionKey) => {
  const originalValue = getBioValue(characterStore.character.characterBio, name);
  const newValue = inputSectionText.value ?? "";

  if (newValue.trim() === originalValue.trim()) {
    isSectionEditing.value = false;
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
    isSectionEditing.value = false;
  } catch (error) {
    console.error("Ошибка при сохранении данных:", error);
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

const avatarRemoteSrc = computed(() => {
  const avatar = characterStore.character?.characterBio?.avatar;
  if (!avatar) return null;

  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.avatar_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${avatar}`;
});

const avatarDisplaySrc = computed(() => previewImage.value ?? avatarRemoteSrc.value);
const ambientColor = ref<string | null>(null);

watch(isBlockExpanded, (section) => {
  if (section) {
    scheduleExpandedSectionScroll();
  }
});

watch(() => subheaderStore.subheaderOpened, () => {
  if (!isBlockExpanded.value) return;
  scheduleExpandedSectionScroll();
  window.setTimeout(() => {
    void ensureExpandedSectionVisible();
  }, 500);
});

watch(avatarDisplaySrc, (src) => {
  if (!src) {
    ambientColor.value = null;
    return;
  }

  void extractDominantColorFromUrl(src).then((color) => {
    if (src === avatarDisplaySrc.value) {
      ambientColor.value = color;
    }
  });
}, {immediate: true});

onBeforeUnmount(() => {
  unbindMoveListener();
  if (longPressTimer) clearTimeout(longPressTimer);
});
</script>

<template>
  <div class="container">
    <div class="header" v-show="isBlockExpanded == null">
      <div
          class="avatar"
          :style="ambientColor ? { '--ambient-color': ambientColor } : undefined"
          @click="triggerFileInput"
      >
        <div v-if="avatarDisplaySrc" class="avatar-ambient" aria-hidden="true">
          <img :src="avatarDisplaySrc" alt="" class="avatar-ambient__img"/>
        </div>
        <img v-if="previewImage" :src="previewImage" class="avatar-img" alt="avatar"/>
        <CachedFileImage
          v-else-if="characterStore.character.characterBio.avatar"
          class="avatar-img"
          alt="avatar"
          :src="avatarRemoteSrc!"
        />
        <div v-else class="avatar-img avatar-img--placeholder">
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

    <template v-for="section in bioSections" :key="section">
      <div
          v-if="isBlockExpanded !== section"
          class="bio-section"
          @click="expandBlock(section)"
      >
        <h1 class="sectionHeader">{{ TEXTS[section].rus }}</h1>
        <div class="section section--preview">
          <div
              v-if="!isSectionEmpty(section)"
              class="bio-section-html bio-section-html--preview"
              v-html="renderMarkdown(getBioValue(characterStore.character.characterBio, section))"
          />
          <p v-else class="bio-section-preview-empty">Нажмите, чтобы открыть</p>
        </div>
      </div>

      <div
          v-else
          :ref="bindExpandedPanelRef"
          class="bio-section bio-section--expanded"
      >
        <div class="bio-expanded-panel">
          <div class="bio-expanded-toolbar">
            <ion-button
                class="bio-toolbar-btn"
                fill="clear"
                size="small"
                aria-label="Назад"
                @click="closeSection"
            >
              <ion-icon slot="icon-only" :icon="chevronBackOutline"/>
            </ion-button>

            <h2 class="bio-expanded-title">{{ TEXTS[section].rus }}</h2>

            <ion-button
                v-if="!isSectionEditing"
                class="bio-toolbar-btn bio-toolbar-btn--accent"
                fill="clear"
                size="small"
                :aria-label="isSectionEmpty(section) ? 'Добавить текст' : 'Редактировать'"
                @click="startSectionEdit"
            >
              <ion-icon slot="icon-only" :icon="createOutline"/>
            </ion-button>
            <span v-else class="bio-toolbar-spacer" aria-hidden="true"/>
          </div>

          <div class="section section--expanded" :class="{ 'section--editing': isSectionEditing }">
            <div v-if="!isSectionEditing" class="bio-expanded-body">
              <div
                  v-if="!isSectionEmpty(section)"
                  class="bio-section-html bio-section-html--reading"
                  v-html="renderMarkdown(getBioValue(characterStore.character.characterBio, section))"
              />
              <div v-else class="bio-section-empty">
                <p class="bio-section-empty__text">Запись пока пуста</p>
                <p class="bio-section-empty__hint">Добавьте историю, идеалы или заметки в формате Markdown</p>
                <ion-button
                    class="bio-section-empty__btn"
                    fill="outline"
                    size="small"
                    @click="startSectionEdit"
                >
                  Написать
                </ion-button>
              </div>
            </div>

            <template v-else>
              <textarea
                  ref="sectionTextareaRef"
                  class="bio-section-textarea"
                  :value="inputSectionText ?? ''"
                  placeholder="Поддерживается Markdown: **жирный**, *курсив*, списки..."
                  @input="inputSectionText = ($event.target as HTMLTextAreaElement).value"
              />
              <div class="bio-edit-actions">
                <ion-button
                    fill="clear"
                    size="small"
                    class="bio-edit-actions__cancel"
                    @click="cancelSectionEdit"
                >
                  Отмена
                </ion-button>
                <ion-button
                    fill="solid"
                    size="small"
                    class="bio-edit-actions__save"
                    @click="saveSectionText(section)"
                >
                  <ion-icon slot="start" :icon="saveOutline"/>
                  Сохранить
                </ion-button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>

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
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.92) 100%);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  color: var(--ion-color-light);
  border-radius: 16px;
  padding: 12px 14px;
  overflow: hidden;
}

.section--preview {
  position: relative;
  max-height: 200px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.section--preview:hover {
  border-color: rgba(var(--ion-color-primary-rgb), 0.3);
}

.section--preview:active {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
}

.section--preview::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 48px;
  border-radius: 0 0 16px 16px;
  background: linear-gradient(to bottom, transparent, rgba(var(--ion-color-dark-rgb), 0.92));
  pointer-events: none;
}

.bio-section-preview-empty {
  margin: 0;
  padding: 8px 4px 12px;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.bio-expanded-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: bio-expand-in 0.28s ease;
}

@keyframes bio-expand-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bio-expanded-toolbar {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 4px;
  min-height: 40px;
}

.bio-expanded-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  color: var(--ion-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bio-toolbar-btn {
  --padding-start: 0;
  --padding-end: 0;
  margin: 0;
  width: 40px;
  height: 40px;
}

.bio-toolbar-btn--accent {
  --color: var(--ion-color-primary);
}

.bio-toolbar-spacer {
  width: 40px;
  height: 40px;
}

.section--expanded {
  display: flex;
  flex-direction: column;
  height: 67vh;
  padding: 0;
  overflow: hidden;
}

.section--editing {
  padding: 12px 12px 10px;
}

.bio-expanded-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding: 14px 14px 18px;
}

.bio-section-html--reading :deep(h1) {
  margin: 0.2em 0 0.55em;
  font-size: 1.25em;
  font-weight: 700;
  line-height: 1.3;
}

.bio-section-html--reading :deep(h2) {
  margin: 0.85em 0 0.45em;
  font-size: 1.1em;
  font-weight: 700;
  line-height: 1.35;
}

.bio-section-html--reading :deep(h3) {
  margin: 0.75em 0 0.35em;
  font-size: 1em;
  font-weight: 600;
  line-height: 1.35;
  color: rgba(var(--ion-color-light-rgb), 0.9);
}

.bio-section-html--preview :deep(p) {
  margin: 0 0 0.45em;
  font-size: 14px;
  line-height: 1.45;
  color: var(--ion-color-light);
  word-break: break-word;
}

.bio-section-html--reading :deep(p) {
  margin: 0 0 0.85em;
  font-size: 15px;
  line-height: 1.65;
  color: rgba(var(--ion-color-light-rgb), 0.92);
}

.bio-section-html--reading :deep(p:last-child) {
  margin-bottom: 0;
}

.bio-section-html--reading :deep(ul),
.bio-section-html--reading :deep(ol) {
  margin: 0.65em 0 0.85em;
  padding-left: 1.35em;
  font-size: 15px;
  line-height: 1.6;
}

.bio-section-html--reading :deep(li + li) {
  margin-top: 0.35em;
}

.bio-section-html--reading :deep(strong) {
  color: var(--ion-color-light);
  font-weight: 700;
}

.bio-section-html--reading :deep(em) {
  color: rgba(var(--ion-color-primary-rgb), 0.95);
}

.bio-section-html--reading :deep(blockquote) {
  margin: 0.75em 0;
  padding: 10px 12px;
  border-left: 3px solid rgba(var(--ion-color-primary-rgb), 0.55);
  border-radius: 0 10px 10px 0;
  background: rgba(var(--ion-color-primary-rgb), 0.08);
  color: rgba(var(--ion-color-light-rgb), 0.85);
}

.bio-section-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 24px 16px;
  text-align: center;
}

.bio-section-empty__text {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--ion-color-light);
}

.bio-section-empty__hint {
  margin: 0 0 18px;
  max-width: 260px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(var(--ion-color-light-rgb), 0.5);
}

.bio-section-empty__btn {
  --border-color: rgba(var(--ion-color-primary-rgb), 0.45);
  --color: var(--ion-color-primary);
}

.bio-section-textarea {
  display: block;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 12px;
  box-sizing: border-box;
  font-size: 15px;
  line-height: 1.55;
  color: var(--ion-color-light);
  word-break: break-word;
  white-space: pre-wrap;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
  border-radius: 12px;
  outline: none;
  resize: none;
  font-family: inherit;
}

.bio-section-textarea::placeholder {
  color: rgba(var(--ion-color-light-rgb), 0.35);
}

.bio-edit-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-top: 10px;
  padding-top: 2px;
}

.bio-edit-actions__cancel {
  --color: rgba(var(--ion-color-light-rgb), 0.65);
}

.bio-edit-actions__save {
  --background: var(--ion-color-primary);
  --color: var(--ion-color-primary-contrast);
  --border-radius: 999px;
  --padding-start: 14px;
  --padding-end: 16px;
  font-weight: 600;
}

@media (min-width: 1024px) {
  .section--expanded {
    height: 63vh;
  }
}

.sectionHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 20px 0 12px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.72);
}

.sectionHeader::before {
  content: "";
  flex-shrink: 0;
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: var(--ion-color-primary);
}

.bio-section {
  cursor: pointer;
}

.bio-section--expanded {
  cursor: default;
}

.header {
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: center;
  justify-content: start;
  gap: 38px;
}

.avatar {
  position: relative;
  flex-shrink: 0;
  width: 170px;
  height: 170px;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ambient-color, var(--ion-color-dark));
  cursor: pointer;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  transition: background-color 0.45s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.avatar:hover {
  border-color: rgba(var(--ion-color-primary-rgb), 0.4);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.4);
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

img.avatar-img {
  position: relative;
  z-index: 1;
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.avatar-img--placeholder,
div.avatar-img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats {
  border-radius: 25px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  background-color: var(--ion-color-medium);
  width: 170px;
  height: 170px;
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
  font-size: 16px;
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
  font-size: 14px;
}

.placeholder-icon {
  align-self: center;
  justify-self: center;
  font-size: 48px;
  color: white;
}

.npc-section {
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.92) 100%);
  border-radius: 16px;
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
  cursor: pointer;
}

.npc-card:active {
  transform: scale(0.97);
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
  font-size: 14px;
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
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.npc-card:hover .npc-avatar {
  border-color: rgba(var(--ion-color-primary-rgb), 0.45);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
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
  font-size: 12px;
  line-height: 1;
  word-break: break-word;
}

.npc-add-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--ion-color-primary-rgb), 0.06);
  border: 1px dashed rgba(var(--ion-color-primary-rgb), 0.5);
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
