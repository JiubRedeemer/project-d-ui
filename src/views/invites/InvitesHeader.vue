<script setup lang="ts">
import {IonBackButton, IonBadge, IonButton, IonButtons, IonHeader, IonTitle, IonToolbar} from "@ionic/vue";
import {notificationsOutline} from "ionicons/icons";
import {HEADERS} from "@/config/localisations";
import {onBeforeMount, ref} from "vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import LogOutButton from "@/views/common/LogOutButton.vue";

const notifications = ref<{ count: number; }>({count: 0});

const setupNotificationCount = async () => {
  const http = axios.create({
    baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
    headers: {
      "Content-type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("accessToken")
    },
  });

  const [invitesRes, joinRes] = await Promise.allSettled([
    http.get(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.roomInviteCount),
    http.get(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.joinRequestsCount),
  ]);

  let total = 0;
  if (invitesRes.status === "fulfilled" && invitesRes.value.status === 200) total += invitesRes.value.data.count ?? 0;
  if (joinRes.status === "fulfilled" && joinRes.value.status === 200) total += joinRes.value.data.count ?? 0;
  notifications.value.count = total;
}

onBeforeMount(() => {
  setupNotificationCount()
})

</script>

<template>
  <ion-header>
    <ion-toolbar style="--background: transparent">
      <ion-buttons slot="start">
        <ion-back-button default-href="/rooms"></ion-back-button>
      </ion-buttons>
      <ion-title>{{ HEADERS.invites.rus }}</ion-title>
      <ion-buttons slot="end">
        <ion-button fill="clear" color="light" size="small" class="header-notify-btn">
          <ion-icon slot="icon-only" :icon.prop="notificationsOutline" color="light"></ion-icon>
          <ion-badge color="primary" v-show="notifications.count > 0">{{ notifications.count }}</ion-badge>
        </ion-button>
        <LogOutButton/>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>

<style scoped>
.header-notify-btn {
  position: relative;
}

.header-notify-btn ion-badge {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
  z-index: 1;
}

.header-notify-btn :deep(ion-icon) {
  font-size: 1.5rem;
  color: var(--ion-color-light);
}
</style>
