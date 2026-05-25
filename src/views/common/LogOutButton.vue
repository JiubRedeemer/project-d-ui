<script setup lang="ts">
import {IonButton, useIonRouter} from "@ionic/vue";

import {personCircleOutline} from "ionicons/icons";

const ionRouter = useIonRouter();


function openProfile() {
  ionRouter.navigate('/profile', 'forward', 'push');
}

</script>

<template>
  <ion-button fill="clear" color="light" size="small" class="header-action-btn" @click="openProfile()">
    <ion-icon slot="icon-only" :icon.prop="personCircleOutline" color="light"/>
  </ion-button>
</template>


<style scoped>
</style>
