<script setup lang="ts">
import {IonButton, IonContent, IonPage} from "@ionic/vue";
import {TEXTS} from "@/config/localisations";
import {onBeforeMount} from "vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useAppRouter} from "@/composables/useAppRouter";

const { navigate, replace, isDesktop } = useAppRouter();

const setupRooms = async () => {
  try {
    const http = axios.create({
      baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
      headers: {
        "Content-type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("accessToken")
      },
    });

    const res = await http.get(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.rooms);

    if (res.status == 200) {
      replace('/rooms');
    }
  } catch (error) {
    console.debug("No auth:", error);
  }
}

onBeforeMount(() => {
  setupRooms()
})

</script>

<template>
  <ion-page>
    <ion-content :fullscreen="!isDesktop" color="dark">
      <!-- Desktop template -->
      <div v-if="isDesktop" class="desktop-wrapper">
        <div class="desktop-card">
          <h1 class="desktop-title">Project-D</h1>
          <div class="desktop-actions">
            <ion-button expand="block" shape="round" color="primary" @click="navigate('welcome/login', 'forward', 'push')">
              {{ TEXTS.login.rus }}
            </ion-button>
            <ion-button expand="block" shape="round" color="primary" @click="navigate('welcome/register', 'forward', 'push')">
              {{ TEXTS.register.rus }}
            </ion-button>
          </div>
        </div>
      </div>
      <!-- Mobile template -->
      <div v-else class="wrapper">
        <h1 class="title">Project-D</h1>
        <div class="button-block">
          <ion-button shape="round"
                      class="button-list-element"
                      color="primary"
                      @click="navigate('welcome/login', 'forward', 'push')">
            {{ TEXTS.login.rus }}
          </ion-button>
          <ion-button shape="round"
                      class="button-list-element"
                      color="primary"
                      @click="navigate('welcome/register', 'forward', 'push')">
            {{ TEXTS.register.rus }}
          </ion-button>
          <ion-button shape="round"
                      class="button-list-element desktop-link"
                      fill="outline"
                      color="primary"
                      @click="navigate('/desktop/welcome', 'forward', 'push')">
            Десктоп
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

.desktop-link {
  margin-top: 0.5rem;
}

/* Desktop template */
.desktop-wrapper {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--desktop-content-padding);
}
.desktop-card {
  max-width: var(--desktop-card-max-width);
  width: 100%;
  background: var(--ion-color-medium);
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}
.desktop-title {
  text-align: center;
  margin: 0 0 24px 0;
  font-size: 1.75rem;
}
.desktop-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

  .desktop-link {
    margin-top: 0;
  }
}

</style>
