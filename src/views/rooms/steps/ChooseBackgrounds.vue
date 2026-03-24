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
import {useRouter} from "vue-router";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {BackgroundDto} from "@/api/rulebookApi.types";
import {useRoomCreationStore} from "@/stores/RoomCreationStore";
import {useFullBackgroundStore} from "@/stores/FullBackgroundStore";

const roomCreationStore = useRoomCreationStore();
const backgroundFullStore = useFullBackgroundStore();
const ionRouter = useIonRouter();
const router = useRouter();

const backgroundsFromApi = ref<BackgroundDto[]>([]);

const backgrounds = computed(() => {
  const api = backgroundsFromApi.value ?? [];
  const customCodes = new Set(api.map((b) => b.code));
  const customOnly = roomCreationStore.backgrounds.filter((b) => !customCodes.has(b.code));
  return [...api, ...customOnly];
});

const areAllBackgroundsSelected = computed(() =>
    backgrounds.value.length > 0 && backgrounds.value.every((b) => isBackgroundSelected(b))
);

const isBackgroundsSelectionIndeterminate = computed(() => {
  const selectedCount = backgrounds.value.filter((b) => isBackgroundSelected(b)).length;
  return selectedCount > 0 && selectedCount < backgrounds.value.length;
});

const toggleAllBackgrounds = () => {
  if (areAllBackgroundsSelected.value) {
    roomCreationStore.backgrounds = [];
  } else {
    roomCreationStore.backgrounds = [...backgrounds.value];
  }
};

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
  router.back();
}

</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="HEADERS.chooseBackgrounds.rus"></RoomsHeader>
    <ion-content :fullscreen="true" color="dark">

      <ion-item v-if="backgrounds.length" color="dark">
        <ion-label>Выбрать все</ion-label>
        <ion-checkbox
            slot="end"
            :indeterminate="isBackgroundsSelectionIndeterminate"
            :checked="areAllBackgroundsSelected"
            @ionChange="toggleAllBackgrounds"
        />
      </ion-item>

      <ion-list v-show="backgrounds.length !== 0" class="room-list">
        <ion-item v-for="(background, index) in backgrounds" :key="background.code + (background.id ?? '')" :button="true" color="dark"
                  >
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
          <ion-icon aria-hidden="false" :icon="chevronForwardOutline" slot="end" @click="onRowClick(background, $event)"></ion-icon>
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

@media (min-width: 1024px) {
  .room-list {
    max-width: 1200px;
    margin: 0 auto;
    padding: 8px 10px 96px;
    border-radius: 14px;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
    background: rgba(var(--ion-color-medium-rgb), 0.16);
  }

  .room-list ion-item {
    --min-height: 72px;
    --inner-padding-top: 8px;
    --inner-padding-bottom: 8px;
    --border-color: rgba(var(--ion-color-light-rgb), 0.08);
  }

  .room-list ion-avatar {
    width: 52px;
    height: 52px;
  }

  .room-name {
    font-size: 15px;
    font-weight: 600;
  }

  .room-list-placeholder-wrapper {
    position: static;
    min-height: 40vh;
  }

  ion-fab[horizontal="start"] {
    left: 22px;
    right: auto;
    bottom: 18px;
  }

  ion-fab[horizontal="center"] {
    left: 84px;
    right: auto;
    transform: none;
    bottom: 18px;
  }

  ion-fab[horizontal="end"] {
    right: 22px;
    bottom: 18px;
  }
}
</style>
