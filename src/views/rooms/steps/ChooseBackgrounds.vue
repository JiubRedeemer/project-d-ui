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
import {arrowForwardOutline, chevronForwardOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {onMounted, ref} from "vue";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {BackgroundDto} from "@/api/rulebookApi.types";
import {useRoomCreationStore} from "@/stores/RoomCreationStore";

const roomCreationStore = useRoomCreationStore();
const ionRouter = useIonRouter();

const backgrounds = ref<BackgroundDto[]>();

const setupBackgrounds = async () => {
  backgrounds.value = await roomCreationStore.getAvailableBackgrounds(roomCreationStore.roomInfo.baseRules)
}

onIonViewDidEnter(() => {
  setupBackgrounds()
})

onMounted(() => {
  setupBackgrounds()
})

const isBackgroundSelected = (background: BackgroundDto) =>
    roomCreationStore.backgrounds.some((b) => b.code === background.code);

const toggleBackground = (background: BackgroundDto) => {
  const idx = roomCreationStore.backgrounds.findIndex((b) => b.code === background.code);
  if (idx >= 0) {
    roomCreationStore.backgrounds = roomCreationStore.backgrounds.filter((b) => b.code !== background.code);
  } else {
    roomCreationStore.backgrounds = [...roomCreationStore.backgrounds, background];
  }
};

const goToFullBackground = (background: BackgroundDto) => {
  console.log(roomCreationStore.backgrounds.length);
}

const nextStep = async () => {
  const roomId = await roomCreationStore.createRoom();
  await roomCreationStore.createRacesBulk(roomId);
  await roomCreationStore.createClassesBulk(roomId);
  await roomCreationStore.createBackgroundsBulk(roomId);
  ionRouter.replace("/rooms");
  roomCreationStore.clearAll();
}


</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="HEADERS.rooms.rus"></RoomsHeader>
    <ion-content :fullscreen="true" color="dark">

      <ion-list v-show="backgrounds?.length != 0" class="room-list">
        <ion-item v-for="(background, index) in backgrounds" :key="background.id" :button="true" color="dark"
                  @click="goToFullBackground(background)">
          <ion-checkbox slot="end" :checked="isBackgroundSelected(background)"
                        @ionChange="toggleBackground(background)"/>
          <ion-avatar aria-hidden="false" slot="start">
            <img width="64" height="64"
                 :src="background.imgUrl ? FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                 FILE_STORAGE_INTEGRATION_ROUTES.api +
                 FILE_STORAGE_INTEGRATION_ROUTES.backgrounds_images_bucket +
                 FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + background.imgUrl :
                 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                 alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"/>
          </ion-avatar>
          <ion-icon aria-hidden="false" :icon="chevronForwardOutline" slot="end"></ion-icon>
          <ion-label>
            <div class="room-name">{{ background.name }}</div>
          </ion-label>
        </ion-item>
      </ion-list>

      <div class="room-list-placeholder-wrapper" v-show="backgrounds?.length == 0">
        <div class="room-list-placeholder">{{ TEXTS.emptyRoomList.rus }}</div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button color="medium" @click="nextStep()">
          <ion-icon :icon="arrowForwardOutline" color="light"></ion-icon>
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
