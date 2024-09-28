<script setup lang="ts">
import {IonContent, IonPage} from "@ionic/vue";
import ChooseRace from "./ChooseRace.vue";
import {ref} from "vue";
import CreateCharacterHeader from "@/views/createCharacter/CreateCharacterHeader.vue";

const step = ref({
  current: 0,
  names: ['Раса', 'Имя', 'Возраст', 'Рост', 'Вес', 'Предыстория', 'Черты характера', 'Идеалы', 'Привязанности', 'Слабости', 'Отношения', 'Класс', 'Характеристики'],
  total: 10
});

const characterData = ref({
  race: '', // или {}
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
        asdasdasdasdas
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
