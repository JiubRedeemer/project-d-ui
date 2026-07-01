<script setup lang="ts">
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonSearchbar, IonList, IonItem, IonLabel, IonButton, IonSpinner, IonNote,
  IonAvatar, IonIcon, onIonViewDidEnter, useIonRouter
} from "@ionic/vue";
import { peopleOutline, checkmarkCircleOutline } from "ionicons/icons";
import { ref } from "vue";
import axios from "axios";
import { FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";

interface PublicRoom {
  id: string;
  name: string;
  description: string | null;
  filePath: string | null;
  memberCount: number;
}

const ionRouter = useIonRouter();
const rooms = ref<PublicRoom[]>([]);
const search = ref("");
const loading = ref(false);
const joinedRoomIds = ref<Set<string>>(new Set());
const pendingRoomIds = ref<Set<string>>(new Set());

const http = () => axios.create({
  baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + localStorage.getItem("accessToken"),
  },
});

const loadRooms = async () => {
  loading.value = true;
  try {
    const params = search.value.trim() ? { search: search.value.trim() } : {};
    const res = await http().get(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.publicRooms, { params });
    if (res.status === 200) rooms.value = res.data;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const requestJoin = async (room: PublicRoom) => {
  if (pendingRoomIds.value.has(room.id)) return;
  try {
    await http().post(`${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${room.id}/join-requests`);
    pendingRoomIds.value.add(room.id);
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? "";
    if (msg.includes("already pending")) {
      pendingRoomIds.value.add(room.id);
    }
  }
};

const getRoomImageUrl = (filePath: string | null) => {
  if (!filePath) return null;
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.room_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${filePath}`;
};

onIonViewDidEnter(() => loadRooms());
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar style="--background: transparent">
        <ion-buttons slot="start">
          <ion-back-button default-href="/rooms" />
        </ion-buttons>
        <ion-title>Найти комнату</ion-title>
      </ion-toolbar>
      <ion-toolbar style="--background: transparent">
        <ion-searchbar
            v-model="search"
            placeholder="Поиск по названию"
            debounce="400"
            @ionInput="loadRooms"
            style="--background: rgba(255,255,255,0.07)"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="loading" class="spinner-wrap">
        <ion-spinner name="crescent" />
      </div>

      <div v-else-if="!rooms.length" class="empty-state">
        <p>Публичных комнат не найдено</p>
      </div>

      <ion-list v-else lines="none" class="room-list">
        <ion-item
            v-for="room in rooms"
            :key="room.id"
            class="room-item"
        >
          <ion-avatar slot="start" class="room-avatar">
            <img v-if="getRoomImageUrl(room.filePath)" :src="getRoomImageUrl(room.filePath)" alt="room" />
            <div v-else class="room-avatar__placeholder">{{ room.name[0] }}</div>
          </ion-avatar>

          <ion-label class="room-label">
            <h2 class="room-name">{{ room.name }}</h2>
            <p v-if="room.description" class="room-desc">{{ room.description }}</p>
            <p class="room-members">
              <ion-icon :icon="peopleOutline" class="members-icon" />
              {{ room.memberCount }} участников
            </p>
          </ion-label>

          <div slot="end" class="action-col">
            <div v-if="joinedRoomIds.has(room.id)" class="status-chip status-chip--joined">
              <ion-icon :icon="checkmarkCircleOutline" />
              В комнате
            </div>
            <div v-else-if="pendingRoomIds.has(room.id)" class="status-chip status-chip--pending">
              Ожидание
            </div>
            <ion-button
                v-else
                size="small"
                shape="round"
                @click="requestJoin(room)"
            >
              Вступить
            </ion-button>
          </div>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.spinner-wrap {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
}

.room-list {
  padding: 8px 0;
}

.room-item {
  --background: rgba(255, 255, 255, 0.04);
  --border-radius: 16px;
  margin: 6px 12px;
  border-radius: 16px;
  align-items: flex-start;
}

.room-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.room-avatar__placeholder {
  width: 100%;
  height: 100%;
  background: var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  border-radius: 12px;
}

.room-label {
  flex: 1;
  min-width: 0;
}

.room-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ion-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-desc {
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.6);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-members {
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.45);
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.members-icon {
  font-size: 13px;
}

.action-col {
  display: flex;
  align-items: center;
  padding-left: 8px;
  flex-shrink: 0;
}

.status-chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-chip--pending {
  background: rgba(var(--ion-color-warning-rgb), 0.15);
  color: var(--ion-color-warning);
}

.status-chip--joined {
  background: rgba(var(--ion-color-success-rgb), 0.15);
  color: var(--ion-color-success);
}
</style>
