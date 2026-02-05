<script setup lang="ts">
import {IonButton, IonIcon} from "@ionic/vue";
import {logOutOutline} from "ionicons/icons";
import {useAppRouter} from "@/composables/useAppRouter";

const { replace } = useAppRouter();

function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");

  replace('/welcome');
}

</script>

<template>
  <ion-button size="small" @click="logout()">
    <ion-icon slot="icon-only" :ios="logOutOutline" :md="logOutOutline"></ion-icon>
  </ion-button>
</template>


<style scoped>
</style>
