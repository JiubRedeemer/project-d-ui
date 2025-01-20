<script setup lang="ts">

import {bonfireOutline, diceOutline, gitCompareOutline, shieldOutline} from "ionicons/icons";
import {IonIcon, IonLabel} from "@ionic/vue";
import HpBar from "@/views/common/HpBar.vue";
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
        INTEGRATION_ROUTES.baseURL + INTEGRATION_ROUTES.api + INTEGRATION_ROUTES.rooms + '/' + route.params.roomId + INTEGRATION_ROUTES.characters + '/' + route.params.characterId + INTEGRATION_ROUTES.charactersSubheader,
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

<template>

  <div class="subheader">
    <div class="start-icons">
      <div class="armory-class">
        <ion-icon class="armory-class-icon" slot="icon-only" :icon="shieldOutline" color="light"></ion-icon>
        <span class="armory-class-value">{{ characterDto?.armoryClass }}</span>
      </div>
      <div class="speed">
        <ion-icon class="speed-icon" slot="icon-only" :icon="gitCompareOutline" color="light"></ion-icon>
        <span class="speed-value">{{ characterDto?.speed }}</span>
      </div>
    </div>
    <div class="center-icons">
      <div class="inspiration">
        <div class="subheader-chip">
          <ion-label>Вдохновение:</ion-label>
          <ion-icon :icon="diceOutline" color="primary"></ion-icon>
        </div>
      </div>
      <div class="initiative">
        <div class="subheader-chip">
          <ion-label>Инициатива:</ion-label>
          <ion-label>{{ characterDto?.initiative }}</ion-label>
        </div>
      </div>
    </div>
    <div class="end-icons">
      <div class="rest">
        <ion-icon class="rest-icon" slot="icon-only" :icon="bonfireOutline" color="light">
        </ion-icon>
      </div>
      <div class="hp">
        <hp-bar class="hp-icon" :currentHp="characterDto?.health.currentHp ? characterDto?.health.currentHp : 1"
                :maxHp="characterDto?.health.maxHp != null ? characterDto?.health.maxHp : 1"
                :tempHp="characterDto?.health.tempHp ? characterDto?.health.tempHp : 1"/>
      </div>
    </div>
  </div>
</template>

<style scoped>
.subheader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  border-bottom-right-radius: 100px;
  border-bottom-left-radius: 100px;
}

.start-icons,
.end-icons {
  display: flex;
  gap: 10px;
}

.end-icons {
  margin-left: auto;
}

.armory-class {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 50px;
}

.armory-class-icon {
  width: 100%;
  height: 100%;
}

.armory-class-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 14px;
  font-weight: bold;
  pointer-events: none;
}

.speed {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 50px;
}

.speed-icon {
  width: 100%;
  height: 100%;
}

.speed-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 14px;
  font-weight: bold;
  pointer-events: none;
}

.hp {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 50px;
}

.hp-icon {
  width: 100%;
  height: 100%;
}

.rest {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 50px;
}

.rest-icon {
  width: 100%;
  height: 100%;
}

.center-icons {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
  flex-direction: column;
}

.subheader-chip {
  background-color: var(--ion-color-medium-tint);
  border-radius: 10px;
  width: 15vh;
  height: 20px;
  margin-bottom: 10px;
  justify-content: space-between;
  display: flex;
  padding: 5px;
  align-items: center;
}
</style>
