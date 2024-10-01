<template>
  <div>
    <div class="wrapper">
      <div class="ability-header">
        <ion-chip>
          <ion-icon :icon="invertModeOutline" color="warning"></ion-icon>
          <ion-label>{{ totalCoins }}</ion-label>
        </ion-chip>
      </div>
      <div class="ability-list">
        <ion-list color="dark">
          <ion-item color="dark">
            <div class="ability-score-round" slot="start">
              <span class="ability-score-value">22</span>
            </div>
            <div class="ability-description">
              <ion-label slot="start">Название характеристики</ion-label>
              <ion-note slot="start">Модификатор</ion-note>
            </div>
            <div class="ability-buttons">
              <ion-button shape="round" size="default">
                <ion-icon slot="icon-only" :icon="removeOutline"></ion-icon>
              </ion-button>
              <ion-button shape="round" size="default">
                <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
              </ion-button>
            </div>
          </ion-item>
        </ion-list>
      </div>
    </div>
  </div>
  <ion-fab slot="fixed" vertical="bottom" horizontal="end">
    <ion-fab-button color="primary">
      <ion-icon :icon="arrowForwardOutline" color="light"></ion-icon>
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import {IonChip, IonFab, IonFabButton, IonIcon, IonLabel, IonList} from "@ionic/vue";
import {onMounted, ref} from "vue";
import {addOutline, arrowForwardOutline, invertModeOutline, removeOutline} from "ionicons/icons";
import axios from "axios";
import {useRoute} from "vue-router";
import {INTEGRATION_ROUTES} from "@/config/integrationRoutes";

const route = useRoute()

const classes = ref([]);
let totalCoins = 27;

const props = defineProps({
  characterData: Object,
  currentStep: Object,
});

onMounted(async () => {
  try {
    const response = await axios.get(
        INTEGRATION_ROUTES.baseURL + INTEGRATION_ROUTES.api + INTEGRATION_ROUTES.rooms + '/' + route.params.roomId + INTEGRATION_ROUTES.roomAbilities,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
          },
        }
    );
    classes.value = response.data;
  } catch (error) {

    console.error("Ошибка при получении данных:", error);
  }
});

</script>

<style scoped>

.wrapper {
  display: flex;
  flex-direction: column;
}

.ability-list ion-list {
  background: transparent;
}

.ability-header ion-chip {
  float: right;
}

.ability-description {
  display: flex;
  flex-direction: column;
}

.ability-score-round {
  width: 5vh;
  height: 5vh;
  background-color: var(--ion-color-primary); /* Цвет фона */
  border-radius: 50%; /* Форма круга */
  display: flex;
  align-items: center;
  justify-content: center;
}

.ability-score-value {
  color: white; /* Цвет буквы */
  font-weight: bold;
}

.ability-buttons {
  display: flex;
  flex-direction: row;
  margin-left: auto;
}

ion-item{
  --padding-end: 0px;
  --inner-padding-end: 0px;
}
</style>
