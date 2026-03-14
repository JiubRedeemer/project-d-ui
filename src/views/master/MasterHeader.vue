<script setup lang="ts">

import {IonBackButton, IonButtons, IonTitle, IonToolbar, onIonViewDidEnter} from "@ionic/vue";
import LogOutButton from "@/views/common/LogOutButton.vue";
import {useRoomStore} from "@/stores/RoomStore";
import {useRoute} from "vue-router";
import {onMounted} from "vue";

const route = useRoute();

const roomStore = useRoomStore()

onIonViewDidEnter(() => {
  roomStore.getRoomInfo(route.params.roomId)
})

onMounted(() => {
  roomStore.getRoomInfo(route.params.roomId)
})

</script>

<template>
  <ion-toolbar color="dark">
    <ion-buttons slot="start">
      <ion-back-button/>
    </ion-buttons>

    <ion-title slot="start">
      <div class="header-content" v-if="roomStore.room">
        <div class="name-block">{{ roomStore.room?.name }}</div>
        <div class="race-class-block">{{ roomStore.room?.ruleType }} -
          {{ roomStore.room?.baseRuleType }}
        </div>
      </div>
    </ion-title>

    <ion-buttons slot="end">
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
  font-size: 16px;
  font-weight: bold;
}

.race-class-block {
  font-size: 10px;
  max-height: 50px;
  color: var(--ion-color-primary);

  white-space: wrap; /* разрешает перенос строк */
}

.level-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  cursor: pointer;
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
