<script setup lang="ts">
import {IonBackButton, IonBadge, IonButton, IonButtons, IonHeader, IonIcon, IonTitle, IonToolbar} from "@ionic/vue";
import {notificationsOutline} from "ionicons/icons";
import {HEADERS} from "@/config/localisations";
import {onBeforeMount, ref} from "vue";
import axios from "axios";
import {INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import LogOutButton from "@/views/common/LogOutButton.vue";

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
        <ion-title>{{ HEADERS.invites.rus }}</ion-title>
        <ion-buttons slot="start">
          <ion-back-button></ion-back-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button size="small">
            <ion-icon slot="icon-only" :ios="notificationsOutline" :md="notificationsOutline">
            </ion-icon>
            <ion-badge color="primary" v-show="notifications.count > 0">{{ notifications.count }}</ion-badge>
          </ion-button>
          <LogOutButton/>
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
