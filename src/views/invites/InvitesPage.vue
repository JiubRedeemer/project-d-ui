<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  onIonViewDidEnter
} from "@ionic/vue";
import {checkmarkCircleOutline, closeCircleOutline} from "ionicons/icons";
import {TEXTS} from "@/config/localisations";
import {ref} from "vue";
import InvitesHeader from "@/views/invites/InvitesHeader.vue";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import axios from "axios";

// Описание модели данных для приглашений
interface Owner {
  id: string;
  username: string;
}

interface Room {
  id: string;
  name: string;
  description: string;
}

interface Invite {
  id: string;
  owner: Owner;
  room: Room;
}

// Переменная для хранения списка приглашений
const invites = ref<Invite[]>([]);

const setupRooms = async () => {
  const http = axios.create({
    baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
    headers: {
      "Content-type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("accessToken"),
    },
  });

  try {
    const res = await http.get(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.invites);

    if (res.status === 200) {
      invites.value = res.data;
    }
  } catch (error) {
    console.error("Ошибка при загрузке данных:", error);
  }
};

// Метод для принятия приглашения
const acceptInvite = async (inviteId: string) => {
  const http = axios.create({
    baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
    headers: {
      "Content-type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("accessToken"),
    },
  });

  try {
    const res = await http.post(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.acceptInvite, {
      inviteId: inviteId,
    });

    if (res.status === 200) {
      // Обновление списка приглашений после успешного принятия
      invites.value = invites.value.filter(invite => invite.id !== inviteId);
    }
  } catch (error) {
    console.error(`Ошибка при принятии приглашения с ID: ${inviteId}`, error);
  }
};

// Метод для отклонения приглашения
const declineInvite = async (inviteId: string) => {
  const http = axios.create({
    baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
    headers: {
      "Content-type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("accessToken"),
    },
  });

  try {
    const res = await http.post(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.declineInvite, {
      inviteId: inviteId,
    });

    if (res.status === 200) {
      // Обновление списка приглашений после успешного отклонения
      invites.value = invites.value.filter(invite => invite.id !== inviteId);
    }
  } catch (error) {
    console.error(`Ошибка при отклонении приглашения с ID: ${inviteId}`, error);
  }
};

// Выполнение запроса при монтировании компонента
onIonViewDidEnter(() => {
  setupRooms();
});
</script>

<template>
  <ion-page>
    <InvitesHeader></InvitesHeader>
    <ion-content :fullscreen="true" color="dark">
      <ion-list v-show="invites.length !== 0" class="invite-room-list">
        <ion-item v-for="(invite, index) in invites" :key="index" :button="true" color="dark">
          <ion-buttons slot="end">
            <ion-button size="large" @click="declineInvite(invite.id)">
              <ion-icon aria-hidden="true" color="danger" :icon="closeCircleOutline" slot="icon-only"></ion-icon>
            </ion-button>
            <ion-button size="large" @click="acceptInvite(invite.id)">
              <ion-icon aria-hidden="true" color="success" :icon="checkmarkCircleOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-label>
            <h1 class="invite-room-name">{{ invite.room.name }}</h1>
            <p class="invite-room-description">{{ invite.room.description }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <div class="invite-room-list-placeholder-wrapper" v-show="invites.length === 0">
        <div class="invite-room-list-placeholder">{{ TEXTS.emptyInviteList.rus }}</div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.invite-room-list {
  background: transparent;
}

.invite-room-list-placeholder-wrapper {
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
