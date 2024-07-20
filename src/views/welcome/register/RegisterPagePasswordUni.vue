<script setup lang="ts">

import SingleValueForm from "@/views/welcome/SingleValueForm.vue";
import {useIonRouter} from "@ionic/vue";

const ionRouter = useIonRouter();

const goNext = () => {
  ionRouter.navigate('matchingPassword', 'forward', 'push');
}

</script>

<template>
<SingleValueForm headerText="Введите пароль" fieldType="password" placeholderText="Пароль" button-text="Далее" storageFieldName="userPassword" :next-action="goNext"></SingleValueForm>
</template>

<style scoped>

</style>
