<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonPage,
  IonToolbar,
  toastController
} from "@ionic/vue";

import {TEXTS} from "@/config/localisations";
import {computed, ref} from "vue";
import 'swiper/css';
import '@ionic/vue/css/ionic-swiper.css';
import {arrowBack} from "ionicons/icons";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRouter} from "vue-router";
import {persistAuthTokens} from "@/utils/authTokens";

const router = useRouter();

// Управление шагами
const step = ref(0);
const stepsCount = 2; // Всего шагов

// Значения полей
const inputValue = ref("");
const email = ref("");
const password = ref("");

// Ошибки валидации
const errors = ref<{ color: string; text: string }[]>([]);

const currentPlaceholder = computed(() => {
  switch (step.value) {
    case 0:
      return TEXTS.email.rus;
    case 1:
      return TEXTS.password.rus;
    default:
      return '';
  }
});

const currentLabel = computed(() => {
  switch (step.value) {
    case 0:
      return TEXTS.enterEmail.rus;
    case 1:
      return TEXTS.enterPassword.rus;
    default:
      return '';
  }
});

function nextStep() {
  validate();
  if (errors.value.length === 0) {
    switch (step.value) {
      case 0:
        email.value = inputValue.value;
        break;
      case 1:
        password.value = inputValue.value;
        login();
        break;
    }
    inputValue.value = '';
    if (step.value < stepsCount - 1) step.value++;
  }
}

function previousStep() {
  if (step.value > 0) step.value--;
  switch (step.value) {
    case 1:
      inputValue.value = '';
      break;
    case 2:
      inputValue.value = '';
      break;
    case 3:
      inputValue.value = '';
      break;
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


const login = async () => {
  try {
    const http = axios.create({
      baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
      headers: {
        "Content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

    const res = await http.post(GATEWAY_INTEGRATION_ROUTES.auth, {
      email: email.value,
      password: password.value,
    });

    if (res.status >= 200 && res.status < 300) {
      persistAuthTokens(res.data.accessToken, res.data.refreshToken);

      await router.replace('/rooms');
    }
  } catch (error) {
    if (error.response?.status == 406) {
      await showInvalidValidationToast(error.response?.data?.code)
    } else {
      await showInternalErrorToast()
    }

    console.error("Login failed:", error);
  }

  async function showInvalidValidationToast(code: any) {
    const toast = await toastController.create({
      message: code,
      duration: 1500,
      position: 'top'
    })
    await toast.present();
  }

  async function showInternalErrorToast() {
    const toast = await toastController.create({
      message: TEXTS.internalError.rus,
      duration: 1500,
      position: 'top'
    })
    await toast.present();
  }
}

</script>

<template>
  <ion-page>
    <ion-content class="ion-padding" color="dark">
      <ion-header>
        <ion-toolbar style="--background: transparent">
          <ion-buttons slot="start">
            <ion-back-button v-show="step === 0"></ion-back-button>
            <ion-button v-show="step !== 0" size="small" @click="previousStep">
              <ion-icon slot="icon-only" :icon="arrowBack"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <div class="wrapper">
        <div class="input-block">
          <h1 class="input-header">{{ currentLabel }}</h1>
          <div class="button-block">
            <ion-input
                :type="step === 1 || step === 2 ? 'password' : 'text'"
                fill="outline"
                color="primary"
                :placeholder="currentPlaceholder"
                :clear-input="true"
                v-model="inputValue"
            ></ion-input>
            <div class="alerts" v-if="errors.length > 0">
              <ion-chip :color="error.color" v-for="(error, index) in errors" :key="index">
                {{ error.text }}
              </ion-chip>
            </div>
            <ion-button shape="round" class="button-list-element" color="primary" @click="nextStep">
              {{ TEXTS.next.rus }}
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
