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
import {addOutline, arrowBackOutline, arrowForwardOutline, chevronForwardOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {computed, onMounted, ref} from "vue";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {BackgroundDto} from "@/api/rulebookApi.types";
import {useRoomCreationStore} from "@/stores/RoomCreationStore";
import {useFullBackgroundStore} from "@/stores/FullBackgroundStore";

const roomCreationStore = useRoomCreationStore();
const backgroundFullStore = useFullBackgroundStore();
const ionRouter = useIonRouter();

const backgroundsFromApi = ref<BackgroundDto[]>([]);

const backgrounds = computed(() => {
  const api = backgroundsFromApi.value ?? [];
  const customCodes = new Set(api.map((b) => b.code));
  const customOnly = roomCreationStore.backgrounds.filter((b) => !customCodes.has(b.code));
  return [...api, ...customOnly];
});

const setupBackgrounds = async () => {
  backgroundsFromApi.value = await roomCreationStore.getAvailableBackgrounds(roomCreationStore.roomInfo.baseRules) ?? [];
  if (!backgroundsFromApi.value.length && !roomCreationStore.backgrounds.length) {
    await nextStep();
  }
};

const createItem = () => {
  ionRouter.navigate("/createEntity/background", "forward", "push");
};

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
  backgroundFullStore.background = background;
  ionRouter.navigate("/guidebook/backgrounds/" + background.code, 'forward', 'push')
}

const onRowClick = (background: BackgroundDto, e: Event) => {
  const target = e.target as HTMLElement
  if (target.closest?.('ion-checkbox')) {
    toggleBackground(background)
  } else {
    goToFullBackground(background)
  }
}

const nextStep = async () => {
  const roomId = await roomCreationStore.createRoom();
  await roomCreationStore.createRacesBulk(roomId);
  await roomCreationStore.createClassesBulk(roomId);
  await roomCreationStore.createBackgroundsBulk(roomId);
  ionRouter.replace("/rooms");
  roomCreationStore.clearAll();
}
const previousStep = () => {
  ionRouter.back();
}

</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="HEADERS.chooseBackgrounds.rus"></RoomsHeader>
    <ion-content :fullscreen="true" color="dark">

      <ion-list v-show="backgrounds.length !== 0" class="room-list">
        <ion-item v-for="(background, index) in backgrounds" :key="background.code + (background.id ?? '')" :button="true" color="dark"
                  @click="onRowClick(background, $event)">
          <ion-checkbox slot="end" :checked="isBackgroundSelected(background)"/>
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
        <div style="min-height: 50px"></div>
      </ion-list>

      <div class="room-list-placeholder-wrapper" v-show="backgrounds.length === 0">
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
