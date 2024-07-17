<script lang="ts">
import axios from "axios";

export default {
  data() {
    return {
      errors: [],
      inputUsername: '',
      inputEmail: '',
      inputPassword: '',
      inputMatchingPassword: '',
      responseData: ''
    }
  },
  methods: {
    async register() {
      this.validateInput()
      if (this.errors.length === 0) {


        try {
          const http = axios.create({
            baseURL: "http://localhost:8080/auth",
            headers: {
              "Content-type": "application/json",
            },
          });

          const res = await http.post("/registration", {
            username: this.inputUsername,
            email: this.inputEmail,
            password: this.inputPassword,
            matchingPassword: this.inputMatchingPassword,
          });

          this.responseData = res.data;
          console.log(res.data)
        } catch (error) {
          console.error("Registration failed:", error);
        }
      }
    },
    validateInput() {
      this.errors = []
      this.comparePasswords()
    },
    comparePasswords() {
      if (this.inputPassword !== this.inputMatchingPassword) {
        this.errors.push({
          color: 'danger',
          text: 'Пароли не совпадают'
        })
      }
    }
  }
}
</script>

<template>
  <ion-content class="ion-padding">
    <div class="wrapper">
      <ion-list>
        <ion-item>
          <ion-input label="Имя пользователя" @input="this.inputUsername = $event.target.value"></ion-input>
        </ion-item>
        <ion-item>
          <ion-input label="Электронная почта" type="email" @input="this.inputEmail = $event.target.value"></ion-input>
        </ion-item>
        <ion-item>
          <ion-input label="Пароль" type="password" @input="this.inputPassword = $event.target.value"></ion-input>
        </ion-item>
        <ion-item>
          <ion-input label="Повторите пароль" type="password"
                     @input="inputMatchingPassword = $event.target.value"></ion-input>
        </ion-item>
        <div class="alerts" v-show="this.errors.length >= 1">
          <ion-chip :color="error.color" v-for="error in errors">{{ error.text }}</ion-chip>
        </div>
        <br>
        <ion-button color="tertiary" expand="block" @click="register()">Зарегестрироваться</ion-button>
      </ion-list>

    </div>
  </ion-content>
</template>

<style scoped>
.wrapper {
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  align-content: center;
  justify-content: center;
  overflow: auto;
}
</style>
