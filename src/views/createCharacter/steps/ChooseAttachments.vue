<template>

  <div class="wrapper">
    <div class="image-wrapper">

      <img :src="backgroundImage" class="background-large-image"
           alt="Фоновое изображение"/>
      <div class="background-large-image-overlay">
      </div>
    </div>
    <ion-textarea
        shape="round"
        type="text"
        fill="outline"
        color="primary"
        :placeholder="TEXTS.whatIsYourAttachments.rus"
        :clear-input="true"
        v-model="inputAttachments"
        class="input-block"
        :rows="15"
    ></ion-textarea>
  </div>

  <ion-fab slot="fixed" vertical="bottom" horizontal="end" @click="onChooseAttachments(inputAttachments)">
    <ion-fab-button color="primary">
      <ion-icon :icon="arrowForwardOutline" color="dark"></ion-icon>
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import {IonFab, IonFabButton, IonIcon, IonTextarea} from "@ionic/vue";
import {arrowForwardOutline} from "ionicons/icons";
import {TEXTS} from "@/config/localisations";
import backgroundImage from "@/static/images/backgrounds/image_SELECT_ATTACHMENTS.png";
import {ref} from "vue";

const inputAttachments = ref("");

const props = defineProps({
  characterData: Object,
  currentStep: Object
});

function onChooseAttachments(attachments: string) {
  if (attachments != null && attachments.length > 0) {
    if (props.characterData) {
      // eslint-disable-next-line vue/no-mutating-props
      props.characterData.attachments = attachments;
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
  height: 100%;
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
    max-height: 360px;
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
    min-height: 260px;
  }

  ion-fab[horizontal="end"] {
    right: 22px;
    bottom: 18px;
  }
}


</style>
