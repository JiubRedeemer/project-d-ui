<script setup lang="ts">

import SingleValueForm from "@/views/welcome/SingleValueForm.vue";
import {useIonRouter} from "@ionic/vue";
import {TEXTS} from "@/config/localisations";

const ionRouter = useIonRouter();

const goNext = () => {
  ionRouter.navigate('username', 'forward', 'push');
}

</script>

<template>
<SingleValueForm :headerText="TEXTS.enterEmail.rus" fieldType="email" :placeholderText="TEXTS.email.rus" :button-text="TEXTS.next.rus" storageFieldName="userEmail" :next-action="goNext"></SingleValueForm>
</template>

<style scoped>

</style>
