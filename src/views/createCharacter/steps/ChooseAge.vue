<template>

  <div class="wrapper">
    <div class="image-wrapper">

      <img :src="backgroundImage" class="background-large-image"
           alt="Фоновое изображение"/>
      <div class="background-large-image-overlay">
      </div>
    </div>
    <ion-input
        type="number"
        fill="outline"
        color="primary"
        :placeholder="TEXTS.whatIsYourAge.rus"
        :clear-input="true"
        v-model="inputAge"
        class="input-block"
    >
      <ion-text slot="end">
        {{ TEXTS.ageEI.rus }}
      </ion-text>
    </ion-input>
  </div>
  <div class="add-new-button">
    <ion-button
        size="large"
        shape="round"
        color="primary"
        @click="onChooseAge(inputAge)"
    >
      <ion-icon slot="icon-only" :icon="arrowForwardOutline" />
    </ion-button>
  </div>
</template>

<script setup lang="ts">
import {IonButton, IonFab, IonFabButton, IonIcon, IonInput, IonText} from "@ionic/vue";
import {arrowForwardOutline} from "ionicons/icons";
import {TEXTS} from "@/config/localisations";
import backgroundImage from "@/static/images/backgrounds/image_SELECT_AGE.png";
import {ref} from "vue";

const inputAge = ref();

const props = defineProps({
  characterData: Object,
  currentStep: Object
});

function onChooseAge(age: number) {
  if (age != null && age > 0) {
    if (props.characterData) {
      // eslint-disable-next-line vue/no-mutating-props
      props.characterData.age = age;
    }
    if (props.currentStep) {
      // eslint-disable-next-line vue/no-mutating-props
      props.currentStep.current = props.currentStep.current + 1
    }
  } else {
    console.log("Field can't be empty")
  }
}
</script>

<style scoped>
.image-wrapper {
  position: relative; /* Positioning context for the overlay */
  width: 100%; /* Ensure it takes the full width of the container */
}

.background-large-image {
  width: 100%;
  height: auto;
  object-fit: cover;
  border-radius: 7%;
}

.background-large-image-overlay {
  position: absolute; /* Position absolutely within the image wrapper */
  bottom: 0; /* Align to the bottom */
  left: 0;
  right: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 100%); /* Gradient overlay */
  color: white; /* Text color */
  text-align: center; /* Center text */
  padding: 20px; /* Padding for the text */
  border-radius: 0 0 7% 7%; /* Match border radius of the image */
}

.input-block {
  margin-top: 5%;
}

@media (min-width: 1024px) {
  .wrapper {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .image-wrapper {
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
    background: var(--ion-color-medium);
  }

  .background-large-image {
    border-radius: 0;
    max-height: 420px;
    width: 100%;
    object-fit: cover;
    display: block;
  }

  .background-large-image-overlay {
    border-radius: 0;
    padding: 12px;
  }

  .input-block {
    margin-top: 0;
  }

  ion-fab[horizontal="end"] {
    right: 22px;
    bottom: 18px;
  }
}

.add-new-button {
  z-index: 10;
  position: fixed;
  bottom: 0;
  right: 20px;
  width: 100%;
  display: flex;
  justify-content: end;
  align-items: center;
  padding: 8px 0 max(8px, env(safe-area-inset-bottom, 0));
}

</style>
