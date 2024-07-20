<script setup lang="ts">
import SingleValueForm from "@/views/welcome/SingleValueForm.vue";
import {ref} from "vue";
import axios from "axios";
import {toastController} from "@ionic/vue";
import {INTEGRATION_ROUTES} from "@/config/integrationRoutes";  // Импортируем конфигурацию
import {TEXTS} from "@/config/localisations";

const errors = ref<{ color: string; text: string }[]>([]);

const auth = async () => {
  if (errors.value.length === 0) {
    try {
      const http = axios.create({
        baseURL: INTEGRATION_ROUTES.baseURL,
        headers: {
          "Content-type": "application/json",
        },
      });

      const res = await http.post(INTEGRATION_ROUTES.auth, {
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
      message: TEXTS.invalidPassword.rus,
      duration: 1500,
      position: 'top'
    })
    await toast.present();
  }

  async function showInternalErrorToast() {
    const toast = await toastController.create({
      message: TEXTS.internalError.rus,
      duration: 2500,
      position: 'top'
    })
    await toast.present();
  }
}

</script>

<template>
  <SingleValueForm :headerText="TEXTS.enterPassword.rus" fieldType="password" :placeholderText="TEXTS.password.rus" :button-text="TEXTS.login.rus"
                   storageFieldName="userPassword" :next-action="auth"></SingleValueForm>
</template>

<style scoped>
</style>
