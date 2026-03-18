<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonLabel,
  IonPage,
} from "@ionic/vue";
import { arrowBackOutline } from "ionicons/icons";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import { FILE_STORAGE_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import { getNpcByIdForRoom } from "@/api/npcApi";
import type { NpcDto } from "@/api/npcApi.types";

const route = useRoute();
const ionRouter = useRouter();

const npc = ref<NpcDto | null>(null);

const getImageUrl = (imgUrl: string | undefined | null) => {
  return imgUrl != null
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
    : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
};

const previousStep = () => {
  ionRouter.back();
};

onMounted(async () => {
  const roomId = route.params.roomId as string;
  const npcId = route.params.npcId as string;
  try {
    npc.value = await getNpcByIdForRoom(roomId, npcId);
  } catch (e) {
    console.error("Failed to load NPC for full view:", e);
  }
});
</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="npc?.name || 'NPC'"></RoomsHeader>
    <ion-content>
      <div class="container" v-if="npc">
        <div class="header">
          <div class="avatar">
            <img :src="getImageUrl(npc.imgUrl)" class="avatar-img" alt="npc" />
          </div>
        </div>
        <div class="body">
          <div class="description" v-if="npc.description">
            {{ npc.description }}
          </div>

          <div class="stat">
            <div class="stat-header">Тип</div>
            <ion-chip class="stat-chip" color="primary">
              <ion-label>{{ npc.type }}</ion-label>
            </ion-chip>
          </div>

          <div class="stat" v-if="npc.clazzInfo?.name || npc.clazzCode">
            <div class="stat-header">Класс</div>
            <ion-chip class="stat-chip" color="primary">
              <ion-label>{{ npc.clazzInfo?.name || npc.clazzCode }}</ion-label>
            </ion-chip>
          </div>

          <div class="stat" v-if="npc.raceInfo?.name || npc.raceCode">
            <div class="stat-header">Раса</div>
            <ion-chip class="stat-chip" color="primary">
              <ion-label>{{ npc.raceInfo?.name || npc.raceCode }}</ion-label>
            </ion-chip>
          </div>

          <div class="stat" v-if="npc.armoryClass || npc.speed || npc.initiative != null">
            <div class="stat-header">Базовые параметры</div>
            <div class="stat-row">
              <ion-chip v-if="npc.armoryClass" class="stat-chip" color="primary">
                <ion-label>КД: {{ npc.armoryClass }}</ion-label>
              </ion-chip>
              <ion-chip v-if="npc.speed" class="stat-chip" color="primary">
                <ion-label>Скорость: {{ npc.speed }}</ion-label>
              </ion-chip>
              <ion-chip v-if="npc.initiative != null" class="stat-chip" color="primary">
                <ion-label>Инициатива: {{ npc.initiative }}</ion-label>
              </ion-chip>
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

.stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-left: 10px;
  padding-right: 10px;
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

