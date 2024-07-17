<script setup lang="ts">

import {IonPage, IonRouterOutlet} from "@ionic/vue";
</script>

<template>
  <ion-page>
    <ion-router-outlet></ion-router-outlet>
    <div class="button-block-wrapper">
      <div class="button-block">
        <div>
          <ion-button class="button-list-element"
                      color="tertiary" href="/welcome/login">
            Войти
          </ion-button>
        </div>
        <div>
          <ion-button class="button-list-element"
                      color="tertiary" href="/welcome/register">
            Регистрация
          </ion-button>
        </div>
      </div>
    </div>
  </ion-page>
</template>

<style scoped>
.button-block-wrapper {
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

.button-block {
  margin-top: 50%;
  width: 60%;
}

.button-list-element {
  width: 100%;
  min-width: fit-content;
}


</style>
