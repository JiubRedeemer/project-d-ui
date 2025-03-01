<script setup lang="ts">
import {ref} from "vue";
import {Character} from "@/components/models/response/Character";
import {useRoute} from "vue-router";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {TEXTS} from "../../../../config/localisations";
import {marked} from "marked";
import {saveOutline} from "ionicons/icons";
import {IonButton, IonButtons, IonIcon} from "@ionic/vue";


const route = useRoute();
const character = ref<Character | null>(null);
const isBlockExpanded = ref<string | null>(null);
const inputSectionText = ref<string | null>(null);
try {
  const response = await axios.get(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.bio}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
  );

  character.value = response.data;
} catch (error) {
  console.error("Ошибка при получении данных:", error);
}

// Функция для конвертации текста в HTML
const renderMarkdown = (text: string | undefined) => {
  return text ? marked(text) : "";
};

const expandBlock = (name: string) => {
  isBlockExpanded.value = name;
  inputSectionText.value = character.value?.characterBio[name];
}

const saveSectionText = async (name: string) => {

  try {
    const response = await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.bio}/${name}`,
        {
          value: inputSectionText.value
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );

    character.value = response.data;
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
  inputSectionText.value = null; // Закрываем все секции
  isBlockExpanded.value = null; // Закрываем все секции

};

const updateInputSectionText = (event: Event) => {
  inputSectionText.value = (event.target as HTMLElement).innerHTML;
}

</script>

<template>
  <div class="container">
    <div class="header" v-show="isBlockExpanded == null">
      <div class="avatar">
        <img :src="`src/static/images/backgrounds/image_SELECT_AGE.png`" class="avatar-img"
             alt="Фоновое изображение"/>
      </div>
      <div class="stats">
        <div class="stat">{{ TEXTS.age.rus }} :<span class="stat-value">{{ character?.characterBio.age }}</span></div>
        <div class="stat">{{ TEXTS.height.rus }} :<span class="stat-value">{{ character?.characterBio.height }}</span>
        </div>
        <div class="stat">{{ TEXTS.weight.rus }} :<span class="stat-value">{{ character?.characterBio.weight }}</span>
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
          v-html="isBlockExpanded === section ? character?.characterBio[section] : renderMarkdown(character?.characterBio[section])"
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
