<script setup lang="ts">

import SingleValueForm from "@/views/welcome/SingleValueForm.vue";
import axios from "axios";
import {toastController} from "@ionic/vue";
import {INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {TEXTS} from "@/config/localisations";


const goNext = async () => {
  try {
    const http = axios.create({
      baseURL: INTEGRATION_ROUTES.baseURL,
      headers: {
        "Content-type": "application/json",
      },
    });

    const res = await http.post(INTEGRATION_ROUTES.registration, {
      username: sessionStorage.getItem("userUsername"),
      email: sessionStorage.getItem("userEmail"),
      password: sessionStorage.getItem("userPassword"),
      matchingPassword: sessionStorage.getItem("matchingPassword"),
    });

    console.log(res)
    if (res.status == 200) {
      sessionStorage.setItem("accessToken", res.data.accessToken);
      sessionStorage.setItem("refreshToken", res.data.refreshToken);
      sessionStorage.removeItem("userUsername")
      sessionStorage.removeItem("userEmail")
      sessionStorage.removeItem("userPassword")
      sessionStorage.removeItem("matchingPassword")
    }
  } catch (error) {
    if (error.response?.status == 406) {
      await showInvalidValidationToast(error.response?.data?.code)
    } else {
      await showInternalErrorToast()
    }

    console.error("Registration failed:", error);
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
  <SingleValueForm :headerText="TEXTS.enterPasswordAlready.rus" fieldType="password" :placeholderText="TEXTS.password.rus"
                   :button-text="TEXTS.register.rus"
                   storageFieldName="userMatchingPassword" :next-action="goNext"></SingleValueForm>
</template>

<style scoped>

</style>
