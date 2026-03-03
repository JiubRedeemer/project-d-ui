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
import {add, arrowForwardOutline, chevronForwardOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {onMounted, ref} from "vue";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {RaceDto} from "@/api/rulebookApi.types";
import {useRoomCreationStore} from "@/stores/RoomCreationStore";

const roomCreationStore = useRoomCreationStore();
const ionRouter = useIonRouter();

const races = ref<RaceDto[]>();

const setupRaces = async () => {
  races.value = await roomCreationStore.getAvailableRaces(roomCreationStore.roomInfo.baseRules)
}

onIonViewDidEnter(() => {
  setupRaces()
})

onMounted(() => {
  setupRaces()
})

const isRaceSelected = (race: RaceDto) =>
  roomCreationStore.races.some((r) => r.code === race.code);

const toggleRace = (race: RaceDto) => {
  const idx = roomCreationStore.races.findIndex((r) => r.code === race.code);
  if (idx >= 0) {
    roomCreationStore.races = roomCreationStore.races.filter((r) => r.code !== race.code);
  } else {
    roomCreationStore.races = [...roomCreationStore.races, race];
  }
};

const goToFullRace = (race: RaceDto) => {
  console.log(roomCreationStore.races.length);
}

const nextStep = () => {
  ionRouter.navigate("/rooms/create/classes", 'forward', 'push');
}


</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="HEADERS.rooms.rus"></RoomsHeader>
    <ion-content :fullscreen="true" color="dark">

      <ion-list v-show="races?.length != 0" class="room-list">
        <ion-item v-for="(race, index) in races" :key="race.id" :button="true" color="dark" @click="goToFullRace(race)">
          <ion-checkbox slot="end" :checked="isRaceSelected(race)" @ionChange="toggleRace(race)" />
          <ion-avatar aria-hidden="false" slot="start">
            <img width="64" height="64"
                 :src="race.imgUrl ? FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                 FILE_STORAGE_INTEGRATION_ROUTES.api +
                 FILE_STORAGE_INTEGRATION_ROUTES.races_images_bucket +
                 FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + race.imgUrl :
                 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                 alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"/>
          </ion-avatar>
          <ion-icon aria-hidden="false" :icon="chevronForwardOutline" slot="end"></ion-icon>
          <ion-label>
            <div class="room-name">{{ race.name }}</div>
          </ion-label>
        </ion-item>
      </ion-list>

      <div class="room-list-placeholder-wrapper" v-show="races?.length == 0">
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
