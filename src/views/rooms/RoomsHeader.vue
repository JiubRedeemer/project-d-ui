<script setup lang="ts">
import {IonBadge, IonButton, IonButtons, IonHeader, IonIcon, IonTitle, IonToolbar} from "@ionic/vue";
import {notificationsOutline, personCircleOutline, searchOutline} from "ionicons/icons";
import {HEADERS} from "@/config/localisations";
import {onBeforeMount, ref} from "vue";
import axios from "axios";
import {INTEGRATION_ROUTES} from "@/config/integrationRoutes";

const notifications = ref<{ count: number; }>({count: 0});

const setupNotificationCount = async () => {
  const http = axios.create({
    baseURL: INTEGRATION_ROUTES.baseURL,
    headers: {
      "Content-type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("accessToken")
    },
  });

  const res = await http.get(INTEGRATION_ROUTES.api + INTEGRATION_ROUTES.roomInviteCount);

  console.log(res)
  if (res.status == 200) {
    notifications.value.count = res.data.count
  }
}

onBeforeMount(() => {
  setupNotificationCount()
})

</script>

<template>
  <ion-header>
    <ion-buttons>
      <ion-toolbar style="--background: transparent">
        <ion-title>{{ HEADERS.rooms.rus }}</ion-title>
        <ion-buttons slot="start">
          <ion-button size="small">
            <ion-icon slot="icon-only" :ios="searchOutline" :md="searchOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button size="small">
            <ion-icon slot="icon-only" :ios="notificationsOutline" :md="notificationsOutline">
            </ion-icon>
            <ion-badge color="primary" v-show="notifications.count > 0">{{ notifications.count }}</ion-badge>
          </ion-button>
          <ion-button size="small">
            <ion-icon slot="icon-only" :ios="personCircleOutline" :md="personCircleOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-buttons>
  </ion-header>
</template>

<style scoped>
ion-button {
  ion-badge {
    position: absolute;
    top: -0.4rem;
    right: -0.4rem;

    & ~ ion-icon {
      margin-right: 1.2rem;
    }
  }
}
</style>
