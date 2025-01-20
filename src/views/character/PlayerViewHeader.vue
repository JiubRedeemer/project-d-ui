<script setup lang="ts">

import {menu} from "ionicons/icons";
import {IonButton, IonButtons, IonIcon, IonTitle, IonToolbar} from "@ionic/vue";
import LogOutButton from "@/views/common/LogOutButton.vue";
import {onMounted, ref} from "vue";
import axios from "axios";
import {INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {Character} from "@/components/models/response/Character";
import {useRoute} from "vue-router";

const characterDto = ref<Character>();
const route = useRoute()

onMounted(async () => {
  try {
    const response = await axios.get(
        INTEGRATION_ROUTES.baseURL + INTEGRATION_ROUTES.api + INTEGRATION_ROUTES.rooms + '/' + route.params.roomId + INTEGRATION_ROUTES.characters + '/' + route.params.characterId + INTEGRATION_ROUTES.charactersHeader,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
          },
        }
    );
    characterDto.value = response.data;
  } catch (error) {

    console.error("Ошибка при получении данных:", error);
  }
});

</script>

<template :style="{ marginBottom: subheaderVisible ? '200px' : '0' }">
  <ion-toolbar style="--background: transparent">
    <ion-buttons slot="start">
      <ion-button>
        <ion-icon slot="icon-only" :icon="menu"></ion-icon>
      </ion-button>
    </ion-buttons>

    <ion-title slot="start">
      <div class="header-content">
        <div class="name-block">{{ characterDto?.name }}</div>
        <div class="race-class-block">{{ characterDto?.raceInfo.name }} - {{ characterDto?.clazzInfo.name }}</div>
      </div>
    </ion-title>

    <ion-buttons slot="end">
      <div class="level-container">
        <div class="level-circle">
          <div class="level">{{ characterDto?.level.level }}</div>
          <div class="experience">{{ characterDto?.level.xp }}/{{ characterDto?.level.nextLevelXp }}</div>
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
