<script setup lang="ts">
import {IonContent, IonPage} from "@ionic/vue";
import ChooseRace from "./ChooseRace.vue";
import {ref} from "vue";
import CreateCharacterHeader from "@/views/createCharacter/CreateCharacterHeader.vue";
import ChooseName from "@/views/createCharacter/ChooseName.vue";
import {HEADERS} from "@/config/localisations";
import ChooseAge from "@/views/createCharacter/ChooseAge.vue";
import ChooseHeight from "@/views/createCharacter/ChooseHeight.vue";
import ChooseWeight from "@/views/createCharacter/ChooseWeight.vue";

const step = ref({
  current: 0,
  names: [HEADERS.race.rus,
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
    HEADERS.characteristics.rus],
  total: 10
});

const races = ref({})

const characterData = ref({
  race: {},
  name: '',
  age: null,
  height: null,
  weight: null,
  history: '',
  personality: '',
  ideals: '',
  attachments: '',
  weaknesses: '',
  aliesAndEnemies: '',
  class: '',
  characteristics: {},

  // Добавляем сюда другие свойства, которые будут собираться на разных шагах
});


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

      <!-- Остальные шаги -->


    </ion-content>
  </ion-page>
</template>

<style>
.header-block {
  padding-bottom: 3%;
}

</style>
