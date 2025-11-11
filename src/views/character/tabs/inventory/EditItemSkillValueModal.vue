<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea
} from "@ionic/vue";
import {onBeforeMount, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {add, closeCircleOutline, pencilOutline, saveOutline, trashOutline} from "ionicons/icons";
import {useCharacterStore} from "@/stores/CharacterStore";
import type {ItemSkill} from "@/components/models/response/InventoryResponse";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import axios from "axios";
import {v4 as uuidv4} from "uuid";

const route = useRoute();
const characterStore = useCharacterStore();

const props = defineProps<{
  itemSkill: ItemSkill | undefined;
  characterId: string;
  isOpen: boolean;
  isEditing: boolean;
  isReadOnly: boolean;
}>();

const emit = defineEmits<{
  (e: "closeEditItemSkillModal"): void;
  (e: "saveItemSkill", skill: ItemSkill): void;
  (e: "deleteItemSkill", skillId: string): void;
}>();

const isEditing = ref(props.isEditing);
let editableSkill = ref<ItemSkill>({...props.itemSkill});

onBeforeMount(() => {
  if (!editableSkill.value.name || (!editableSkill.value.name.rus && !editableSkill.value.name.eng)) {
    editableSkill = ref<ItemSkill>({
      id: uuidv4(),
      itemId: "",
      name: {rus: "", eng: ""},
      castTime: "",
      distance: "",
      description: "",
      shortDescription: "",
      charges: 0,
      chargesRefill: "LONG_REST",
      imgUrl: ""
    });
  }
})
watch(
    () => props.itemSkill,
    (newValue) => {
      editableSkill.value = {...newValue};
    },
    {deep: true}
);

function closeModal() {
  emit("closeEditItemSkillModal");
  isEditing.value = false;
}

function editSkill() {
  isEditing.value = !isEditing.value;
}

async function onSubmit() {
  emit("saveItemSkill", editableSkill.value);
  isEditing.value = false;
  closeModal();
}

async function deleteSkill() {
  emit("deleteItemSkill", editableSkill.value.id);
  closeModal();
}

const fileInput = ref<HTMLInputElement | null>(null);
const previewImage = ref<string | null>(null);
const avatarImage = ref<File | null>(null);
const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff", "image/svg+xml"];
const filePath = ref<string>("");
const triggerFileInput = () => {
  if (isEditing.value) {
    fileInput.value?.click();
  }
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
    editableSkill.value.imgUrl = filePath.value;
  } else {
    alert("Формат файла не поддерживается. Разрешены: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG.");
  }
};

const uploadToMinio = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userFilename", editableSkill.value.id);
  const res = await axios.put(
      `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.skills_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
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
  <ion-modal
      :is-open="props.isOpen"
      @didDismiss="closeModal"
      :initial-breakpoint="1"
      :breakpoints="[0, 0.5, 1]"
  >
    <div class="block">
      <div class="header">
        <div class="name">
          {{ editableSkill.name.rus }}
        </div>
        <div class="image" @click="triggerFileInput">
          <img v-if="previewImage" :src="previewImage" class="item-skill-image" alt="Item's Skill Image"/>
          <img v-else-if="editableSkill.imgUrl" :src="FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                 FILE_STORAGE_INTEGRATION_ROUTES.api +
                 FILE_STORAGE_INTEGRATION_ROUTES.skills_images_bucket +
                 FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + editableSkill.imgUrl"
               class="item-skill-image" alt="avatar"/>
          <div v-else-if="isEditing" class="avatar-img">
            <ion-icon :icon="add" class="placeholder-icon"></ion-icon>
          </div>
          <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" style="display: none;"/>
        </div>
      </div>

      <div class="body-block">
        <div class="stats">
          <div class="block-name">Умение</div>
          <div class="stats-grid">
            <div v-if="isEditing" class="stat">
              <div class="stat-name">Название</div>
              <ion-input
                  v-if="isEditing"
                  v-model="editableSkill.name.rus"
                  placeholder="Введите название"
                  :maxlength="64"
              />
              <div v-else class="stat-value">{{ editableSkill.name.rus }}</div>
            </div>

            <div class="stat">
              <div class="stat-name">Время применения</div>

              <ion-item v-if="isEditing" lines="none">
                <ion-select
                    interface="popover"
                    placeholder="Выберите время"
                    v-model="editableSkill.castTime"
                >
                  <ion-select-option value="1 действие">1 действие</ion-select-option>
                  <ion-select-option value="1 бонусное действие">1 бонусное действие</ion-select-option>
                  <ion-select-option value="1 реакция">1 реакция</ion-select-option>
                  <ion-select-option value="1 минута">1 минута</ion-select-option>
                  <ion-select-option value="10 минут">10 минут</ion-select-option>
                  <ion-select-option value="1 час">1 час</ion-select-option>
                  <ion-select-option value="8 часов">8 часов</ion-select-option>
                  <ion-select-option value="1 день">1 день</ion-select-option>
                  <ion-select-option value="Особое">Особое</ion-select-option>
                </ion-select>
              </ion-item>

              <div v-else class="stat-value">{{ editableSkill.castTime }}</div>
            </div>

            <div class="stat">
              <div class="stat-name">Дистанция</div>
              <ion-input
                  v-if="isEditing"
                  v-model="editableSkill.distance"
                  placeholder="Напр. 150 футов"
                  :maxlength="64"
              />
              <div v-else class="stat-value">{{ editableSkill.distance }}</div>
            </div>

            <div class="stat">
              <div class="stat-name">Краткое описание</div>
              <ion-input
                  v-if="isEditing"
                  v-model="editableSkill.shortDescription"
                  placeholder="Введите краткое описание"
                  :maxlength="64"
              />
              <ion-text v-else class="stat-value">
                {{ editableSkill.shortDescription }}
              </ion-text>
            </div>

            <div class="stat">
              <div class="stat-name">Зарядов</div>
              <ion-input
                  v-if="isEditing"
                  type="number"
                  v-model.number="editableSkill.charges"
                  placeholder="Напр. 3"
                  :maxlength="64"
              />
              <div v-else class="stat-value">{{ editableSkill.charges }}</div>

              <div v-if="isEditing" class="charges-radio">
                <ion-radio-group v-model="editableSkill.chargesRefill">
                  <ion-item lines="none">
                    <ion-label>Короткий отдых</ion-label>
                    <ion-radio value="SHORT_REST"></ion-radio>
                  </ion-item>
                  <ion-item lines="none">
                    <ion-label>Долгий отдых</ion-label>
                    <ion-radio value="LONG_REST"></ion-radio>
                  </ion-item>
                </ion-radio-group>
              </div>

              <div v-else class="stat-subvalue">
                (восстанавливается после
                {{
                  editableSkill.chargesRefill === "SHORT_REST"
                      ? "короткого отдыха"
                      : "долгого отдыха"
                }})
              </div>
            </div>
          </div>
        </div>

        <div class="description">
          <div class="block-name">Описание</div>
          <ion-textarea
              :readonly="!isEditing"
              rows="6"
              v-model="editableSkill.description"
              class="block-value"
          ></ion-textarea>
        </div>
      </div>

      <div class="footer">
        <ion-buttons>
          <ion-button
              size="default"
              fill="solid"
              shape="round"
              color="primary"
              @click="closeModal"
          >
            <ion-icon slot="start" :icon="closeCircleOutline" color="dark"/>
            Закрыть
          </ion-button>

          <div class="small-buttons">
            <ion-button
                v-if="!isReadOnly"
                size="small"
                fill="solid"
                shape="round"
                color="danger"
                @click="deleteSkill"
            >
              <ion-icon slot="icon-only" :icon="trashOutline" color="dark"/>
            </ion-button>

            <ion-button
                v-if="!isReadOnly"
                size="small"
                fill="solid"
                shape="round"
                color="secondary"
                @click="editSkill"
            >
              <ion-icon slot="icon-only" :icon="pencilOutline" color="dark"/>
            </ion-button>
          </div>

          <ion-button
              v-if="!isReadOnly"
              size="default"
              fill="solid"
              shape="round"
              color="primary"
              @click="onSubmit"
              :disabled="!isEditing"
          >
            <ion-icon slot="start" :icon="saveOutline" color="dark"/>
            Сохранить
          </ion-button>
        </ion-buttons>
      </div>
    </div>
  </ion-modal>
</template>

<style scoped>
.block {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 1.2rem;
  font-weight: 600;
}

.stats {
  background: var(--ion-color-medium);
  border-radius: 10px;
  padding: 10px;
  margin: 5px 5px 10px;
}

.description {
  background: var(--ion-color-medium);
  border-radius: 10px;
  margin: 5px;
  padding: 10px;
}

.block-name {
  margin-top: 10px;
  margin-bottom: 15px;
  font-weight: 500;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 5%;
  width: 100%;
}

.stat {
  display: flex;
  flex-direction: column;
  max-width: 170px;
}

.stat-name {
  color: var(--ion-color-light);
  opacity: 60%;
}

.stat-value {
  font-weight: 500;
  color: white;
  overflow: scroll;
  max-height: 100px;
}

.stat-subvalue {
  color: var(--ion-color-light);
  font-size: 0.8rem;
  margin-top: 4px;
}

.charges-radio {
  margin-top: 5px;
}

.header {
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.image {
  margin-top: 10px;
}

.footer {
  display: flex;
  justify-content: center;
  margin: 10px 0;
}

.small-buttons {
  margin: 0 20px;
}

ion-modal {
  --border-radius: 10px;
  --height: auto;
  --background: var(--ion-color-medium-shade);
}

.item-skill-image {
  border-radius: 10px;
  border: 1px solid var(--ion-color-primary);
  width: 55px;
  height: 55px;
  align-content: center;
  justify-content: center;
  display: flex;
}

.stat ion-item {
  --background: transparent;
  --min-height: 40px;
  --padding-start: 0;
}
</style>
