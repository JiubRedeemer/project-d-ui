<script setup lang="ts">
import {computed, onMounted, ref, watch} from "vue";
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
import {addOutline, attachOutline, chevronDownOutline, createOutline, saveOutline, trashOutline} from "ionicons/icons";

import {marked} from "marked";

marked.setOptions({
  breaks: true,
});

interface NoteTag {
  name: string;
  color: string;
}

interface NoteSection {
  id: string;
  notebookId?: string;
  name: string;
  noteText: string;
  tags?: NoteTag[];
}

const route = useRoute();
const ionRouter = useIonRouter();

const notes = ref<any[]>([]);
const notebook = ref<any | null>(null);
const isEditing = ref<string | null>(null);

const newNoteName = ref("");
const newNoteText = ref("");
const newTags = ref<NoteTag[]>([]);
const newTagDraftName = ref("");
const newTagDraftColor = ref("#8888ff");
const isNewTagComposerFocused = ref(false);

const editNoteName = ref("");
const editNoteText = ref("");
const editTags = ref<NoteTag[]>([]);
const editTagDraftName = ref("");
const editTagDraftColor = ref("#8888ff");
const isEditTagComposerFocused = ref(false);
const isEditTagsExpanded = ref(false);
const isNewTagsExpanded = ref(false);

const isBlockExpanded = ref<number | null>(null);
const inputSectionText = ref<string | null>(null);

const editingNoteId = ref<string | null>(null);
const isNotesHintExpanded = ref(false);

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

/** Уникальные пары имя+цвет из всех заметок — для быстрого выбора. */
const existingTagsCatalog = computed(() => {
  const byKey = new Map<string, NoteTag>();
  for (const note of notes.value) {
    for (const raw of note.tags ?? []) {
      const name = String(raw?.name ?? "").trim();
      if (!name) continue;
      const color = String(raw?.color ?? "").trim() || "#8888ff";
      const key = `${name.toLowerCase()}|${color.toLowerCase()}`;
      if (!byKey.has(key)) byKey.set(key, {name, color});
    }
  }
  return Array.from(byKey.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "ru", {sensitivity: "base"})
  );
});

function tagsEqual(a: NoteTag, b: NoteTag): boolean {
  return (
      a.name.trim().toLowerCase() === b.name.trim().toLowerCase() &&
      (a.color || "#8888ff").toLowerCase() === (b.color || "#8888ff").toLowerCase()
  );
}

function isTagInList(list: NoteTag[], tag: NoteTag): boolean {
  return list.some((t) => tagsEqual(t, tag));
}

function addExistingTag(target: "new" | "edit", tag: NoteTag) {
  const list = target === "new" ? newTags.value : editTags.value;
  if (isTagInList(list, tag)) return;
  list.push({name: tag.name, color: tag.color || "#8888ff"});
}

function addTagFromComposer(target: "new" | "edit") {
  const nameRef = target === "new" ? newTagDraftName : editTagDraftName;
  const colorRef = target === "new" ? newTagDraftColor : editTagDraftColor;
  const list = target === "new" ? newTags.value : editTags.value;

  const name = nameRef.value.trim();
  if (!name) return;

  const existingByName = existingTagsCatalog.value.find(
      (t) => t.name.trim().toLowerCase() === name.toLowerCase()
  );

  const nextTag: NoteTag = {
    name,
    color: existingByName?.color || colorRef.value || "#8888ff",
  };

  if (isTagInList(list, nextTag)) {
    nameRef.value = "";
    return;
  }

  list.push(nextTag);
  nameRef.value = "";
}

function onTagComposerFocus(target: "new" | "edit") {
  if (target === "new") isNewTagComposerFocused.value = true;
  else isEditTagComposerFocused.value = true;
}

function onTagComposerBlur(target: "new" | "edit") {
  window.setTimeout(() => {
    if (target === "new") isNewTagComposerFocused.value = false;
    else isEditTagComposerFocused.value = false;
  }, 150);
}

function selectTagSuggestion(target: "new" | "edit", tag: NoteTag) {
  addExistingTag(target, tag);
  if (target === "new") {
    newTagDraftName.value = "";
    newTagDraftColor.value = tag.color || "#8888ff";
    isNewTagComposerFocused.value = false;
  } else {
    editTagDraftName.value = "";
    editTagDraftColor.value = tag.color || "#8888ff";
    isEditTagComposerFocused.value = false;
  }
}

function getTagSuggestionStyle(color: string | undefined) {
  const base = color || "#8888ff";
  return {
    "--tag-accent": base,
    borderColor: `${base}55`,
    background: `linear-gradient(135deg, ${base}33 0%, ${base}14 100%)`,
  };
}

const getTagSuggestions = (target: "new" | "edit"): NoteTag[] => {
  const draftName = (target === "new" ? newTagDraftName.value : editTagDraftName.value)
      .trim()
      .toLowerCase();
  const selected = target === "new" ? newTags.value : editTags.value;

  return existingTagsCatalog.value
      .filter((tag) => {
        if (isTagInList(selected, tag)) return false;
        if (!draftName) return true;
        return tag.name.toLowerCase().includes(draftName);
      })
      .slice(0, 6);
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
    isBlockExpanded.value = null; // Закрываем все секции
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
    newTagDraftName.value = "";
    newTagDraftColor.value = "#8888ff";
    newTags.value.splice(0); // очищает reactive массив
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
    isEditing.value = null;
    isBlockExpanded.value = null; // Закрываем все секции
    toggleEditMode(null);
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
  isEditTagsExpanded.value = false;
  isEditTagComposerFocused.value = false;
};

watch(isBlockExpanded, (value) => {
  if (value === "new") {
    isNewTagsExpanded.value = false;
    isNewTagComposerFocused.value = false;
  }
});

const updateHeaderSectionText = (event: Event, section: NoteSection) => {
  const target = event.target as HTMLElement;
  editNoteText.value = section.noteText;
  editNoteName.value = target.innerText;
};

const autoGrow = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement;
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
  scrollToKeepCursorVisible(textarea);
};

// ── Keyboard avoidance ────────────────────────────────────────────────────

let vpResizeHandler: (() => void) | null = null;

// Height of the fixed bottom toolbar (add-new-button + safe area)
const TOOLBAR_H = 80;

function scrollToKeepCursorVisible(el: HTMLElement) {
  const vv = window.visualViewport;
  if (!vv) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  const rect = el.getBoundingClientRect();
  const visibleBottom = vv.offsetTop + vv.height - TOOLBAR_H;
  if (rect.bottom > visibleBottom) {
    const diff = rect.bottom - visibleBottom + 16;
    window.scrollBy({ top: diff, behavior: 'smooth' });
  }
}

function onTextareaFocus(e: FocusEvent) {
  const textarea = e.currentTarget as HTMLTextAreaElement;
  if (!window.visualViewport) return;
  vpResizeHandler = () => scrollToKeepCursorVisible(textarea);
  window.visualViewport.addEventListener('resize', vpResizeHandler);
  // initial scroll after keyboard animation (~300ms)
  setTimeout(() => scrollToKeepCursorVisible(textarea), 350);
}

function onTextareaBlur() {
  if (vpResizeHandler && window.visualViewport) {
    window.visualViewport.removeEventListener('resize', vpResizeHandler);
    vpResizeHandler = null;
  }
}

const getSheetAccentStyle = (section: NoteSection) => {
  const color = section.tags?.[0]?.color;
  if (!color) return {};
  return {borderLeftColor: color};
};

const newNoteCardRef = ref<HTMLElement | null>(null);
const noteArticleElById: Record<string, HTMLElement> = {};

const setNoteArticleRef = (el: Element | null, id: string) => {
  if (el) noteArticleElById[id] = el as HTMLElement;
  else delete noteArticleElById[id];
};

const pathTouchesRoot = (path: EventTarget[], root: HTMLElement | null): boolean =>
    Boolean(root && path.includes(root));

const onNotesViewOutsideClick = (e: MouseEvent) => {
  const path = e.composedPath() as EventTarget[];
  if (
      path.some(
          el =>
              el instanceof HTMLElement &&
              (el.classList.contains("add-new-button") || el.classList.contains("files-open-button"))
      )
  ) {
    return;
  }

  const exp = isBlockExpanded.value;
  if (exp === null) return;

  if (exp === "new") {
    if (pathTouchesRoot(path, newNoteCardRef.value)) return;
    void addNote();
    return;
  }

  const index = exp;
  const section = notes.value[index];
  if (!section) return;
  if (pathTouchesRoot(path, noteArticleElById[section.id])) return;

  void updateNote(section.notebookId, section.id);
};

</script>

<template>
  <div class="notes-view-root" @click="onNotesViewOutsideClick">
  <div class="notes-body">
    <h1 class="sectionHeader" v-if="notes.length > 0">Заметки</h1>
    <div
      class="notes-hint-card notes-hint-card--collapsible"
      :class="{ collapsed: !isNotesHintExpanded }"
      @click="!isNotesHintExpanded && (isNotesHintExpanded = true)"
    >
      <div class="notes-hint-header">
        <div class="notes-hint-title">Подсказка по кнопкам</div>
        <ion-button
          size="small"
          fill="clear"
          shape="round"
          class="notes-hint-toggle-button"
          @click.stop
          @click="isNotesHintExpanded = !isNotesHintExpanded"
        >
          <ion-icon
            slot="icon-only"
            class="notes-hint-toggle-button__icon"
            :class="{ 'notes-hint-toggle-button__icon--expanded': isNotesHintExpanded }"
            :icon="chevronDownOutline"
          ></ion-icon>
        </ion-button>
      </div>
      <div v-if="isNotesHintExpanded" class="notes-hint-items">
        <div class="notes-hint-item">
          <ion-button size="small" shape="round" color="secondary" class="notes-hint-icon-button" disabled>
            <ion-icon slot="icon-only" :icon="addOutline"/>
          </ion-button>
          <span>Добавить новую заметку</span>
        </div>
        <div class="notes-hint-item">
          <ion-button size="small" shape="round" color="secondary" class="notes-hint-icon-button" disabled>
            <ion-icon slot="icon-only" :icon="attachOutline"/>
          </ion-button>
          <span>Открыть файлы комнаты</span>
        </div>
        <div class="notes-hint-item">
          <ion-button fill="clear" size="small" class="notes-hint-icon-button notes-hint-icon-button--inline" disabled>
            <ion-icon slot="icon-only" :icon="createOutline"/>
          </ion-button>
          <span>Перейти в режим редактирования заметки</span>
        </div>
        <div class="notes-hint-item">
          <ion-button shape="round" size="small" color="primary" class="notes-hint-icon-button notes-hint-icon-button--inline" disabled>
            <ion-icon slot="icon-only" :icon="saveOutline"/>
          </ion-button>
          <span>Сохранить изменения</span>
        </div>
        <div class="notes-hint-item">
          <ion-button shape="round" size="small" fill="outline" color="danger" class="notes-hint-icon-button notes-hint-icon-button--inline" disabled>
            <ion-icon slot="icon-only" :icon="trashOutline"/>
          </ion-button>
          <span>Удалить заметку</span>
        </div>
      </div>
    </div>
    <div v-if="notes.length === 0" class="notes-hint-card notes-hint-card--cta">
      <div class="notes-hint-title">Как добавить первую заметку</div>
      <div class="notes-hint-items">
        <div class="notes-hint-item notes-hint-item--center">
          Нажмите кнопку <b>+</b> внизу экрана.
        </div>
      </div>
      <div class="notes-hint-arrow" aria-hidden="true">↓</div>
    </div>

    <div class="note-list">
      <article
          v-for="(section, index) in notes"
          :key="section.id"
          :ref="(el) => setNoteArticleRef(el as Element | null, section.id)"
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
            <span class="notes-card__toolbar-label">
              {{ editingNoteId === section.id ? "Режим редактирования" : "Режим чтения" }}
            </span>
            <ion-button
                fill="clear"
                size="small"
                class="notes-card__edit-btn"
                @click.stop="toggleEditMode(section)"
            >
              <ion-icon slot="start" :icon="createOutline"></ion-icon>
              {{ editingNoteId === section.id ? "Готово" : "Редактировать" }}
            </ion-button>
          </div>

          <div
              v-if="editingNoteId !== section.id"
              class="notes-card__markdown note-markdown"
              v-html="renderMarkdown(section.noteText)"
          />

          <template v-else>
            <div class="note-edit-surface">
              <textarea
                  v-model="editNoteText"
                  class="notes-card__textarea"
                  placeholder="Введите текст заметки (Markdown)..."
                  @input="autoGrow($event)"
                  @click="autoGrow($event)"
                  @focus="onTextareaFocus($event)"
                  @blur="onTextareaBlur"
              />

              <div
                  class="tags-spoiler"
                  :class="{ 'tags-spoiler--collapsed': !isEditTagsExpanded }"
                  @click.stop="!isEditTagsExpanded && (isEditTagsExpanded = true)"
              >
                <div class="tags-spoiler__header">
                  <div class="tags-spoiler__summary">
                    <div class="tags-spoiler__title-row">
                      <span class="tags-spoiler__title">Теги</span>
                      <span v-if="editTags.length" class="tags-spoiler__count">{{ editTags.length }}</span>
                    </div>
                    <div v-if="!isEditTagsExpanded && editTags.length" class="tags-spoiler__preview">
                      <span
                          v-for="(tag, previewIdx) in editTags.slice(0, 4)"
                          :key="'edit-tag-preview-' + previewIdx"
                          class="tags-spoiler__preview-chip"
                          :style="getTagSuggestionStyle(tag.color)"
                      >
                        {{ tag.name }}
                      </span>
                      <span v-if="editTags.length > 4" class="tags-spoiler__more">
                        +{{ editTags.length - 4 }}
                      </span>
                    </div>
                    <span v-else-if="!isEditTagsExpanded" class="tags-spoiler__hint">
                      Нажмите, чтобы добавить
                    </span>
                  </div>
                  <ion-button
                      size="small"
                      fill="clear"
                      shape="round"
                      class="tags-spoiler__toggle"
                      @click.stop
                      @click="isEditTagsExpanded = !isEditTagsExpanded"
                  >
                    <ion-icon
                        slot="icon-only"
                        class="tags-spoiler__toggle-icon"
                        :class="{ 'tags-spoiler__toggle-icon--expanded': isEditTagsExpanded }"
                        :icon="chevronDownOutline"
                    />
                  </ion-button>
                </div>

                <div v-if="isEditTagsExpanded" class="tags-spoiler__body notes-card__tags-edit tags-block">
                  <div class="tag-composer-block">
                    <div class="tag-composer">
                      <input
                          v-model="editTagDraftName"
                          class="tag-composer__name"
                          placeholder="Введите тег"
                          @focus="onTagComposerFocus('edit')"
                          @blur="onTagComposerBlur('edit')"
                          @keydown.enter.prevent="addTagFromComposer('edit')"
                      />
                      <input
                          type="color"
                          v-model="editTagDraftColor"
                          class="tag-color-picker"
                          aria-label="Цвет нового тега"
                      />
                      <ion-button size="small" shape="round" color="primary" @click="addTagFromComposer('edit')">
                        <ion-icon slot="start" :icon="addOutline"/>
                        Добавить
                      </ion-button>
                    </div>

                    <div
                        v-if="isEditTagComposerFocused && getTagSuggestions('edit').length"
                        class="tag-suggestions-panel"
                    >
                      <span class="tag-suggestions-panel__label">Подсказки</span>
                      <div class="tag-suggestions">
                        <button
                            v-for="(suggestion, idx) in getTagSuggestions('edit')"
                            :key="'edit-suggestion-' + idx"
                            type="button"
                            class="tag-suggestion-chip"
                            :style="getTagSuggestionStyle(suggestion.color)"
                            @mousedown.prevent
                            @click="selectTagSuggestion('edit', suggestion)"
                        >
                          <span class="tag-suggestion-chip__dot" :style="{ backgroundColor: suggestion.color || '#8888ff' }"/>
                          <span class="tag-suggestion-chip__label">{{ suggestion.name }}</span>
                        </button>
                      </div>
                    </div>
                  </div>

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
                    <div class="tag-preview" :style="{ backgroundColor: tag.color }">
                      {{ tag.name || "Без имени" }}
                    </div>
                    <ion-button
                        fill="clear"
                        size="small"
                        color="danger"
                        class="tag-remove-btn"
                        @click="removeTagField('edit', tagIdx)"
                    >
                      <ion-icon slot="icon-only" :icon="trashOutline"/>
                    </ion-button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div class="notes-card__actions">
            <ion-button shape="round" size="small" fill="outline" color="danger" @click.stop="deleteNote(section.id)"
                        aria-label="Удалить">
              <ion-icon slot="icon-only" :icon="trashOutline"/>
            </ion-button>
            <ion-button shape="round" size="small" color="primary"
                        @click.stop="updateNote(section.notebookId, section.id)">
              <ion-icon slot="start" :icon="saveOutline"/>
              Сохранить
            </ion-button>
          </div>
        </div>

        <div v-else class="notes-card__sheet-preview">
          <p class="notes-card__preview" v-html="renderMarkdown(section.noteText)"></p>
        </div>
      </article>

      <!-- Новая заметка -->
      <article ref="newNoteCardRef" v-if="isBlockExpanded === 'new'" class="notes-card notes-card--new">
        <h2 class="notes-card__title">Новая заметка</h2>
        <div class="notes-card__body">
          <div class="note-edit-surface">
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

            <div
                class="tags-spoiler"
                :class="{ 'tags-spoiler--collapsed': !isNewTagsExpanded }"
                @click.stop="!isNewTagsExpanded && (isNewTagsExpanded = true)"
            >
              <div class="tags-spoiler__header">
                <div class="tags-spoiler__summary">
                  <div class="tags-spoiler__title-row">
                    <span class="tags-spoiler__title">Теги</span>
                    <span v-if="newTags.length" class="tags-spoiler__count">{{ newTags.length }}</span>
                  </div>
                  <div v-if="!isNewTagsExpanded && newTags.length" class="tags-spoiler__preview">
                    <span
                        v-for="(tag, previewIdx) in newTags.slice(0, 4)"
                        :key="'new-tag-preview-' + previewIdx"
                        class="tags-spoiler__preview-chip"
                        :style="getTagSuggestionStyle(tag.color)"
                    >
                      {{ tag.name }}
                    </span>
                    <span v-if="newTags.length > 4" class="tags-spoiler__more">
                      +{{ newTags.length - 4 }}
                    </span>
                  </div>
                  <span v-else-if="!isNewTagsExpanded" class="tags-spoiler__hint">
                    Нажмите, чтобы добавить
                  </span>
                </div>
                <ion-button
                    size="small"
                    fill="clear"
                    shape="round"
                    class="tags-spoiler__toggle"
                    @click.stop
                    @click="isNewTagsExpanded = !isNewTagsExpanded"
                >
                  <ion-icon
                      slot="icon-only"
                      class="tags-spoiler__toggle-icon"
                      :class="{ 'tags-spoiler__toggle-icon--expanded': isNewTagsExpanded }"
                      :icon="chevronDownOutline"
                  />
                </ion-button>
              </div>

              <div v-if="isNewTagsExpanded" class="tags-spoiler__body tags-block notes-card__tags-edit">
                <div class="tag-composer-block">
                  <div class="tag-composer">
                    <input
                        v-model="newTagDraftName"
                        class="tag-composer__name"
                        placeholder="Введите тег"
                        @focus="onTagComposerFocus('new')"
                        @blur="onTagComposerBlur('new')"
                        @keydown.enter.prevent="addTagFromComposer('new')"
                    />
                    <input
                        type="color"
                        v-model="newTagDraftColor"
                        class="tag-color-picker"
                        aria-label="Цвет нового тега"
                    />
                    <ion-button size="small" shape="round" color="primary" @click="addTagFromComposer('new')">
                      <ion-icon slot="start" :icon="addOutline"/>
                      Добавить
                    </ion-button>
                  </div>

                  <div
                      v-if="isNewTagComposerFocused && getTagSuggestions('new').length"
                      class="tag-suggestions-panel"
                  >
                    <span class="tag-suggestions-panel__label">Подсказки</span>
                    <div class="tag-suggestions">
                      <button
                          v-for="(suggestion, idx) in getTagSuggestions('new')"
                          :key="'new-suggestion-' + idx"
                          type="button"
                          class="tag-suggestion-chip"
                          :style="getTagSuggestionStyle(suggestion.color)"
                          @mousedown.prevent
                          @click="selectTagSuggestion('new', suggestion)"
                      >
                        <span class="tag-suggestion-chip__dot" :style="{ backgroundColor: suggestion.color || '#8888ff' }"/>
                        <span class="tag-suggestion-chip__label">{{ suggestion.name }}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div v-for="(tag, tagIdx) in newTags" :key="tagIdx" class="tag-field">
                  <ion-input v-model="tag.name" placeholder="Имя тега" fill="outline" class="tag-input"/>
                  <input type="color" v-model="tag.color" class="tag-color-picker" aria-label="Цвет тега"/>
                  <div class="tag-preview" :style="{ backgroundColor: tag.color }">
                    {{ tag.name || "Без имени" }}
                  </div>
                  <ion-button
                      fill="clear"
                      size="small"
                      color="danger"
                      class="tag-remove-btn"
                      @click="removeTagField('new', tagIdx)"
                  >
                    <ion-icon slot="icon-only" :icon="trashOutline"/>
                  </ion-button>
                </div>
              </div>
            </div>
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
  </div>

</template>

<style scoped>
.notes-body {
  min-height: 90vh;
  padding-bottom: max(100px, calc(80px + env(safe-area-inset-bottom, 0)));
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

.notes-hint-card {
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 14px;
  background:
    radial-gradient(circle at 20% 15%, rgba(var(--ion-color-primary-rgb), 0.16), rgba(var(--ion-color-primary-rgb), 0) 45%),
    linear-gradient(180deg, rgba(var(--ion-color-medium-rgb), 0.48), rgba(var(--ion-color-medium-rgb), 0.32));
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.22);
}

.notes-hint-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.notes-hint-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.notes-hint-toggle-button {
  --background: var(--ion-color-medium-shade);
  --background-hover: var(--ion-color-medium-shade);
  --background-activated: var(--ion-color-medium-shade);
  --background-focused: var(--ion-color-medium-shade);
  --padding-start: 0;
  --padding-end: 0;
  --border-radius: 999px;
  width: 28px;
  min-width: 28px;
  height: 28px;
  min-height: 28px;
  margin: 0;
}

.notes-hint-toggle-button__icon {
  width: 14px;
  height: 14px;
  color: rgba(var(--ion-color-light-rgb), 0.7);
  transition: transform 0.3s ease, color 0.3s ease;
}

.notes-hint-toggle-button__icon--expanded {
  transform: rotate(180deg);
  color: var(--ion-color-primary);
}

.notes-hint-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.notes-hint-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ion-color-light);
  opacity: 0.95;
}

.notes-hint-icon-button {
  --opacity: 1;
  margin: 0;
  min-height: 28px;
}

.notes-hint-icon-button[disabled] {
  opacity: 1;
}

.notes-hint-icon-button--inline {
  min-height: 24px;
}

.notes-hint-card--collapsible.collapsed {
  padding: 6px 10px;
}

.notes-hint-card--cta {
  animation: notesHintPulse 2.2s ease-in-out infinite;
}

.notes-hint-item--center {
  justify-content: center;
  text-align: center;
}

.notes-hint-arrow {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: rgba(var(--ion-color-primary-rgb), 0.95);
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  text-align: center;
  animation: notesHintArrowBounce 1.2s ease-in-out infinite;
}

@keyframes notesHintArrowBounce {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.85;
  }
  50% {
    transform: translateY(6px);
    opacity: 1;
  }
}

@keyframes notesHintPulse {
  0%, 100% {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
    border-color: rgba(var(--ion-color-primary-rgb), 0.22);
  }
  50% {
    box-shadow: 0 10px 24px rgba(var(--ion-color-primary-rgb), 0.28);
    border-color: rgba(var(--ion-color-primary-rgb), 0.5);
  }
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
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 8px;
}

.notes-card__toolbar-label {
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.68);
  line-height: 1.2;
}

.note-edit-surface {
  padding: 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 10px;
}

.notes-card__edit-btn {
  --padding-start: 10px;
  --padding-end: 10px;
  margin: 0;
  text-transform: none;
  letter-spacing: 0;
}

.notes-card__edit-btn ion-icon {
  margin-right: 4px;
}

.note-markdown {
  font-size: 14px;
  line-height: 1.5;
  color: var(--ion-color-light);
  word-break: break-word;
  min-width: 0;
  margin-bottom: 0;
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
  min-height: 120px;
  padding: 12px 14px;
  margin-bottom: 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
  background: rgba(0, 0, 0, 0.22);
  color: var(--ion-color-light);
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  overflow: hidden;
  transition: height 0.2s ease;
  box-sizing: border-box;
}

.notes-card__textarea::placeholder {
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.notes-card__tags-edit {
  margin-bottom: 4px;
}

.existing-tags-block {
  margin-bottom: 12px;
  padding: 10px 10px 8px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.tag-field {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 38px auto 32px;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.tag-input {
  min-width: 0;
}

.tag-preview {
  min-width: 74px;
  max-width: 180px;
  height: 32px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag-color-picker {
  width: 38px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 8px;
  padding: 0;
}

.tag-remove-btn {
  margin: 0;
  --padding-start: 0;
  --padding-end: 0;
}

.existing-tags-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ion-color-light-shade);
  margin-bottom: 8px;
}

.existing-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.existing-tag-chip {
  cursor: pointer;
  font-size: 12px;
  height: 28px;
  margin: 0;
  --background: transparent;
  opacity: 1;
  transition: opacity 0.15s ease, transform 0.12s ease;
}

.existing-tag-chip:active {
  transform: scale(0.97);
}

.existing-tag-chip--added {
  opacity: 0.42;
  cursor: default;
  pointer-events: none;
}

.tags-spoiler {
  margin-top: 10px;
  border-radius: 12px;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.14);
  background: rgba(0, 0, 0, 0.14);
  overflow: hidden;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.tags-spoiler--collapsed {
  cursor: pointer;
}

.tags-spoiler--collapsed:hover {
  border-color: rgba(var(--ion-color-primary-rgb), 0.28);
  background: rgba(0, 0, 0, 0.2);
}

.tags-spoiler__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
}

.tags-spoiler--collapsed .tags-spoiler__header {
  padding: 8px 10px;
}

.tags-spoiler__summary {
  flex: 1;
  min-width: 0;
}

.tags-spoiler__title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tags-spoiler__title {
  font-size: 13px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.tags-spoiler__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.22);
  color: var(--ion-color-primary);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.tags-spoiler__hint {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.tags-spoiler__preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.tags-spoiler__preview-chip {
  display: inline-block;
  max-width: 120px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ion-color-light);
}

.tags-spoiler__more {
  display: inline-flex;
  align-items: center;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(var(--ion-color-light-rgb), 0.08);
  color: rgba(var(--ion-color-light-rgb), 0.65);
  font-size: 11px;
  font-weight: 600;
}

.tags-spoiler__toggle {
  --background: var(--ion-color-medium-shade);
  --background-hover: var(--ion-color-medium-shade);
  --background-activated: var(--ion-color-medium-shade);
  --background-focused: var(--ion-color-medium-shade);
  --padding-start: 0;
  --padding-end: 0;
  --border-radius: 999px;
  width: 28px;
  min-width: 28px;
  height: 28px;
  min-height: 28px;
  margin: 0;
  flex-shrink: 0;
}

.tags-spoiler__toggle-icon {
  width: 14px;
  height: 14px;
  color: rgba(var(--ion-color-light-rgb), 0.7);
  transition: transform 0.3s ease, color 0.3s ease;
}

.tags-spoiler__toggle-icon--expanded {
  transform: rotate(180deg);
  color: var(--ion-color-primary);
}

.tags-spoiler__body {
  padding: 10px 10px 10px;
  border-top: 1px solid rgba(var(--ion-color-light-rgb), 0.06);
}

.tags-block {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.tag-composer-block {
  margin-bottom: 8px;
}

.tag-composer {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) 38px auto;
  align-items: center;
  gap: 8px;
}

.tag-composer__name {
  width: 100%;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.14);
  background: rgba(0, 0, 0, 0.22);
  color: var(--ion-color-light);
  padding: 0 10px;
  font-size: 13px;
  line-height: 1.2;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.tag-composer__name:focus {
  border-color: rgba(var(--ion-color-primary-rgb), 0.55);
  box-shadow: 0 0 0 2px rgba(var(--ion-color-primary-rgb), 0.18);
}

.tag-composer__name::placeholder {
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.tag-suggestions-panel {
  margin-top: 8px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.14);
}

.tag-suggestions-panel__label {
  display: block;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-suggestion-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  color: var(--ion-color-light);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
}

.tag-suggestion-chip:active {
  transform: scale(0.97);
}

.tag-suggestion-chip:hover {
  filter: brightness(1.08);
  box-shadow: 0 2px 10px color-mix(in srgb, var(--tag-accent) 35%, transparent);
}

.tag-suggestion-chip__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.18);
}

.tag-suggestion-chip__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.notes-card__actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
}

.notes-card__actions ion-button {
  text-transform: none;
  letter-spacing: 0;
  --padding-start: 12px;
  --padding-end: 12px;
  --border-radius: 12px;
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
  right: 0;
  background: transparent;
  display: flex;
  justify-content: flex-end;
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
