<script setup lang="ts">

import {IonContent, IonPage} from "@ionic/vue";
import PlayerViewHeader from "@/views/character/PlayerViewHeader.vue";
import AbilitiesView from "@/views/character/tabs/AbilitiesView.vue";
import PlayerViewSubheader from "@/views/character/PlayerViewSubheader.vue";
import {ref} from "vue";

const subheaderVisible = ref(true);

const toggleSubheader = () => {
  subheaderVisible.value = !subheaderVisible.value;
};
</script>

<template>
  <ion-page>
    <ion-header>
      <PlayerViewHeader/>
      <div class="subheader-block" :class="{ openSubheader: subheaderVisible }">
        <PlayerViewSubheader/>
      </div>
      <div class="subheader-show-arrow">
        <div class="arrow" @click="toggleSubheader">🛠</div>
      </div>
    </ion-header>
    <ion-content direction="y" has-bouncing="true" class="ion-padding" color="dark" :scroll-x="false">
      <div class="abilities" :class="{ openSubheader: subheaderVisible }">
        <AbilitiesView/>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>

.abilities.openSubheader {
  margin-top: 15%;
}

.abilities {
  transition: margin-top 0.3s ease;
}

.arrow {
  position: relative;
  transform: translateX(-50%);
  cursor: pointer;
  font-size: 15px;
  color: white;
  user-select: none;
}

.subheader-show-arrow {
  position: relative;
  display: flex;
  justify-content: center;
}

.subheader-block {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background-color: var(--ion-color-dark);
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.subheader-block.openSubheader {
  max-height: 100%; /* Высота в развернутом состоянии */
}

.arrow {
  position: relative;
  transform: translateX(-50%);
  cursor: pointer;
  font-size: 15px;
  color: white;
  user-select: none;
}
</style>
