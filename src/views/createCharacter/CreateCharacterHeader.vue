<script setup lang="ts">

import {arrowBack} from "ionicons/icons";
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonProgressBar,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import LogOutButton from "@/views/common/LogOutButton.vue";

const props = defineProps(['headerText', 'step'])

</script>

<template>
  <ion-header>
    <ion-buttons>
      <ion-toolbar style="--background: transparent">
        <ion-title>{{ props.headerText }}</ion-title>
        <ion-buttons slot="start">
          <ion-back-button v-if="props.step.current == 0"></ion-back-button>
          <ion-button v-show="props.step.current != 0" size="small"
                      @click="
                      // eslint-disable-next-line vue/no-mutating-props
                      props.step.current--">
            <ion-icon slot="icon-only" :icon="arrowBack"></ion-icon>
          </ion-button>
          <ion-button v-show="props.step.current == 0" size="small">
            <ion-back-button></ion-back-button>
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <LogOutButton/>
        </ion-buttons>
        <ion-progress-bar :value="props.step.current / props.step.names.length"></ion-progress-bar>
      </ion-toolbar>
    </ion-buttons>
  </ion-header>
</template>

<style scoped>

</style>
