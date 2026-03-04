<script setup lang="ts">

import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {useRoomCreationStore} from "@/stores/RoomCreationStore";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {arrowBackOutline} from "ionicons/icons";
import {IonChip, IonFab, IonFabButton, IonIcon, IonLabel, IonPage} from "@ionic/vue";
import {onMounted, ref} from "vue";
import type {ClazzDto} from "@/api/rulebookApi.types";
import {useRouter} from "vue-router";
import {useFullClassStore} from "@/stores/FullClassStore";

const fullClassStore = useFullClassStore();
const roomCreationStore = useRoomCreationStore();
const subClasses = ref<ClazzDto[]>([]);
const ionRouter = useRouter();

onMounted(async () => {
  const clazz = fullClassStore.clazz;
  if (clazz?.code) {
    subClasses.value = await roomCreationStore.getAvailableSubClasses(clazz.code, roomCreationStore.roomInfo.baseRules) ?? [];
  }
});

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
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.classes_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png';
};

const previousStep = () => {
  ionRouter.back();
}
</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="fullClassStore.clazz.name"></RoomsHeader>
    <ion-content>
      <div class="container">
        <div class="header">
          <div class="avatar">
            <img :src="getImageUrl(fullClassStore.clazz.imgUrl)"
                 class="avatar-img"
                 alt="avatar"/>
          </div>
        </div>
        <div class="body">
          <div class="description">
            {{ fullClassStore.clazz.description }}
          </div>
          <div class="stat">
            <div class="stat-header">
              Кость хитов
            </div>
            <ion-chip class="stat-chip" color="primary">
              <ion-label>
                {{ fullClassStore.clazz.stats.hpDice }}
              </ion-label>
            </ion-chip>
          </div>
          <div class="stat" v-show="fullClassStore.clazz.stats.savingThrowsAbilities.length > 0">
            <div class="stat-header">
              Спасброски
            </div>
            <ion-chip class="stat-chip"
                      v-for="(classSavingThrow, index) in fullClassStore.clazz.stats.savingThrowsAbilities"
                      :key="index" color="primary">
              <ion-label>{{
                  ABILITY_CODE_NAMES[classSavingThrow.code]
                }}
              </ion-label>
            </ion-chip>
          </div>
          <div class="stat" v-show="subClasses.length > 0">
            <div class="stat-header">Подклассы</div>
            <div class="stat-subspecies">
              <div v-for="sub in subClasses" :key="sub.id" class="stat-subspecies-item">
                <img :src="getImageUrl(sub.imgUrl)" class="stat-subspecies-img" :alt="sub.name"/>
                <span class="stat-subspecies-name">{{ sub.name }}</span>
              </div>
            </div>
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

.stat-subspecies {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.stat-subspecies-item {
  margin-left: 10px;
  margin-right: 10px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background-color: var(--ion-color-medium);
  border-radius: 10px;
}

.stat-subspecies-img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 50%;
}

.stat-subspecies-name {
  font-size: 0.95rem;
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