<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonToolbar
} from "@ionic/vue";
import {ref} from "vue";
import {TEXTS} from "@/config/localisations";

const props = defineProps(['headerText', 'fieldType', 'placeholderText', 'buttonText', 'storageFieldName', 'nextStepLocation', 'nextAction'])


const inputValue = ref("");
const errors = ref<{ color: string; text: string }[]>([]);


function nextStep() {
  validate()
  if (errors.value.length === 0) {
    sessionStorage.setItem(props.storageFieldName, inputValue.value);
    props.nextAction()
  }
}

function validate() {
  errors.value = [];
  if (!inputValue.value) {
    errors.value.push({
      color: 'danger',
      text: TEXTS.fieldCantBeEmpty.rus
    });
  }
}

</script>

<template>
  <ion-page>
    <ion-header>
      <ion-buttons>
        <ion-toolbar style="--background: transparent">
          <ion-buttons slot="start">
            <ion-back-button></ion-back-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-buttons>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="wrapper">
        <div class="input-block">
          <h1 class="input-header">{{ props.headerText }}</h1>
          <div class="button-block">
            <ion-input :type="props.fieldType" fill="outline" color="tertiary"
                       :placeholder="props.placeholderText" :clear-input="true" v-model="inputValue"></ion-input>
            <div class="alerts" v-if="errors?.length >=1">
              <ion-chip :color="error.color" v-for="(error, index) in errors" :key="index">{{ error.text }}</ion-chip>
            </div>
            <ion-button shape="round"
                        class="button-list-element"
                        color="tertiary" @click="nextStep()">
              {{ props.buttonText }}
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-back-button {
  display: block;
}

.wrapper {
  background: black;
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  align-content: center;
  flex-direction: column;
  justify-content: center;
  overflow: auto;
}

.input-block {
  margin-top: -100%;
  width: 80%;
}

.input-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30%;
  font-size: 16px;
}

.button-list-element {
  width: 100%;
  height: 20%;
  min-width: fit-content;
  margin-top: 30px;
}

@media (min-width: 768px) {
  .wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-direction: row;
  }

  .input-block {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 80%;
    margin-top: 0;
  }

  .input-header {
    width: 45%;
    margin-bottom: 0;
    text-align: left;
  }

  .button-block {
    display: flex;
    flex-direction: column;
    width: 45%;
    border-left: 1px solid white;
    padding-left: 10%;
  }

  .button-list-element {
    width: 100%;
    height: auto;
    margin-top: 20px;
  }
}
</style>
