<script setup lang="ts">

import SingleValueForm from "@/views/welcome/SingleValueForm.vue";
import {useIonRouter} from "@ionic/vue";

const ionRouter = useIonRouter();

const goNext = () => {
  ionRouter.navigate('username', 'forward', 'push');
}

</script>

<template>
<SingleValueForm headerText="Введите email" fieldType="email" placeholderText="Email" button-text="Далее" storageFieldName="userEmail" :next-action="goNext"></SingleValueForm>
</template>

<style scoped>

</style>
