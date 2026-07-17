<script setup lang="ts">
import {IonContent, IonFab, IonFabButton, IonIcon, IonPage, useIonRouter} from "@ionic/vue";
import {computed} from "vue";
import {useRoute} from "vue-router";
import {checkmark} from "ionicons/icons";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import MasterRulebookBundlesView from "@/views/master/tabs/MasterRulebookBundlesView.vue";
import type {RulebookBundleCategory} from "@/api/rulebookBundleApi.types";
import {useRoomCreationStore} from "@/stores/RoomCreationStore";

const route = useRoute();
const ionRouter = useIonRouter();
const roomCreationStore = useRoomCreationStore();

const roomName = computed(() => roomCreationStore.roomInfo.name ?? "");

/** Порядок секций сборки: расы → классы → предыстории. */
const CATEGORIES: RulebookBundleCategory[] = ["RACE", "CLAZZ", "BACKGROUND"];

function finish() {
  const roomId = String(route.params.roomId);
  roomCreationStore.clearAll();
  ionRouter.replace(`/rooms/${roomId}/master`);
}
</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="roomName || 'Сборка комнаты'"></RoomsHeader>
    <ion-content :fullscreen="true" color="dark">
      <div class="bundles-wrapper">
        <p class="bundles-intro">
          Комната создана. Соберите её правила из наборов — можно смешивать издания,
          например расы из 2024, а классы из 2014. Настройки всегда можно изменить позже в мастерской.
        </p>
        <MasterRulebookBundlesView
            v-for="category in CATEGORIES"
            :key="category"
            :category="category"
            :show-hint="false"
        />
      </div>
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button color="primary" @click="finish">
          <ion-icon :icon="checkmark" color="dark"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.bundles-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 16px 80px;
}

.bundles-intro {
  margin: 0 0 8px;
  font-size: 13px;
  color: rgba(var(--ion-color-light-rgb), 0.6);
}

@media (min-width: 1024px) {
  .bundles-wrapper {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px 24px 90px;
  }

  ion-fab {
    margin-right: 14px;
    margin-bottom: 14px;
  }
}
</style>
