<script setup lang="ts">

import {
  IonAvatar,
  IonCheckbox,
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
import {addOutline, arrowBackOutline, arrowForwardOutline, chevronForwardOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {computed, onMounted, ref} from "vue";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {RaceDto} from "@/api/rulebookApi.types";
import {useRoomCreationStore} from "@/stores/RoomCreationStore";
import {useFullRaceStore} from "@/stores/FullRaceStore";

const roomCreationStore = useRoomCreationStore();
const racesFullStore = useFullRaceStore();
const ionRouter = useIonRouter();

const racesFromApi = ref<RaceDto[]>([]);

const races = computed(() => {
  const api = racesFromApi.value ?? [];
  const customCodes = new Set(api.map((r) => r.code));
  const customOnly = roomCreationStore.races.filter((r) => !customCodes.has(r.code));
  return [...api, ...customOnly];
});

const areAllRacesSelected = computed(() =>
    races.value.length > 0 && races.value.every((r) => isRaceSelected(r))
);

const isRacesSelectionIndeterminate = computed(() => {
  const selectedCount = races.value.filter((r) => isRaceSelected(r)).length;
  return selectedCount > 0 && selectedCount < races.value.length;
});

const toggleAllRaces = () => {
  if (areAllRacesSelected.value) {
    roomCreationStore.races = [];
  } else {
    roomCreationStore.races = [...races.value];
  }
};

const setupRaces = async () => {
  if (!roomCreationStore.roomInfo.baseRules && !roomCreationStore.roomInfo.baseRules) {
    ionRouter.replace("/rooms/create/ruleType")
  }
  racesFromApi.value = await roomCreationStore.getAvailableRaces(roomCreationStore.roomInfo.baseRules)
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
  console.log(roomCreationStore.races.length);
  const idx = roomCreationStore.races.findIndex((r) => r.code === race.code);
  if (idx >= 0) {
    roomCreationStore.races = roomCreationStore.races.filter((r) => r.code !== race.code);
  } else {
    roomCreationStore.races = [...roomCreationStore.races, race];
  }
};

const goToFullRace = (race: RaceDto) => {
  racesFullStore.race = race;
  ionRouter.navigate("/guidebook/races/" + race.code, 'forward', 'push')
}

const onRowClick = (race: RaceDto, e: Event) => {
  const target = e.target as HTMLElement
  if (target.closest?.('ion-checkbox')) {
    toggleRace(race)
  } else {
    goToFullRace(race)
  }
}

const nextStep = () => {
  ionRouter.navigate("/rooms/create/classes", 'forward', 'push');
}

const previousStep = () => {
  ionRouter.back();
}

const createItem = () => {
  ionRouter.navigate("/createEntity/race", 'forward', 'push');
}


</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="HEADERS.chooseRaces.rus"></RoomsHeader>
    <ion-content :fullscreen="true" color="dark">

      <ion-item v-if="races.length" color="dark">
        <ion-label>Выбрать все</ion-label>
        <ion-checkbox
            slot="end"
            :indeterminate="isRacesSelectionIndeterminate"
            :checked="areAllRacesSelected"
            @ionChange="toggleAllRaces"
        />
      </ion-item>

      <ion-list v-show="races.length !== 0" class="room-list">
        <ion-item v-for="(race, index) in races" :key="race.code + (race.id ?? '')" :button="true" color="dark"
                  >
          <ion-checkbox slot="end" :checked="isRaceSelected(race)"/>
          <ion-avatar aria-hidden="false" slot="start">
            <img width="64" height="64"
                 :src="race.imgUrl ? FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                 FILE_STORAGE_INTEGRATION_ROUTES.api +
                 FILE_STORAGE_INTEGRATION_ROUTES.races_images_bucket +
                 FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + race.imgUrl :
                 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                 alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"/>
          </ion-avatar>
          <ion-icon aria-hidden="false" :icon="chevronForwardOutline" slot="end" @click="onRowClick(race, $event)"></ion-icon>
          <ion-label>
            <div class="room-name">{{ race.name }}</div>
          </ion-label>
        </ion-item>
        <div style="min-height: 50px"></div>
      </ion-list>

      <div class="room-list-placeholder-wrapper" v-show="races.length === 0">
        <div class="room-list-placeholder">{{ TEXTS.emptyRoomList.rus }}</div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button color="medium" @click="nextStep()">
          <ion-icon :icon="arrowForwardOutline" color="light"></ion-icon>
        </ion-fab-button>
      </ion-fab>
      <ion-fab slot="fixed" vertical="bottom" horizontal="start">
        <ion-fab-button color="medium" @click="previousStep()">
          <ion-icon :icon="arrowBackOutline" color="light"></ion-icon>
        </ion-fab-button>
      </ion-fab>
      <ion-fab slot="fixed" vertical="bottom" horizontal="center">
        <ion-fab-button color="medium" @click="createItem()">
          <ion-icon :icon="addOutline" color="light"></ion-icon>
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
