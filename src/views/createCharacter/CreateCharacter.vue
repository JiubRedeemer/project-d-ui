<script setup lang="ts">
import {IonContent, IonPage} from "@ionic/vue";
import ChooseRace from "./steps/ChooseRace.vue";
import {ref, watch} from "vue";
import CreateCharacterHeader from "@/views/createCharacter/CreateCharacterHeader.vue";
import ChooseName from "@/views/createCharacter/steps/ChooseName.vue";
import {HEADERS} from "@/config/localisations";
import ChooseAge from "@/views/createCharacter/steps/ChooseAge.vue";
import ChooseHeight from "@/views/createCharacter/steps/ChooseHeight.vue";
import ChooseWeight from "@/views/createCharacter/steps/ChooseWeight.vue";
import ChooseHistory from "@/views/createCharacter/steps/ChooseHistory.vue";
import ChoosePersonality from "@/views/createCharacter/steps/ChoosePersonality.vue";
import ChooseAttachments from "@/views/createCharacter/steps/ChooseAttachments.vue";
import ChooseWeaknesses from "@/views/createCharacter/steps/ChooseWeaknesses.vue";
import ChooseRelationships from "@/views/createCharacter/steps/ChooseRelationships.vue";
import ChooseIdeals from "@/views/createCharacter/steps/ChooseIdeals.vue";
import ChooseClass from "@/views/createCharacter/steps/ChooseClass.vue";
import ChooseAbilities from "@/views/createCharacter/steps/ChooseAbilities.vue";
import ChooseSkills from "@/views/createCharacter/steps/ChooseSkills.vue";
import {useRoute} from "vue-router";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

const route = useRoute();

// Константы для шагов
const step = ref({
  current: 0,
  names: [
    HEADERS.race.rus,
    HEADERS.name.rus,
    HEADERS.age.rus,
    HEADERS.height.rus,
    HEADERS.weight.rus,
    HEADERS.background.rus,
    HEADERS.traits.rus,
    HEADERS.ideals.rus,
    HEADERS.bonds.rus,
    HEADERS.flaws.rus,
    HEADERS.relationships.rus,
    HEADERS.class.rus,
    HEADERS.characteristics.rus,
    HEADERS.abilities.rus
  ]
});

// Данные персонажа
const characterData = ref({
  race: {},
  name: "",
  age: null,
  height: null,
  weight: null,
  history: "",
  personality: "",
  ideals: "",
  attachments: "",
  weaknesses: "",
  relationships: "",
  clazz: {},
  abilities: [{}],
  skills: [{}],
});

const FINAL_STEP = 14;
watch(
    () => step.value.current,
    async (newStep) => { // Добавляем async
      if (newStep === FINAL_STEP) {
        const convertedData = convertCharacterData();
        try {
          await axios.put(
              GATEWAY_INTEGRATION_ROUTES.baseURL +
              GATEWAY_INTEGRATION_ROUTES.api +
              GATEWAY_INTEGRATION_ROUTES.rooms +
              '/' + route.params.roomId +
              GATEWAY_INTEGRATION_ROUTES.characters,
              // Данные запроса
              convertedData,
              // Конфигурация запроса
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + localStorage.getItem("accessToken"),
                },
              }
          );
        } catch (error) {
          console.error("Ошибка при сохранении персонажа:", error);
        }
      }
    }
);


// Конвертация данных персонажа
function convertCharacterData() {
  return {
    roomId: route.params.roomId, // Или заменить на динамическое значение
    name: characterData.value.name,
    clazzCode: characterData.value.clazz?.code || "",
    raceCode: characterData.value.race?.code || "",
    abilities: characterData.value.abilities.map((ability: any) => ({
      code: ability.code,
      value: ability.value,
    })),
    skills: characterData.value.skills.map((skillCode: any) => ({
      code: skillCode,
    })),
    age: parseInt(characterData.value.age, 10),
    height: parseInt(characterData.value.height, 10),
    weight: parseInt(characterData.value.weight, 10),
    attachments: characterData.value.attachments,
    history: characterData.value.history,
    ideals: characterData.value.ideals,
    personality: characterData.value.personality,
    relationships: characterData.value.relationships,
    weaknesses: characterData.value.weaknesses,
  };
}
</script>

<template>
  <ion-page>
    <ion-content class="ion-padding" color="dark">
      <div class="header-block">
        <CreateCharacterHeader :header-text="step.names[step.current]" :step="step"/>
      </div>
      <div v-show="step.current == 0">
        <ChooseRace :characterData="characterData" :currentStep="step"/>
      </div>
      <div v-show="step.current == 1">
        <ChooseName :characterData="characterData" :currentStep="step"/>
      </div>
      <div v-show="step.current == 2">
        <ChooseAge :characterData="characterData" :currentStep="step"/>
      </div>
      <div v-show="step.current == 3">
        <ChooseHeight :characterData="characterData" :currentStep="step"/>
      </div>
      <div v-show="step.current == 4">
        <ChooseWeight :characterData="characterData" :currentStep="step"/>
      </div>
      <div v-show="step.current == 5">
        <ChooseHistory :characterData="characterData" :currentStep="step"/>
      </div>
      <div v-show="step.current == 6">
        <ChoosePersonality :characterData="characterData" :currentStep="step"/>
      </div>
      <div v-show="step.current == 7">
        <ChooseIdeals :characterData="characterData" :currentStep="step"/>
      </div>
      <div v-show="step.current == 8">
        <ChooseAttachments :characterData="characterData" :currentStep="step"/>
      </div>
      <div v-show="step.current == 9">
        <ChooseWeaknesses :characterData="characterData" :currentStep="step"/>
      </div>
      <div v-show="step.current == 10">
        <ChooseRelationships :characterData="characterData" :currentStep="step"/>
      </div>
      <div v-show="step.current == 11">
        <ChooseClass :characterData="characterData" :currentStep="step"/>
      </div>
      <div v-show="step.current == 12">
        <ChooseAbilities :characterData="characterData" :currentStep="step"/>
      </div>
      <div v-show="step.current == 13">
        <ChooseSkills :characterData="characterData" :currentStep="step"/>
      </div>
    </ion-content>
  </ion-page>
</template>

<style>
.header-block {
  padding-bottom: 3%;
}
</style>
