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
import axios from "axios";

const password = ref("");
const errors = ref<{ color: string; text: string }[]>([]);

async function nextStep() {
  validate()
  if (errors.value.length === 0) {
    try {
      const http = axios.create({
        baseURL: "http://localhost:8080",
        headers: {
          "Content-type": "application/json",
        },
      });

      const res = await http.post("/auth", {
        email: localStorage.getItem("userEmail"),
        password: password.value,
      });

      this.responseData = res.data;
      console.log(res)
      if (res.status == 200) {
        localStorage.setItem("accessToken", res.data.accessToken);
        localStorage.setItem("refreshToken", res.data.refreshToken);
      }
    } catch (error) {
      console.error("Registration failed:", error);
      if (error.response.status === 401 || error.response.status === 403) {
        errors.value.push({
          color: 'danger',
          text: 'Неверный пароль'
        });
      } else {
        errors.value.push({
          color: 'danger',
          text: 'Ошибка'
        });
      }
    }
  }
}

function validate() {
  errors.value = [];
  if (!password.value) {
    errors.value.push({
      color: 'danger',
      text: 'Введите пароль'
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
            <h1 class="input-header">Введите пароль</h1>
          <div class="button-block">
            <ion-input type="text" fill="outline" color="tertiary"
                       placeholder="Пароль" :clear-input="true" v-model="password"></ion-input>
            <div class="alerts" v-if="errors.length >=1">
              <ion-chip :color="error.color" v-for="(error, index) in errors" :key="index">{{ error.text }}</ion-chip>
            </div>
            <ion-button shape="round"
                        class="button-list-element"
                        color="tertiary" @click="nextStep()">
              Войти
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
  justify-content: center;
  overflow: auto;
  flex-direction: column;
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
