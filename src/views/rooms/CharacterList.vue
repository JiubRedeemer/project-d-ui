<script setup lang="ts">

import {
  IonAvatar,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  onIonViewDidEnter
} from "@ionic/vue";
import {add, chevronForwardOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {ref} from "vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {Character} from "@/components/models/response/Character";
import {useAppRouter} from "@/composables/useAppRouter";

const { navigate, isDesktop } = useAppRouter();
const route = useRoute();

const characters = ref<Character[]>([]);

const setupCharacters = async () => {
  const http = axios.create({
    baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
    headers: {
      "Content-type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("accessToken")
    },
  });

  const res = await http.get(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.rooms + '/' + route.params.roomId + GATEWAY_INTEGRATION_ROUTES.characters);

  if (res.status == 200) {
    characters.value = res.data
  }
}
onIonViewDidEnter(() => {
  setupCharacters()
})

const createCharacter = () => {
  navigate('/rooms/' + route.params.roomId + '/create-character', 'forward', 'push')
}

const goToCharacter = (characterId: string) => {
  navigate('/rooms/' + route.params.roomId + '/characters/' + characterId, 'forward', 'push')
}


</script>

<template>
  <ion-page>
    <RoomsHeader v-if="!isDesktop" :header-name="HEADERS.characters.rus"></RoomsHeader>
    <ion-content :fullscreen="!isDesktop" color="dark">
      <!-- Desktop template -->
      <div v-if="isDesktop" class="desktop-content">
        <div class="desktop-toolbar">
          <h1 class="desktop-title">{{ HEADERS.characters.rus }}</h1>
          <ion-button color="primary" @click="createCharacter()">
            <ion-icon :icon="add" slot="start"></ion-icon>
            Создать персонажа
          </ion-button>
        </div>
        <div v-show="characters.length != 0" class="desktop-grid">
          <div v-for="(character, index) in characters" :key="index" class="desktop-char-card" @click="goToCharacter(character.id)">
            <img class="desktop-char-avatar"
                 src="https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png"
                 alt=""/>
            <div class="desktop-char-info">
              <h2 class="desktop-char-name">{{ character.name }}</h2>
              <p class="desktop-char-desc">{{ character.raceInfo.name }} — {{ character.clazzInfo.name }}</p>
              <ion-icon :icon="chevronForwardOutline" class="desktop-char-arrow"></ion-icon>
            </div>
          </div>
        </div>
        <div v-show="characters.length == 0" class="desktop-placeholder">{{ TEXTS.emptyCharactersList.rus }}</div>
      </div>
      <!-- Mobile template -->
      <template v-else>
        <ion-list v-show="characters.length != 0" class="character-list">
          <ion-item v-for="(character, index) in characters" :key="index" :button="true" color="dark"
                    @click="goToCharacter(character.id)">
            <ion-avatar aria-hidden="false" slot="start">
              <img width="64" height="64"
                   src="https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png"
                   alt=""/>
            </ion-avatar>
            <ion-icon aria-hidden="false" :icon="chevronForwardOutline" slot="end"></ion-icon>
            <ion-label>
              <h1 class="character-name">{{ character.name }}</h1>
              <p class="character-description">{{ character.raceInfo.name }} - {{ character.clazzInfo.name }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
        <div class="character-list-placeholder-wrapper" v-show="characters.length == 0">
          <div class="room-list-placeholder">{{ TEXTS.emptyCharactersList.rus }}</div>
        </div>
        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
          <ion-fab-button color="primary" @click="createCharacter()">
            <ion-icon :icon="add" color="light"></ion-icon>
          </ion-fab-button>
        </ion-fab>
      </template>
    </ion-content>
  </ion-page>
</template>

<style scoped>

.character-list {
  background: transparent;
}

.character-list-placeholder-wrapper {
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  align-content: center;
  justify-content: center;
  overflow: auto;
}

/* Desktop template */
.desktop-content {
  max-width: var(--desktop-content-max-width);
  margin: 0 auto;
  padding: var(--desktop-content-padding);
}
.desktop-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.desktop-title {
  margin: 0;
  font-size: 1.5rem;
}
.desktop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--desktop-grid-gap);
}
.desktop-char-card {
  background: var(--ion-color-medium);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 16px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.desktop-char-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
.desktop-char-avatar {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
.desktop-char-info {
  flex: 1;
  min-width: 0;
  position: relative;
}
.desktop-char-name {
  margin: 0 0 4px 0;
  font-size: 1rem;
}
.desktop-char-desc {
  margin: 0;
  font-size: 0.875rem;
  opacity: 0.85;
}
.desktop-char-arrow {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
}
.desktop-placeholder {
  text-align: center;
  padding: 48px 24px;
  color: var(--ion-color-medium-contrast);
}
</style>
