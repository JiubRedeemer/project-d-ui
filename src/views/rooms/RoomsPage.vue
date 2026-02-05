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
} from "@ionic/vue";
import {add, chevronForwardOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {onMounted, ref} from "vue";
import axios from "axios";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useAppRouter} from "@/composables/useAppRouter";

const { navigate, isDesktop } = useAppRouter();

const rooms = ref<{ id: string; name: string; description: string; filePath: string, lastActivityDate: string } []>([]);

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

onMounted(() => {
  setupRooms()
})

const goToRoom = (roomId: string) => {
  navigate('rooms/' + roomId + '/characters', 'forward', 'push')
}

const goToCreateRoom = () => {
  navigate('rooms/create', 'forward', 'push')
}


</script>

<template>
  <ion-page>
    <RoomsHeader v-if="!isDesktop" :header-name="HEADERS.rooms.rus"></RoomsHeader>
    <ion-content :fullscreen="!isDesktop" color="dark">
      <!-- Desktop template -->
      <div v-if="isDesktop" class="desktop-content">
        <div class="desktop-toolbar">
          <h1 class="desktop-title">{{ HEADERS.rooms.rus }}</h1>
          <ion-button color="primary" @click="goToCreateRoom()">
            <ion-icon :icon="add" slot="start"></ion-icon>
            Создать комнату
          </ion-button>
        </div>
        <div v-show="rooms.length != 0" class="desktop-grid">
          <div v-for="(room, index) in rooms" :key="index" class="desktop-room-card" @click="goToRoom(room.id)">
            <img class="desktop-room-img"
                 :src="room.filePath ? FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                 FILE_STORAGE_INTEGRATION_ROUTES.api +
                 FILE_STORAGE_INTEGRATION_ROUTES.room_images_bucket +
                 FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + room.filePath :
                 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                 alt=""/>
            <div class="desktop-room-info">
              <h2 class="desktop-room-name">{{ room.name }}</h2>
              <p class="desktop-room-desc">{{ room.description }}</p>
              <ion-icon :icon="chevronForwardOutline" class="desktop-room-arrow"></ion-icon>
            </div>
          </div>
        </div>
        <div v-show="rooms.length == 0" class="desktop-placeholder">{{ TEXTS.emptyRoomList.rus }}</div>
      </div>
      <!-- Mobile template -->
      <template v-else>
        <ion-list v-show="rooms.length != 0" class="room-list">
          <ion-item v-for="(room, index) in rooms" :key="index" :button="true" color="dark" @click="goToRoom(room.id)">
            <ion-avatar aria-hidden="false" slot="start">
              <img width="64" height="64"
                   :src="room.filePath ? FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                   FILE_STORAGE_INTEGRATION_ROUTES.api +
                   FILE_STORAGE_INTEGRATION_ROUTES.room_images_bucket +
                   FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + room.filePath :
                   'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                   alt=""/>
            </ion-avatar>
            <ion-icon aria-hidden="false" :icon="chevronForwardOutline" slot="end"></ion-icon>
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
      </template>
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
.desktop-room-card {
  background: var(--ion-color-medium);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.desktop-room-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
.desktop-room-img {
  width: 100%;
  height: 140px;
  object-fit: cover;
}
.desktop-room-info {
  padding: 16px;
  position: relative;
}
.desktop-room-name {
  margin: 0 0 4px 0;
  font-size: 1rem;
}
.desktop-room-desc {
  margin: 0;
  font-size: 0.875rem;
  color: var(--ion-color-medium-contrast);
  opacity: 0.85;
}
.desktop-room-arrow {
  position: absolute;
  right: 16px;
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
