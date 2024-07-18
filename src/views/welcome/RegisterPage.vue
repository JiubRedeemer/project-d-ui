<script lang="ts">
import axios from "axios";
import router from "@/router";

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
          console.log(res)
          if (res.status == 200) {
            localStorage.setItem("accessToken", res.data.accessToken);
            localStorage.setItem("refreshToken", res.data.refreshToken);
            this.$cookies.set("accessToken", res.data.accessToken);
            this.$cookies.set("refreshToken", res.data.refreshToken);
            await router.push({name: 'loginPage'})
          }
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
      if (this.inputUsername == '') {
        this.errors.push({
          color: 'danger',
          text: 'Введите имя пользователя!'
        })
      }
      if (this.inputEmail == '') {
        this.errors.push({
          color: 'danger',
          text: 'Введите email!'
        })
      }
      if (this.inputPassword == '') {
        this.errors.push({
          color: 'danger',
          text: 'Введите пароль!'
        })
      }
      if (this.inputMatchingPassword == '') {
        this.errors.push({
          color: 'danger',
          text: 'Введите пароль еще раз!'
        })
      }
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
        <ion-button color="tertiary" expand="block" @click="register()">Регистрация</ion-button>
      </ion-list>

    </div>
  </ion-content>
</template>

<style scoped>

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
  justify-content: center;
  overflow: auto;
}
</style>
