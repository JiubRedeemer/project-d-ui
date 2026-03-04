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
import {arrowBackOutline, arrowForwardOutline, chevronForwardOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {onMounted, ref} from "vue";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {ClazzDto} from "@/api/rulebookApi.types";
import {useRoomCreationStore} from "@/stores/RoomCreationStore";
import {useFullClassStore} from "@/stores/FullClassStore";

const roomCreationStore = useRoomCreationStore();
const classFullStore = useFullClassStore();
const ionRouter = useIonRouter();

const classes = ref<ClazzDto[]>();

const setupClasses = async () => {
  classes.value = await roomCreationStore.getAvailableClasses(roomCreationStore.roomInfo.baseRules)
}

onIonViewDidEnter(() => {
  setupClasses()
})

onMounted(() => {
  setupClasses()
})

const isClassSelected = (clazz: ClazzDto) =>
  roomCreationStore.classes.some((c) => c.code === clazz.code);

const toggleClass = (clazz: ClazzDto) => {
  const idx = roomCreationStore.classes.findIndex((c) => c.code === clazz.code);
  if (idx >= 0) {
    roomCreationStore.classes = roomCreationStore.classes.filter((c) => c.code !== clazz.code);
  } else {
    roomCreationStore.classes = [...roomCreationStore.classes, clazz];
  }
};

const goToFullClass = (clazz: ClazzDto) => {
  classFullStore.clazz = clazz;
  ionRouter.navigate("/guidebook/classes/" + clazz.code, 'forward', 'push')
}

const onRowClick = (clazz: ClazzDto, e: Event) => {
  const target = e.target as HTMLElement
  if (target.closest?.('ion-checkbox')) {
    toggleClass(clazz)
  } else {
    goToFullClass(clazz)
  }
}

const nextStep = () => {
  ionRouter.navigate("/rooms/create/backgrounds", 'forward', 'push');
}
const previousStep = () => {
  ionRouter.back();
}

</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="HEADERS.chooseClasses.rus"></RoomsHeader>
    <ion-content :fullscreen="true" color="dark">

      <ion-list v-show="classes?.length != 0" class="room-list">
        <ion-item v-for="(clazz, index) in classes" :key="clazz.id" :button="true" color="dark" @click="onRowClick(clazz, $event)">
          <ion-checkbox slot="end" :checked="isClassSelected(clazz)" />
          <ion-avatar aria-hidden="false" slot="start">
            <img width="64" height="64"
                 :src="clazz.imgUrl ? FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                 FILE_STORAGE_INTEGRATION_ROUTES.api +
                 FILE_STORAGE_INTEGRATION_ROUTES.classes_images_bucket +
                 FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + clazz.imgUrl :
                 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                 alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"/>
          </ion-avatar>
          <ion-icon aria-hidden="false" :icon="chevronForwardOutline" slot="end"></ion-icon>
          <ion-label>
            <div class="room-name">{{ clazz.name }}</div>
          </ion-label>
        </ion-item>
        <div style="min-height: 50px"></div>
      </ion-list>

      <div class="room-list-placeholder-wrapper" v-show="classes?.length == 0">
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
