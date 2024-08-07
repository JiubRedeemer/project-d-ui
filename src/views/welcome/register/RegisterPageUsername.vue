<script setup lang="ts">

import SingleValueForm from "@/views/welcome/SingleValueForm.vue";
import {useIonRouter} from "@ionic/vue";
import {TEXTS} from "@/config/localisations";

const ionRouter = useIonRouter();

const goNext = () => {
  ionRouter.navigate('password', 'forward', 'push');
}

</script>

<template>
<SingleValueForm :headerText="TEXTS.enterUsername.rus" fieldType="text" :placeholderText="TEXTS.username.rus" :button-text="TEXTS.next.rus" storageFieldName="userUsername" :next-action="goNext"></SingleValueForm>
</template>

<style scoped>

</style>
