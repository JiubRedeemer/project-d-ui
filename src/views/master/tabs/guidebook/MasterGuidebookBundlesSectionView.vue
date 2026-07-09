<script setup lang="ts">
import {IonContent, IonPage} from "@ionic/vue";
import MasterGuidebookView from "@/views/master/tabs/MasterGuidebookView.vue";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
</script>

<template>
  <ion-page>
    <RoomsHeader header-name="Наборы" force-back-button />
    <ion-content color="dark" class="ion-padding">
      <MasterGuidebookView locked-section="bundles" />
    </ion-content>
  </ion-page>
</template>
