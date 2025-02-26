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
  onIonViewDidEnter,
  useIonRouter
} from "@ionic/vue";
import {add, chevronForwardOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {ref} from "vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {Character} from "@/components/models/response/Character";

const ionRouter = useIonRouter();
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
  ionRouter.navigate('/rooms/' + route.params.roomId + '/create-character', 'forward', 'push')
}

const goToCharacter = (characterId: string) => {
  ionRouter.navigate('/rooms/' + route.params.roomId + '/characters/' + characterId, 'forward', 'push')
}


</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="HEADERS.characters.rus"></RoomsHeader>
    <ion-content :fullscreen="true" color="dark">

      <ion-list v-show="characters.length != 0" class="character-list">
        <ion-item v-for="(character, index) in characters" :key="index" :button="true" color="dark"
                  @click="goToCharacter(character.id)">
          <ion-avatar aria-hidden="false" slot="start">
            <img width="64" height="64"
                 src="https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png"
                 alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"/>
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
</style>
