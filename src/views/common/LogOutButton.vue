<script setup lang="ts">
import {IonButton, IonIcon, useIonRouter} from "@ionic/vue";

import {personCircleOutline} from "ionicons/icons";

const ionRouter = useIonRouter();


function openProfile() {
  ionRouter.navigate('/profile', 'forward', 'push');
}

</script>

<template>
  <ion-button size="small" @click="openProfile()">
    <ion-icon slot="icon-only" :ios="personCircleOutline" :md="personCircleOutline"></ion-icon>
  </ion-button>
</template>


<style scoped>
</style>
