<script setup lang="ts">

import {IonBackButton, IonButtons, IonTitle, IonToolbar} from "@ionic/vue";
import LogOutButton from "@/views/common/LogOutButton.vue";
import {useCharacterStore} from "@/stores/CharacterStore"


const characterStore = useCharacterStore()




</script>

<template :style="{ marginBottom: subheaderVisible ? '200px' : '0' }">
  <ion-toolbar color="dark">
    <ion-buttons slot="start">
      <ion-back-button/>
    </ion-buttons>

    <ion-title slot="start">
      <div class="header-content" v-if="characterStore.character">
        <div class="name-block">{{ characterStore.character?.name }}</div>
        <div class="race-class-block">{{ characterStore.character?.raceInfo?.name }} -
          {{ characterStore.character?.clazzInfo?.name }}
        </div>
      </div>
    </ion-title>

    <ion-buttons slot="end">
      <div class="level-container">
        <div class="level-circle">
          <div class="level">{{ characterStore.character?.level?.level }}</div>
          <div class="experience">{{
              characterStore.character?.level?.xp
            }}/{{ characterStore.character?.level?.nextLevelXp }}
          </div>
        </div>
      </div>
      <LogOutButton/>
    </ion-buttons>
  </ion-toolbar>
</template>

<style scoped>
.header-content {
  display: flex;
  flex-direction: column;
  align-items: start;
}

.name-block {
  font-size: 14px;
  font-weight: bold;
}

.race-class-block {
  font-size: 10px;
  color: var(--ion-color-primary);
}

.level-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
}

.level-circle {
  position: relative;
  width: 40px; /* Размер круга */
  height: 40px;
  border-radius: 50%;
  background-color: var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: bold;
  text-align: center;
  box-sizing: border-box;
}

.level {
  font-size: 16px; /* Размер уровня в центре */
  color: var(--ion-color-primary-contrast);
}

.experience {
  position: absolute;
  bottom: -5px; /* Смещение текста опыта ближе к обводке */
  font-size: 12px; /* Мелкий текст для опыта */
  color: #ffffff;
  background-color: var(--ion-color-secondary); /* Цвет фона для синхронности с кругом */
  padding: 0 4px;
  border-radius: 4px;
}


</style>
