<script lang="ts">
import axios from "axios";
import router from "@/router";

export default {
  data() {
    return {
      errors: [],
      accessToken: '',
      inputEmail: '',
      inputPassword: '',
      responseData: ''
    }
  },
  beforeMount() {
      this.fastLogin()
  },
  methods: {
    async fastLogin() {
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken != null) {
        this.accessToken = accessToken
      } else if (this.$cookies.get("accessToken") != null) {
        this.accessToken = this.$cookies.get("accessToken")
      }
      if (this.accessToken != null && this.accessToken != '') {

        const http = axios.create({
          baseURL: "http://localhost:8080",
          headers: {
            "Content-type": "application/json",
          },
        });
        const config = {headers: {'X-Auth-Token': this.accessToken,}}
        const res = await http.get("/auth", config);
        if(res.status == 200){
          console.log('That`s all yet:)')
          await router.push({name: 'welcomePage'})
        }
      }
    },
    async login() {
      this.validateInput()
      if (this.errors.length === 0) {
        try {
          const http = axios.create({
            baseURL: "http://localhost:8080",
            headers: {
              "Content-type": "application/json",
            },
          });

          const res = await http.post("/auth", {
            email: this.inputEmail,
            password: this.inputPassword,
          });

          this.responseData = res.data;
          console.log(res)
          if (res.status == 200) {
            localStorage.setItem("accessToken", res.data.accessToken);
            localStorage.setItem("refreshToken", res.data.refreshToken);
            this.$cookies.set("accessToken", res.data.accessToken);
            this.$cookies.set("refreshToken", res.data.refreshToken);
          }
        } catch (error) {
          console.error("Registration failed:", error);
        }
      }
    },
    validateInput() {
      this.errors = []
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
    }
  }
}
</script>

<template>
  <ion-content class="ion-padding">
    <div class="wrapper">
      <ion-list>
        <ion-item>
          <ion-input label="Электронная почта" type="email" @input="this.inputEmail = $event.target.value"></ion-input>
        </ion-item>
        <ion-item>
          <ion-input label="Пароль" type="password" @input="this.inputPassword = $event.target.value"></ion-input>
        </ion-item>
        <div class="alerts" v-show="this.errors.length >= 1">
          <ion-chip :color="error.color" v-for="error in errors">{{ error.text }}</ion-chip>
        </div>
        <br>
        <ion-button color="tertiary" expand="block" @click="login()">Войти в систему</ion-button>
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
