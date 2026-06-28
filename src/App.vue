<template>
  <ion-app>
    <OfflineIndicator />
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import OfflineIndicator from '@/components/OfflineIndicator.vue';
</script>
