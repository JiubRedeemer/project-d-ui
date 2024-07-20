<script setup lang="ts">
import SingleValueForm from "@/views/welcome/SingleValueForm.vue";
import {ref} from "vue";
import axios from "axios";
import {toastController} from "@ionic/vue";

const errors = ref<{ color: string; text: string }[]>([]);

const auth = async () => {
  if (errors.value.length === 0) {
    try {
      const http = axios.create({
        baseURL: "http://localhost:8080",
        headers: {
          "Content-type": "application/json",
        },
      });

      const res = await http.post("/auth", {
        email: sessionStorage.getItem("userEmail"),
        password: sessionStorage.getItem("userPassword"),
      });
      if (res.status == 200) {
        sessionStorage.setItem("accessToken", res.data.accessToken);
        sessionStorage.setItem("refreshToken", res.data.refreshToken);
        sessionStorage.removeItem("userEmail")
        sessionStorage.removeItem("userPassword")
      }
    } catch (error) {
      if (error.response?.status == 403) {
        await showInvalidPasswordToast()
      } else {
        await showInternalErrorToast()
      }
      console.error("Registration failed:", error);
    }
  }

  async function showInvalidPasswordToast() {
    const toast = await toastController.create({
      message: 'Неверный email или пароль',
      duration: 1500,
      position: 'top'
    })
    await toast.present();
  }

  async function showInternalErrorToast() {
    const toast = await toastController.create({
      message: 'Ошибка сервера, попробуйте снова или немного подождите',
      duration: 2500,
      position: 'top'
    })
    await toast.present();
  }
}

</script>

<template>
  <SingleValueForm headerText="Введите пароль" fieldType="password" placeholderText="Пароль" button-text="Войти"
                   storageFieldName="userPassword" :next-action="auth"></SingleValueForm>
</template>

<style scoped>
</style>
