<script setup lang="ts">
import {IonButton, IonContent, IonPage, useIonRouter} from "@ionic/vue";
import {TEXTS} from "@/config/localisations";

const ionRouter = useIonRouter();
</script>

<template>
  <ion-page>
    <ion-content :fullscreen="true" color="dark">
      <div class="wrapper">
        <h1 class="title">Project-D</h1>
        <div class="button-block">
          <ion-button shape="round"
                      class="button-list-element"
                      color="primary"
                      @click="ionRouter.navigate('welcome/login/email', 'forward', 'push')">
            {{ TEXTS.login.rus }}
          </ion-button>
          <ion-button shape="round"
                      class="button-list-element"
                      color="primary"
                      @click="ionRouter.navigate('welcome/register/email', 'forward', 'push')">
            {{ TEXTS.register.rus }}
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.wrapper {
  background: black;
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  align-content: center;
  flex-direction: column;
  justify-content: center;
  overflow: auto;
}

.title {
  align-self: center;
}

.button-block {
  margin-top: 500px;
  width: 70%;
}

.button-list-element {
  width: 100%;
  height: 60%;
  min-width: fit-content;
}

@media (min-width: 768px) {
  .wrapper {
    flex-direction: row;
  }

  .button-block {
    border-left: solid 1px whitesmoke;
    padding-left: 12%;
    width: 50%;
    margin-top: 0;
    margin-left: 25%;
  }
}

</style>
