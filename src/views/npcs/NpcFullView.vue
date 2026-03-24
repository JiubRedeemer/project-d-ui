<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  IonButton,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonLabel,
  IonPage,
} from "@ionic/vue";
import { arrowBackOutline, createOutline, sparkles } from "ionicons/icons";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import { FILE_STORAGE_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import { getNpcByIdForRoom } from "@/api/npcApi";
import type { NpcDto, NpcTypeEnum } from "@/api/npcApi.types";

const NPC_TYPE_LABELS: Record<NpcTypeEnum, string> = {
  RATIONAL: "Разумное",
  BEAST: "Животное",
  MONSTER: "Монстр",
  DEITY: "Божество",
  UNDEAD: "Нежить",
};

const getNpcTypeLabel = (type: NpcTypeEnum | undefined | null) =>
  type ? (NPC_TYPE_LABELS[type] ?? type) : "";

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

const goToEdit = () => {
  const roomId = route.params.roomId as string;
  const npcId = npc.value?.id;
  if (npcId) ionRouter.push(`/rooms/${roomId}/npcs/${npcId}/edit`);
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
          <div class="avatar-wrap">
            <img :src="getImageUrl(npc.imgUrl)" class="avatar-img" alt="npc" />
            <div v-if="npc.unique" class="unique-badge" title="Уникальный">
              <ion-icon :icon="sparkles" />
              <span>Уникальный</span>
            </div>
          </div>
        </div>
        <div class="body">
          <div class="stat" v-if="npc.visible != null">
            <div class="stat-header">Видимость</div>
            <ion-chip class="stat-chip" :color="npc.visible ? 'success' : 'danger'">
              <ion-label>{{ npc.visible ? "Видимый" : "Скрытый" }}</ion-label>
            </ion-chip>
          </div>
          <div class="description" v-if="npc.description">
            {{ npc.description }}
          </div>

          <div class="stat">
            <div class="stat-header">Тип</div>
            <ion-chip class="stat-chip" color="primary">
              <ion-label>{{ getNpcTypeLabel(npc.type) }}</ion-label>
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

          <div class="stat">
            <ion-button fill="outline" size="small" @click="goToEdit">
              <ion-icon :icon="createOutline" slot="start" />
              Редактировать
            </ion-button>
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
  text-align: left;
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

.avatar-wrap {
  margin-top: 10px;
  margin-left: 10px;
  margin-right: 10px;
  display: flex;
  justify-content: center;
  position: relative;
}

.unique-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 14px;
  background: linear-gradient(135deg, #ffd700, #ffb347);
  color: #5c3d00;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255, 193, 7, 0.4);
}

.unique-badge ion-icon {
  font-size: 16px;
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

.container {
  padding-bottom: 90px;
}

@media (min-width: 1024px) {
  .container {
    max-width: 1240px;
    margin: 0 auto;
    padding: 18px 20px 96px;
    display: grid;
    grid-template-columns: minmax(320px, 400px) minmax(560px, 1fr);
    gap: 18px 20px;
    align-items: start;
  }

  .header {
    grid-column: 1;
    position: sticky;
    top: 14px;
  }

  .avatar-wrap {
    width: 100%;
    margin: 0;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
    background: var(--ion-color-medium);
  }

  .avatar-img {
    width: 100%;
    height: min(62vh, 560px);
    object-fit: cover;
    border-radius: 0;
  }

  .unique-badge {
    top: 12px;
    right: 12px;
  }

  .body {
    grid-column: 2;
  }

  .description {
    margin: 0;
    padding: 14px;
    line-height: 1.45;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
    border-radius: 12px;
  }

  .stat {
    margin-top: 14px;
  }

  .stat-header {
    font-size: 20px;
    padding-left: 0;
    margin-bottom: 6px;
  }

  .stat-chip {
    margin-left: 0;
    margin-right: 8px;
    margin-bottom: 8px;
  }

  .stat-row {
    padding-left: 0;
    padding-right: 0;
    gap: 8px;
  }

  ion-fab {
    left: 22px;
    bottom: 18px;
  }
}
</style>

