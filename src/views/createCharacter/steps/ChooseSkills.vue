<template>
  <div>
    <div class="wrapper">
      <ion-list style="background: transparent">
        <ion-item color="dark">
          <ion-select style="width: 100%;" justify="start" aria-label="Fruit" interface="action-sheet"
                      placeholder="Выберите навык">
            <ion-select-option value="ATHL">Атлетика</ion-select-option>
            <ion-select-option value="PERC">Восприятие</ion-select-option>
            <ion-select-option value="SURV">Выживание</ion-select-option>
            <ion-select-option value="INTI">Запугивание</ion-select-option>
            <ion-select-option value="NATR">Природа</ion-select-option>
            <ion-select-option value="ANIM">Уход за животными</ion-select-option>
          </ion-select>
          <div style="margin-left: auto;">+1</div>
        </ion-item>
      </ion-list>
    </div>
  </div>
  <ion-fab slot="fixed" vertical="bottom" horizontal="end" @click="onChooseSkills()">
    <ion-fab-button color="primary">
      <ion-icon :icon="arrowForwardOutline" color="light"></ion-icon>
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import {IonFab, IonFabButton, IonIcon, IonSelect} from "@ionic/vue";
import {arrowForwardOutline} from "ionicons/icons";
import {onMounted} from "vue";
import axios from "axios";
import {INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";

const route = useRoute();

const props = defineProps({
  characterData: Object,
  currentStep: Object,
});

onMounted(async () => {
  try {
    const response = await axios.get(
        `${INTEGRATION_ROUTES.baseURL}${INTEGRATION_ROUTES.api}${INTEGRATION_ROUTES.rooms}/${route.params.roomId}${INTEGRATION_ROUTES.roomSkillsByClassCode}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );

    abilities.value = response.data.map(ability => ({
      ...ability,
      defaultValue: MINIMAL_ABILITY_VALUE // Начальное значение
    }));

    calculateAbilityValues(); // Вычисляем итоговые значения способностей
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
});


function onChooseSkills() {
  console.log(props.characterData)
}

</script>

<style scoped>
.wrapper {
  display: flex;
  flex-direction: column;
}

ion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

ion-select {
  flex-grow: 1;
  margin-right: 10px;
}
</style>
