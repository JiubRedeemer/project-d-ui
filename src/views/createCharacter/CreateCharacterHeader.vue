<script setup lang="ts">

import {arrowBack} from "ionicons/icons";
import {IonBackButton, IonButton, IonButtons, IonIcon, IonHeader, IonToolbar, IonProgressBar, IonTitle} from "@ionic/vue";
import LogOutButton from "@/views/common/LogOutButton.vue";

const props = defineProps(['headerText', 'stepsCount', 'step'])

</script>

<template>
  <ion-header>
    <ion-buttons>
      <ion-toolbar style="--background: transparent">
        <ion-title>{{ props.headerText }}</ion-title>
        <ion-buttons slot="start">
          <ion-back-button v-show="props.step === 0"></ion-back-button>
          <ion-button v-show="props.step !== 0" size="small">
            <ion-icon slot="icon-only" :icon="arrowBack"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <LogOutButton/>
        </ion-buttons>
        <ion-progress-bar :value="props.step / props.stepsCount"></ion-progress-bar>
      </ion-toolbar>
    </ion-buttons>
  </ion-header>
</template>

<style scoped>

</style>
