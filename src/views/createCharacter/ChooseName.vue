<template>

    <div class="wrapper">


    </div>
  </div>
  <ion-fab slot="fixed" vertical="bottom" horizontal="end">
    <ion-fab-button color="primary">
      <ion-icon :icon="arrowForwardOutline" color="light" @click="onChooseName(inputName)"></ion-icon>
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import {IonFab, IonFabButton, IonIcon} from "@ionic/vue";
import {arrowForwardOutline} from "ionicons/icons";
import CreateCharacterHeader from "@/views/createCharacter/CreateCharacterHeader.vue";


const props = defineProps({
  characterData: Object,
  currentStep: Object
});

function onChooseRace(code: string) {
  if (props.characterData) {
    // eslint-disable-next-line vue/no-mutating-props
    props.characterData.race = code;
  }
  if (props.currentStep) {
    // eslint-disable-next-line vue/no-mutating-props
    props.currentStep.current = props.currentStep.current + 1
  }
}
</script>

<style scoped>

.selected-slide .race-image {
  transform: scale(1.2);
}

swiper-slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 10vw;
  height: auto;
}
</style>
