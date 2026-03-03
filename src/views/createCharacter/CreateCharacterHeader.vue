<script setup lang="ts">
import { computed } from "vue";
import { arrowBack } from "ionicons/icons";
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
import { useRoute } from "vue-router";

const props = withDefaults(
  defineProps<{ headerText: string; step: { current: number; names: string[] }; totalSteps?: number }>(),
  { totalSteps: undefined }
);
const route = useRoute();
const backHref = `/rooms/${route.params.roomId}/characters`;
const progressTotal = computed(() => props.totalSteps ?? props.step.names.length);

</script>

<template>
  <ion-header>
    <ion-buttons>
      <ion-toolbar style="--background: transparent">
        <ion-title>{{ props.headerText }}</ion-title>
        <ion-buttons slot="start">
          <ion-button v-if="props.step.current != 0" size="small" @click="
            // eslint-disable-next-line vue/no-mutating-props
            props.step.current--">
            <ion-icon slot="icon-only" :icon="arrowBack"></ion-icon>
          </ion-button>
          <ion-button v-show="props.step.current == 0" size="small">
            <ion-back-button :default-href="backHref"></ion-back-button>
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <LogOutButton />
        </ion-buttons>
        <ion-progress-bar :value="props.step.current / progressTotal"></ion-progress-bar>
      </ion-toolbar>
    </ion-buttons>
  </ion-header>
</template>

<style scoped></style>
