<script setup lang="ts">
import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/vue";
import MasterFilesView from "@/views/master/tabs/MasterFilesView.vue";
</script>

<template>
  <ion-page>
    <ion-header :translucent="false">
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button />
        </ion-buttons>
        <ion-title>Файлы</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding" color="dark">
      <MasterFilesView />
    </ion-content>
  </ion-page>
</template>

