<script setup lang="ts">

import SingleValueForm from "@/views/welcome/SingleValueForm.vue";
import {useIonRouter} from "@ionic/vue";

const ionRouter = useIonRouter();

const goNext = () => {
  ionRouter.navigate('password', 'forward', 'push');
}

</script>

<template>
<SingleValueForm headerText="Введите имя пользователя" fieldType="text" placeholderText="Имя пользователя" button-text="Далее" storageFieldName="userUsername" :next-action="goNext"></SingleValueForm>
</template>

<style scoped>

</style>
