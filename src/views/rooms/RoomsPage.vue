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
  onIonViewDidEnter, useIonRouter
} from "@ionic/vue";
import {add, chevronForwardOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {ref} from "vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

const ionRouter = useIonRouter();

const rooms = ref<{ id: string; name: string; description: string; lastActivityDate: string } []>([]);

const setupRooms = async () => {
  const http = axios.create({
    baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
    headers: {
      "Content-type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("accessToken")
    },
  });

  const res = await http.get(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.rooms);

  if (res.status == 200) {
    rooms.value = res.data
  }
}
onIonViewDidEnter(() => {
  setupRooms()
})

const goToRoom = (roomId: string) => {
  ionRouter.navigate('rooms/' + roomId + '/characters', 'forward', 'push')
}

const goToCreateRoom = () => {
  ionRouter.navigate('rooms/create', 'forward', 'push')
}


</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="HEADERS.rooms.rus"></RoomsHeader>
    <ion-content :fullscreen="true" color="dark">

      <ion-list v-show="rooms.length != 0" class="room-list">
        <ion-item v-for="(room, index) in rooms" :key="index" :button="true" color="dark" @click="goToRoom(room.id)">
          <ion-avatar aria-hidden="true" slot="start">
            <img width="64" height="64"
                 src="https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png"
                 alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"/>
          </ion-avatar>
          <ion-icon aria-hidden="true" :icon="chevronForwardOutline" slot="end"></ion-icon>
          <ion-label>
            <h1 class="room-name">{{ room.name }}</h1>
            <p class="room-description">{{ room.description }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <div class="room-list-placeholder-wrapper" v-show="rooms.length == 0">
        <div class="room-list-placeholder">{{ TEXTS.emptyRoomList.rus }}</div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button color="primary" @click="goToCreateRoom()">
          <ion-icon :icon="add" color="light"></ion-icon>
        </ion-fab-button>
      </ion-fab>

    </ion-content>
  </ion-page>
</template>

<style scoped>

.room-list {
  background: transparent;
}

.room-list-placeholder-wrapper {
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
