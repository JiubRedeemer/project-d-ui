<script setup lang="ts">

import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {arrowBackOutline} from "ionicons/icons";
import {IonChip, IonContent, IonFab, IonFabButton, IonIcon, IonLabel, IonPage} from "@ionic/vue";
import {useRouter} from "vue-router";
import {useFullBackgroundStore} from "@/stores/FullBackgroundStore";

const fullBackgroundStore = useFullBackgroundStore();
const ionRouter = useRouter();


const ABILITY_CODE_NAMES: Record<string, string> = {
  STR: "Сила",
  DEX: "Ловкость",
  CON: "Телосложение",
  INT: "Интеллект",
  WIS: "Мудрость",
  CHA: "Харизма",
}; //Говно прямо скажем, но впадлу бек пилить под это пока

const getImageUrl = (imgUrl: string | undefined | null) => {
  return imgUrl != null
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.backgrounds_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png';
};

const previousStep = () => {
  ionRouter.back();
}
</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="fullBackgroundStore.background.name"></RoomsHeader>
    <ion-content>
      <div class="container">
        <div class="header">
          <div class="avatar">
            <img :src="getImageUrl(fullBackgroundStore.background.imgUrl)"
                 class="avatar-img"
                 alt="avatar"/>
          </div>
        </div>
        <div class="body">
          <div class="description">
            {{ fullBackgroundStore.background.description }}
          </div>
          <div class="stat" v-show="fullBackgroundStore?.background?.stats?.abilityModifiers?.length > 0">
            <div class="stat-header">
              Бонусы к характеристикам
            </div>
            <ion-chip class="stat-chip"
                      v-for="(classSavingThrow, index) in fullBackgroundStore?.background?.stats?.abilityModifiers"
                      :key="index" color="primary">
              <ion-label>{{
                  ABILITY_CODE_NAMES[classSavingThrow]
                }}
              </ion-label>
            </ion-chip>
          </div>
          <div style="height: 10vh"></div>
        </div>
      </div>
    </ion-content>
    <ion-fab slot="fixed" vertical="bottom" horizontal="start">
      <ion-fab-button color="medium" @click="previousStep()">
        <ion-icon :icon="arrowBackOutline" color="light"></ion-icon>
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<style scoped>
.description {
  margin-top: 10px;
  margin-left: 10px;
  margin-right: 10px;
  padding: 10px;
  text-align: center;
  background-color: var(--ion-color-medium);
  border-radius: 10px;
}

.stat {
  margin-top: 10px;
}

.stat-header {
  font-size: 24px;
  padding-left: 10px;
}

.stat-chip {
  margin-left: 10px;
}

.avatar-img {
  border-radius: 25px;
  align-content: center;
  justify-content: center;
  display: flex;
}

.avatar {
  margin-top: 10px;
  margin-left: 10px;
  margin-right: 10px;
  display: flex;
  justify-content: center;
}

.header {
  display: flex;
  justify-content: center;
}

</style>