<script setup lang="ts">
import {onMounted, ref} from "vue";
import {useRoute} from "vue-router";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {IonButton, IonButtons, IonChip, IonIcon, IonLabel, IonTextarea, IonInput} from "@ionic/vue";
import {addOutline, createOutline, saveOutline, trashOutline} from "ionicons/icons";

import {marked} from "marked";

marked.setOptions({
  breaks: true, // переносы строк сохраняются
});

const route = useRoute();

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

const toggleEditMode = (section) => {
  if (editingNoteId.value === section.id) {
    section.noteText = editNoteText.value; // сохраняем как текст
    editingNoteId.value = null;
  } else {
    editNoteText.value = section.noteText; // копируем текст
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
    console.log(notebook)
    console.log(notes.value)
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
const addNote = async () => {
  try {
    const roomId = route.params.roomId as string;
    const characterId = route.params.characterId as string;

    const noteDto = {
      name: newNoteName.value,
      noteText: newNoteText.value,
      tags: newTags.value.filter(t => t.name.trim() !== ""),
    };

    console.log(noteDto)
    console.log("newTags.value:", JSON.stringify(newTags.value || newTags));

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
      tags: editTags.value.filter(t => t.name),
    };
    console.log(noteDto)
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

onMounted(() => {
  loadNotebook();
});

const expandBlock = (noteNumber: number, section) => {
  isBlockExpanded.value = noteNumber;
  inputSectionText.value = notes.value[noteNumber];
  editNoteName.value = section.name;
  editNoteText.value = section.noteText;
  editTags.value = section.tags
  editTags.value = section.tags ? JSON.parse(JSON.stringify(section.tags)) : [];

};

const updateInputSectionText = (event: Event, section) => {
  const target = event.target as HTMLElement;
  editNoteText.value = target.innerText;
  editNoteName.value = section.name;
};
const updateHeaderSectionText = (event: Event, section) => {
  const target = event.target as HTMLElement;
  editNoteText.value = section.noteText;
  editNoteName.value = target.innerText;
};

const autoGrow = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement;
  textarea.style.height = "auto"; // сброс высоты
  textarea.style.height = textarea.scrollHeight + "px"; // подгон под содержимое
};

</script>

<template>
  <div>
    <!-- Список заметок -->
    <div
        v-for="(section, index) in notes"
        :key="section.id"
        :class="{ expand: isBlockExpanded === index }"
        class="section"
        v-show="isBlockExpanded === null || isBlockExpanded === index"
        @click.stop="expandBlock(index, section)"
    >
      <h1 class="sectionHeader"
          contenteditable="true"
          @input="updateHeaderSectionText($event, section)"
      >{{ section.name }}:</h1>

      <!-- Текст заметки -->
      <div v-if="isBlockExpanded === index" class="note-text-container">
        <!-- Кнопка включения режима редактирования -->
        <ion-button
            color="medium"
            class="edit-toggle-btn"
            size="small"
            @click.stop="toggleEditMode(section)"
        >
          <ion-icon :icon="createOutline"></ion-icon>
        </ion-button>

        <!-- Отображение markdown -->
        <div
            v-if="editingNoteId !== section.id"
            class="note-markdown"
            v-html="renderMarkdown(section.noteText)"
        ></div>

        <!-- Режим редактирования -->
        <textarea
            v-else
            v-model="editNoteText"
            class="note-edit-textarea"
            placeholder="Введите текст заметки..."
            @input="autoGrow($event)"
            @click="autoGrow($event)"
            ref="editTextArea"
        ></textarea>
        <div class="tags-block" v-if="editingNoteId === section.id" @click.stop>
          <div
              v-for="(tag, index) in editTags"
              :key="index"
              class="tag-field"
          >
            <ion-input
                placeholder="Имя тега"
                :value="tag.name"
                @ionInput="(e) => tag.name = e.detail.value"
                class="tag-input"
            ></ion-input>

            <input
                type="color"
                :value="tag.color"
                @input="(e) => tag.color = e.target.value"
                class="tag-color-picker"
            />

            <ion-chip :style="{ backgroundColor: tag.color }" @click.stop="removeTagField('edit', index)">
              <ion-label>{{ tag.name || "Без имени" }}</ion-label>
            </ion-chip>
          </div>

          <ion-button
              size="small"
              shape="round"
              color="primary"
              @click.stop="addNewTagField('edit')"
          >
            <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
          </ion-button>
        </div>
      </div>

      <!-- Когда заметка свернута -->
      <p
          v-else
          class="note-collapsed-text"
          v-html="renderMarkdown(section.noteText)"
      ></p>

      <div
          v-if="section.tags && section.tags.length"
          :class="[
    'note-tags',
    isBlockExpanded === index ? 'expanded-tags' : 'collapsed-tags'
  ]"
      >
        <!-- Если заметка раскрыта -->
        <template v-if="isBlockExpanded === index">
          <ion-chip
              v-for="(tag, tIndex) in section.tags"
              :key="tIndex"
              :style="{ backgroundColor: tag.color || '#8888ff', color: '#fff' }"
              class="note-tag-chip"
          >
            <ion-label>{{ tag.name }}</ion-label>
          </ion-chip>
        </template>

        <!-- Если заметка свернута -->
        <template v-else>
          <div
              v-for="(tag, tIndex) in section.tags.slice(0, 5)"
              :key="tIndex"
              class="tag-dot"
              :style="{ backgroundColor: tag.color || '#8888ff' }"></div>
        </template>
      </div>

      <ion-buttons slot="end" class="sectionButtons" v-if="isBlockExpanded === index">
        <ion-button color="success" @click.stop="updateNote(section.notebookId, section.id)">
          <ion-icon slot="icon-only" :icon="saveOutline"></ion-icon>
        </ion-button>
        <ion-button color="danger" @click.stop="deleteNote(section.id)">
          <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </div>

    <!-- Блок добавления новой заметки -->
    <div class="new-note-section" v-if="isBlockExpanded === 'new'">
      <h2>Новая заметка</h2>
      <ion-input
          placeholder="Название заметки"
          :value="newNoteName"
          @input="(e) => newNoteName = e.target.value"
          class="new-note-input"
      ></ion-input>

      <ion-textarea
          placeholder="Текст заметки (поддерживается Markdown)"
          :value="newNoteText"
          @input="(e) => newNoteText = e.target.value"
          autoGrow
          class="new-note-text"
      ></ion-textarea>

      <div class="tags-block">
        <div
            v-for="(tag, index) in newTags"
            :key="index"
            class="tag-field"
        >
          <ion-input
              placeholder="Имя тега"
              :value="tag.name"
              @ionInput="(e) => tag.name = e.detail.value"
              class="tag-input"
          ></ion-input>

          <input
              type="color"
              :value="tag.color"
              @input="(e) => tag.color = e.target.value"
              class="tag-color-picker"
          />

          <ion-chip :style="{ backgroundColor: tag.color }">
            <ion-label>{{ tag.name || "Без имени" }}</ion-label>
            <ion-icon
                slot="end"
                :icon="trashOutline"
                @click.stop="removeTagField('new', index)"
            ></ion-icon>
          </ion-chip>
        </div>

        <ion-button
            size="small"
            shape="round"
            color="primary"
            @click.stop="addNewTagField('new')"
        >
          <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
        </ion-button>
      </div>

      <ion-buttons class="sectionButtons">
        <ion-button color="success" @click="addNote">
          <ion-icon slot="start" :icon="saveOutline"></ion-icon>
          Сохранить
        </ion-button>
        <ion-button color="primary" @click="isBlockExpanded = null">
          Отмена
        </ion-button>
      </ion-buttons>
    </div>

    <!-- Кнопка "Добавить заметку" -->
    <div class="add-note-button">
      <ion-button
          expand="block"
          shape="round"
          color="primary"
          @click="isBlockExpanded = 'new'"
      >
        <ion-icon slot="start" :icon="addOutline"></ion-icon>
        Добавить заметку
      </ion-button>
    </div>
  </div>
</template>

<style scoped>

.section {
  position: relative;
  margin-top: 20px;
  background-color: var(--ion-color-medium);
  border-radius: 15px;
  padding: 10px;
  overflow: hidden;
  max-height: 130px;
  transition: max-height 0.4s ease;
}

.section.expand {
  height: fit-content;
  max-height: 10000px;
  transition: max-height 4s ease;
}

.section h1 {
  font-size: 16pt; /* Размер для h1 */
}

.section h2 {
  font-size: 14pt; /* Размер для h2 */
}

.section h3 {
  font-size: 12pt; /* Размер для h3 */
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
  margin-top: 0;
  color: var(--ion-color-light);
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

.add-note-button {
  margin-top: 30px;
  display: flex;
  justify-content: center;
}

.new-note-section {
  margin-top: 20px;
  padding: 15px;
  border-radius: 15px;
  background-color: var(--ion-color-medium);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.3s ease;
}

.new-note-input,
.new-note-text {
  margin-bottom: 15px;
  border-radius: 10px;
  background: var(--ion-color-medium-shade);
  border: var(--ion-color-light);
  padding: 10px;
  display: flex;
  align-content: center;
  justify-content: center;
}

.tags-block {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.tag-field {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tag-input {
  flex: 1;
}

.tag-color-picker {
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 50%;

}

.sectionButtons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Когда заметка не раскрыта — кружочки в углу */
.collapsed-tags {
  position: absolute;
  top: 8px;
  right: 8px;
  justify-content: flex-end;
  gap: 4px;
}

/* Маленькие цветные кружки */
.tag-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
}

/* Когда заметка раскрыта — теги под текстом */
.expanded-tags {
  margin-top: 8px;
  justify-content: flex-start;
}

.note-tag-chip {
  font-size: 0.9rem;
  padding: 0 8px;
  border-radius: 12px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.note-text-container {
  position: relative;
  margin-top: 10px;
}

.edit-toggle-btn {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  --padding-start: 4px;
  --padding-end: 4px;
  --border-radius: 8px;
}

.note-markdown {
  padding-right: 35px; /* чтобы не налезала кнопка */
  white-space: pre-wrap;
}

.note-edit-textarea {
  width: 100%;
  min-height: 100px;
  resize: none;
  overflow: hidden;
  border-radius: 10px;
  padding: 10px;
  background: var(--ion-color-medium);
  color: var(--ion-color-light);
  border: 1px solid var(--ion-color-medium-shade);
  font-size: 14px;
  line-height: 1.4;
  transition: height 0.2s ease;
  white-space: pre-wrap;
}

.note-collapsed-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
