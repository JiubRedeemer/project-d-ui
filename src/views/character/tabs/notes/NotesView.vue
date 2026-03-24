<script setup lang="ts">
import {onMounted, ref} from "vue";
import {useRoute} from "vue-router";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {
  IonButton,
  IonChip,
  IonIcon,
  IonInput,
  IonLabel,
  IonTextarea,
  onIonViewDidEnter,
  useIonRouter
} from "@ionic/vue";
import {addOutline, attachOutline, createOutline, saveOutline, trashOutline} from "ionicons/icons";

import {marked} from "marked";

marked.setOptions({
  breaks: true,
});

interface NoteSection {
  id: string;
  notebookId?: string;
  name: string;
  noteText: string;
  tags?: { name: string; color: string }[];
}

const route = useRoute();
const ionRouter = useIonRouter();

const notes = ref<any[]>([]);
const notebook = ref<any | null>(null);
const isEditing = ref<string | null>(null);

const newNoteName = ref("");
const newNoteText = ref("");
const newTags = ref<{ name: string; color: string }[]>([]);

const editNoteName = ref("");
const editNoteText = ref("");
const editTags = ref<{ name: string; color: string }[]>([]);

const isBlockExpanded = ref<number | null>(null);
const inputSectionText = ref<string | null>(null);

const editingNoteId = ref<string | null>(null);

const toggleEditMode = (section: NoteSection | null) => {
  if (section === null) {
    editingNoteId.value = null;
    return;
  }
  if (editingNoteId.value === section.id) {
    section.noteText = editNoteText.value;
    editingNoteId.value = null;
  } else {
    editNoteText.value = section.noteText;
    editingNoteId.value = section.id;
  }
};
// === Markdown render ===
const renderMarkdown = (text: string): string => (text ? marked(text) : "");

// === Load notebook ===
const loadNotebook = async () => {
  try {
    const roomId = route.params.roomId as string;
    const characterId = route.params.characterId as string;

    const res = await axios.get(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}/rooms/${roomId}/characters/${characterId}/notes/notebook`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
    notebook.value = res.data;
    notes.value = res.data.notes || [];
  } catch (e) {
    console.error("Ошибка при загрузке блокнота:", e);
  }
};

const addNewTagField = (target: "new" | "edit") => {
  const tag = {name: "", color: "#8888ff"};
  if (target === "new") newTags.value.push(tag);
  else editTags.value.push(tag);
};

const removeTagField = (target: "new" | "edit", index: number) => {
  if (target === "new") newTags.value.splice(index, 1);
  else editTags.value.splice(index, 1);
};

// === Add note ===
const normalizeTags = (tags: { name?: string | null; color?: string | null }[]) =>
    tags
        .map(tag => ({
          name: String(tag?.name ?? "").trim(),
          color: tag?.color || "#8888ff",
        }))
        .filter(tag => tag.name.length > 0);

const addNote = async () => {
  try {
    const roomId = route.params.roomId as string;
    const characterId = route.params.characterId as string;

    const noteDto = {
      name: newNoteName.value,
      noteText: newNoteText.value,
      tags: normalizeTags(newTags.value),
    };

    if (!noteDto.name || noteDto.name.length < 1) {
      newNoteName.value = "";
      newNoteText.value = "";
      newTags.value.splice(0); // очищает reactive массив
      isBlockExpanded.value = null; // Закрываем все секции
      return;
    }
    const res = await axios.put(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}/rooms/${roomId}/characters/${characterId}/notes`,
        noteDto,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );

    notes.value.push(res.data);
    newNoteName.value = "";
    newNoteText.value = "";
    newTags.value.splice(0); // очищает reactive массив
    isBlockExpanded.value = null; // Закрываем все секции
  } catch (e) {
    console.error("Ошибка при создании заметки:", e);
  }
};

// === Update note ===
const updateNote = async (notebookId: string, noteId: string) => {
  try {
    const roomId = route.params.roomId as string;
    const characterId = route.params.characterId as string;

    const noteDto = {
      id: noteId,
      notebookId: notebookId,
      name: editNoteName.value,
      noteText: editNoteText.value,
      tags: normalizeTags(editTags.value),
    };
    if (!noteDto.name || noteDto.name.length < 1) {
      isEditing.value = null;
      isBlockExpanded.value = null; // Закрываем все секции
      toggleEditMode(null);
      return;
    }
    const res = await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}/rooms/${roomId}/characters/${characterId}/notes/${noteId}`,
        noteDto,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );

    const idx = notes.value.findIndex(n => n.id === noteId);
    if (idx !== -1) notes.value[idx] = res.data;
    isEditing.value = null;
    isBlockExpanded.value = null; // Закрываем все секции
    toggleEditMode(null);
  } catch (e) {
    console.error("Ошибка при обновлении заметки:", e);
  }
};

// === Delete note ===
const deleteNote = async (noteId: string) => {
  try {
    const roomId = route.params.roomId as string;
    const characterId = route.params.characterId as string;

    await axios.delete(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}/rooms/${roomId}/characters/${characterId}/notes/${noteId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );

    notes.value = notes.value.filter(n => n.id !== noteId);
    isBlockExpanded.value = null; // Закрываем все секции
  } catch (e) {
    console.error("Ошибка при удалении заметки:", e);
  }
};

const loadNotesData = () => {
  loadNotebook();
};

const openFilesView = () => {
  const roomId = String(route.params.roomId);
  const characterId = String(route.params.characterId);
  ionRouter.navigate(`/rooms/${roomId}/characters/${characterId}/files`, "forward", "push");
};

onMounted(loadNotesData);
onIonViewDidEnter(loadNotesData);

const expandBlock = (noteNumber: number, section: NoteSection) => {
  isBlockExpanded.value = noteNumber;
  inputSectionText.value = notes.value[noteNumber];
  editNoteName.value = section.name;
  editNoteText.value = section.noteText;
  editTags.value = section.tags ? JSON.parse(JSON.stringify(section.tags)) : [];
};

const updateHeaderSectionText = (event: Event, section: NoteSection) => {
  const target = event.target as HTMLElement;
  editNoteText.value = section.noteText;
  editNoteName.value = target.innerText;
};

const autoGrow = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement;
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
};

const getSheetAccentStyle = (section: NoteSection) => {
  const color = section.tags?.[0]?.color;
  if (!color) return {};
  return {borderLeftColor: color};
};

</script>

<template>
  <div class="notes-body">
    <h1 class="sectionHeader" v-if="notes.length > 0">Заметки</h1>

    <div class="note-list">
      <article
          v-for="(section, index) in notes"
          :key="section.id"
          :class="{ 'notes-card--expanded': isBlockExpanded === index }"
          class="notes-card"
          v-show="isBlockExpanded === null || isBlockExpanded === index"
          @click.stop="expandBlock(index, section)"
      >
        <header class="notes-card__header">
          <h2
              class="notes-card__title"
              contenteditable="true"
              @input="updateHeaderSectionText($event, section)"
          >{{ section.name }}</h2>
          <div v-if="section.tags?.length" class="notes-card__tags-dots"
               :class="{ 'notes-card__tags-dots--expanded': isBlockExpanded === index }">
            <template v-if="isBlockExpanded === index">
              <ion-chip
                  v-for="(tag, tIndex) in section.tags"
                  :key="tIndex"
                  :style="{ backgroundColor: tag.color || '#8888ff', color: '#fff' }"
                  class="notes-card__tag"
              >
                <ion-label>{{ tag.name }}</ion-label>
              </ion-chip>
            </template>
            <template v-else>
              <span
                  v-for="(tag, tIndex) in section.tags.slice(0, 5)"
                  :key="tIndex"
                  class="notes-card__tag-dot"
                  :style="{ backgroundColor: tag.color || '#8888ff' }"
              />
            </template>
          </div>
        </header>

        <div v-if="isBlockExpanded === index" class="notes-card__body" @click.stop>
          <div class="notes-card__toolbar">
            <ion-button
                fill="clear"
                size="small"
                class="notes-card__edit-btn"
                @click.stop="toggleEditMode(section)"
            >
              <ion-icon :icon="createOutline"></ion-icon>
            </ion-button>
          </div>

          <div
              v-if="editingNoteId !== section.id"
              class="notes-card__markdown note-markdown"
              v-html="renderMarkdown(section.noteText)"
          />

          <template v-else>
            <textarea
                v-model="editNoteText"
                class="notes-card__textarea"
                placeholder="Введите текст заметки (Markdown)..."
                @input="autoGrow($event)"
                @click="autoGrow($event)"
            />

            <div class="notes-card__tags-edit tags-block">
              <div
                  v-for="(tag, tagIdx) in editTags"
                  :key="tagIdx"
                  class="tag-field"
              >
                <ion-input
                    placeholder="Имя тега"
                    v-model="tag.name"
                    fill="outline"
                    class="tag-input"
                />
                <input type="color" v-model="tag.color" class="tag-color-picker" aria-label="Цвет тега"/>
                <ion-chip :style="{ backgroundColor: tag.color }" @click="removeTagField('edit', tagIdx)">
                  <ion-label>{{ tag.name || 'Без имени' }}</ion-label>
                </ion-chip>
              </div>
              <ion-button size="small" shape="round" color="primary" @click="addNewTagField('edit')">
                <ion-icon slot="icon-only" :icon="addOutline"/>
              </ion-button>
            </div>
          </template>

          <div class="notes-card__actions">
            <ion-button shape="round" size="small" color="primary"
                        @click.stop="updateNote(section.notebookId, section.id)">
              <ion-icon slot="start" :icon="saveOutline"/>
              Сохранить
            </ion-button>
            <ion-button shape="round" size="small" fill="outline" color="danger" @click.stop="deleteNote(section.id)"
                        aria-label="Удалить">
              <ion-icon slot="icon-only" :icon="trashOutline"/>
            </ion-button>
          </div>
        </div>

        <div v-else class="notes-card__sheet-preview">
          <p class="notes-card__preview" v-html="renderMarkdown(section.noteText)"></p>
        </div>
      </article>

      <!-- Новая заметка -->
      <article v-if="isBlockExpanded === 'new'" class="notes-card notes-card--new">
        <h2 class="notes-card__title">Новая заметка</h2>
        <div class="notes-card__body">
          <ion-input
              v-model="newNoteName"
              label="Название"
              label-placement="floating"
              fill="outline"
              placeholder="Название заметки"
              class="new-note-input"
          />
          <ion-textarea
              v-model="newNoteText"
              label="Текст (Markdown)"
              label-placement="floating"
              fill="outline"
              placeholder="Текст заметки..."
              :auto-grow="true"
              class="new-note-text"
          />

          <div class="tags-block notes-card__tags-edit">
            <div v-for="(tag, tagIdx) in newTags" :key="tagIdx" class="tag-field">
              <ion-input v-model="tag.name" placeholder="Имя тега" fill="outline" class="tag-input"/>
              <input type="color" v-model="tag.color" class="tag-color-picker" aria-label="Цвет тега"/>
              <ion-chip :style="{ backgroundColor: tag.color }" @click="removeTagField('new', tagIdx)">
                <ion-label>{{ tag.name || 'Без имени' }}</ion-label>
                <ion-icon slot="end" :icon="trashOutline"/>
              </ion-chip>
            </div>
            <ion-button size="small" shape="round" color="primary" @click="addNewTagField('new')">
              <ion-icon slot="icon-only" :icon="addOutline"/>
            </ion-button>
          </div>

          <div class="notes-card__actions">
            <ion-button shape="round" size="small" color="primary" @click="addNote">
              <ion-icon slot="start" :icon="saveOutline"/>
              Сохранить
            </ion-button>
            <ion-button shape="round" size="small" fill="outline" color="danger" @click="isBlockExpanded = null">
              Отмена
            </ion-button>
          </div>
        </div>
      </article>
    </div>
  </div>

  <div class="add-new-button">
    <ion-button size="large" shape="round" color="secondary" @click="isBlockExpanded = 'new'">
      <ion-icon slot="icon-only" :icon="addOutline"/>
    </ion-button>
    <div class="files-open-button">
      <ion-button size="large" shape="round" color="secondary" @click="openFilesView">
        <ion-icon slot="icon-only" :icon="attachOutline"/>
      </ion-button>
    </div>
  </div>

</template>

<style scoped>
.notes-body {
  padding-bottom: max(60px, calc(52px + env(safe-area-inset-bottom, 0)));
}

.sectionHeader {
  color: var(--ion-color-light);
  font-size: 22px;
  font-weight: normal;
  margin-top: 10px;
  margin-bottom: 8px;
}

.note-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  align-content: start;
}

@media (min-width: 600px) {
  .note-list {
    grid-template-columns: repeat(3, 1fr);
  }
}

.notes-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: var(--ion-color-medium);
  color: var(--ion-color-light);
  border-radius: 12px;
  padding: 12px 14px;
  padding-left: 14px;
  overflow: hidden;
  min-height: 100px;
  max-height: 140px;
  transition: max-height 0.35s ease-out, box-shadow 0.2s ease, transform 0.2s ease;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.notes-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06);
}

.notes-card--expanded {
  grid-column: 1 / -1;
  max-height: 2000px;
  cursor: default;
  background-color: var(--ion-color-medium);
  color: var(--ion-color-light);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-radius: 16px;
  border: 1px solid transparent;
  min-height: 0;
}

.notes-card--new {
  grid-column: 1 / -1;
  max-height: none;
  min-height: 0;
  background-color: var(--ion-color-medium);
  color: var(--ion-color-light);
  animation: notesFadeIn 0.25s ease;
}

@keyframes notesFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.notes-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
}

.notes-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
  color: var(--ion-color-light);
  flex: 1;
  min-width: 0;
  outline: none;
}

.notes-card--expanded .notes-card__title {
  font-size: 16px;
}

.notes-card__title[contenteditable="true"] {
  cursor: text;
}

.notes-card__title[contenteditable="true"]:focus {
  color: var(--ion-color-primary);
}

.notes-card__tags-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}

.notes-card__tags-dots--expanded {
  margin-top: 4px;
  margin-bottom: 0;
}

.notes-card__sheet-preview {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  margin-top: 4px;
}

.notes-card__sheet-preview .notes-card__preview {
  flex: 1;
  min-height: 0;
}

.notes-card__tag-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.25);
}

.notes-card__tag {
  font-size: 12px;
  height: 24px;
}

.notes-card__preview {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--ion-color-light-shade);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.notes-card__preview :deep(p) {
  margin: 0 0 0.25em;
}

.notes-card__preview :deep(p:last-child) {
  margin-bottom: 0;
}

.notes-card__body {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--ion-color-medium-shade);
}

.notes-card__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 6px;
}

.notes-card__edit-btn {
  --padding-start: 6px;
  --padding-end: 6px;
  margin: 0;
}

.note-markdown {
  font-size: 14px;
  line-height: 1.5;
  color: var(--ion-color-light);
  word-break: break-word;
  min-width: 0;
  margin-bottom: 10px;
}

.note-markdown :deep(p) {
  margin: 0 0 0.5em;
}

.note-markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.note-markdown :deep(ul),
.note-markdown :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.25em;
}

.note-markdown :deep(h1) {
  font-size: 1.15em;
}

.note-markdown :deep(h2) {
  font-size: 1.05em;
}

.note-markdown :deep(h3) {
  font-size: 1em;
}

.notes-card__preview :deep(h1) {
  font-size: 1em;
}

.notes-card__preview :deep(h2) {
  font-size: 0.95em;
}

.notes-card__preview :deep(h3) {
  font-size: 0.9em;
}

.notes-card__textarea {
  width: 100%;
  min-height: 100px;
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: 12px;
  border: 1px solid var(--ion-color-medium-shade);
  background: var(--ion-color-medium-shade);
  color: var(--ion-color-light);
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  overflow: hidden;
  transition: height 0.2s ease;
  box-sizing: border-box;
}

.notes-card__textarea::placeholder {
  color: var(--ion-color-light-shade);
}

.notes-card__tags-edit {
  margin-bottom: 12px;
}

.tags-block {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tag-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-input {
  flex: 1;
  min-width: 80px;
  max-width: 140px;
}

.tag-color-picker {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 50%;
  padding: 0;
}

.notes-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

.notes-card__actions ion-button {
  --padding-start: 10px;
  --padding-end: 10px;
  margin: 0;
}

.new-note-input,
.new-note-text {
  margin-bottom: 12px;
}

.add-new-button {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
  padding-bottom: max(8px, env(safe-area-inset-bottom, 0));
  pointer-events: none;
  z-index: 20;
}

.files-open-button {
  position: fixed;
  bottom: 0;
  left: 0;
  background: transparent;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 8px 12px;
  padding-bottom: max(8px, env(safe-area-inset-bottom, 0));
  z-index: 21;
}

.add-new-button ion-button,
.files-open-button ion-button {
  pointer-events: auto;
}
</style>
