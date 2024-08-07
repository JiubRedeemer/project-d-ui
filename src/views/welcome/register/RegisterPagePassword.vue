<script setup lang="ts">

import SingleValueForm from "@/views/welcome/SingleValueForm.vue";
import {useIonRouter} from "@ionic/vue";
import {TEXTS} from "@/config/localisations";

const ionRouter = useIonRouter();

const goNext = () => {
  ionRouter.navigate('matchingPassword', 'forward', 'push');
}

</script>

<template>
<SingleValueForm :headerText="TEXTS.enterPassword.rus" fieldType="password" :placeholderText="TEXTS.password.rus" :button-text="TEXTS.next.rus" storageFieldName="userPassword" :next-action="goNext"></SingleValueForm>
</template>

<style scoped>

</style>
