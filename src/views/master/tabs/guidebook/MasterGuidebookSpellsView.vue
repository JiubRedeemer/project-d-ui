<script setup lang="ts">
import {IonContent, IonPage} from "@ionic/vue";
import {ref} from "vue";
import MasterGuidebookView from "@/views/master/tabs/MasterGuidebookView.vue";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";

const searchQuery = ref("");
</script>

<template>
  <ion-page>
    <RoomsHeader header-name="Заклинания" force-back-button searchable v-model:search-query="searchQuery" />
    <ion-content color="dark" class="ion-padding">
      <MasterGuidebookView locked-section="spells" :external-search-query="searchQuery" />
    </ion-content>
  </ion-page>
</template>
