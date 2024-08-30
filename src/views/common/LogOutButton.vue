<script setup lang="ts">
import {IonButton, IonIcon, useIonRouter} from "@ionic/vue";

import {logOutOutline} from "ionicons/icons";

const ionRouter = useIonRouter();


function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");

  ionRouter.replace('welcome');
}

</script>

<template>
  <ion-button size="small" @click="logout()">
    <ion-icon slot="icon-only" :ios="logOutOutline" :md="logOutOutline"></ion-icon>
  </ion-button>
</template>


<style scoped>
</style>
