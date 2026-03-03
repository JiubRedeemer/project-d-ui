<script setup lang="ts">

import {
  IonAvatar,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonSelect,
  IonSelectOption,
  onIonViewWillEnter,
  toastController,
  useIonRouter
} from "@ionic/vue";
import {add, chevronForwardOutline, personAddOutline, sendOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {computed, ref} from "vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {Character} from "@/components/models/response/Character";

const ionRouter = useIonRouter();
const route = useRoute();

const characters = ref<Character[]>([]);
const showInviteModal = ref(false);
const inviteEmail = ref("");
const inviteRole = ref<"PLAYER" | "MASTER">("PLAYER");
const isSendingInvite = ref(false);

const isCharacterOwned = (character: Character) => {
  return (character as Character & { isOwned?: boolean }).isOwned ?? character.isOwner;
};

const sortedCharacters = computed(() => {
  return [...characters.value].sort((a, b) => {
    const aOwned = isCharacterOwned(a);
    const bOwned = isCharacterOwned(b);

    if (aOwned !== bOwned) {
      return Number(bOwned) - Number(aOwned);
    }

    const nameCompare = a.name.localeCompare(b.name, "ru", {sensitivity: "base"});
    if (nameCompare !== 0) {
      return nameCompare;
    }

    return a.id.localeCompare(b.id);
  });
});

const setupCharacters = async () => {
  const http = axios.create({
    baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
    headers: {
      "Content-type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("accessToken")
    },
  });

  const res = await http.get(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.rooms + '/' + route.params.roomId + GATEWAY_INTEGRATION_ROUTES.characters);

  if (res.status == 200) {
    characters.value = res.data
  }
}

onIonViewWillEnter(() => {
  setupCharacters()
})

const createCharacter = () => {
  ionRouter.navigate('/rooms/' + route.params.roomId + '/create-character', 'forward', 'push')
}

const goToCharacter = (characterId: string) => {
  ionRouter.navigate('/rooms/' + route.params.roomId + '/characters/' + characterId, 'forward', 'push')
}

const openInviteModal = () => {
  showInviteModal.value = true;
};

const closeInviteModal = () => {
  showInviteModal.value = false;
};

const sendInvite = async () => {
  const email = inviteEmail.value.trim();
  if (!email) {
    const toast = await toastController.create({
      message: "Введите email для приглашения",
      duration: 1500,
      position: "top"
    });
    await toast.present();
    return;
  }

  isSendingInvite.value = true;
  try {
    const res = await axios.post(
        GATEWAY_INTEGRATION_ROUTES.baseURL +
        GATEWAY_INTEGRATION_ROUTES.api +
        GATEWAY_INTEGRATION_ROUTES.invites,
        {
          email,
          roomId: String(route.params.roomId),
          role: inviteRole.value
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`
          }
        }
    );

    if (res.status === 200 || res.status === 201) {
      const toast = await toastController.create({
        message: "Приглашение отправлено",
        duration: 1500,
        position: "top"
      });
      await toast.present();
      inviteEmail.value = "";
      inviteRole.value = "PLAYER";
      closeInviteModal();
    }
  } catch (error) {
    console.error("Ошибка отправки приглашения", error);
    const toast = await toastController.create({
      message: "Не удалось отправить приглашение",
      duration: 2000,
      position: "top"
    });
    await toast.present();
  } finally {
    isSendingInvite.value = false;
  }
};


</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="HEADERS.characters.rus"></RoomsHeader>
    <ion-content :fullscreen="true" color="dark">

      <ion-list v-show="sortedCharacters.length != 0" class="character-list">
        <ion-item v-for="character in sortedCharacters" :key="character.id" :button="true" color="dark"
                  @click="goToCharacter(character.id)">
          <ion-avatar aria-hidden="false" slot="start">
            <img width="64" height="64"
                 src="https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png"
                 alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"/>
          </ion-avatar>
          <ion-icon aria-hidden="false" :icon="chevronForwardOutline" slot="end"></ion-icon>
          <ion-label>
            <h1 class="character-name" :class="isCharacterOwned(character) ? 'character-owned' : 'character-not-owned'" >{{ character.name }}</h1>
            <h2 class="username">{{ character.ownerUsername}}</h2>
            <p class="character-description">{{ character.raceInfo.name }} - {{ character.clazzInfo.name }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <div class="character-list-placeholder-wrapper" v-show="sortedCharacters.length == 0">
        <div class="room-list-placeholder">{{ TEXTS.emptyCharactersList.rus }}</div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button color="medium" @click="createCharacter()">
          <ion-icon :icon="add" color="light"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="invite-fab">
        <ion-fab-button color="medium" @click="openInviteModal()">
          <ion-icon :icon="personAddOutline" color="light"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <ion-modal
          :is-open="showInviteModal"
          @didDismiss="closeInviteModal"
          :initial-breakpoint="1"
          :breakpoints="[0, 0.5, 1]"
      >
        <div class="invite-modal">
          <div class="invite-modal__header">Пригласить участника</div>
          <ion-item color="dark" class="input-block">
            <ion-input
                label="Email"
                label-placement="floating"
                fill="outline"
                color="primary"
                placeholder="name@example.com"
                type="email"
                v-model="inviteEmail"
            ></ion-input>
          </ion-item>
          <ion-item color="dark" class="input-block">
            <ion-select
                label="Роль"
                label-placement="floating"
                fill="outline"
                color="primary"
                v-model="inviteRole"
            >
              <ion-select-option value="PLAYER">Игрок</ion-select-option>
              <ion-select-option value="MASTER">Мастер</ion-select-option>
            </ion-select>
          </ion-item>
          <div class="invite-modal__actions">
            <ion-button fill="outline" color="medium" @click="closeInviteModal">
              Отмена
            </ion-button>
            <ion-button color="primary" @click="sendInvite" :disabled="isSendingInvite">
              <ion-icon slot="start" :icon="sendOutline"></ion-icon>
              Отправить
            </ion-button>
          </div>
        </div>
      </ion-modal>

    </ion-content>
  </ion-page>
</template>

<style scoped>

.character-list {
  background: transparent;
}

.character-not-owned {
  color: var(--ion-color-secondary);
}

.character-owned {
  color: var(--ion-color-primary);
}

.username {
  color: var(--ion-color-tertiary);
}

.character-list-placeholder-wrapper {
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

.invite-fab {
  transform: translateY(-72px);
}

.invite-modal {
  width: 100%;
  height: 70vh;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.invite-modal__header {
  font-size: 1.2rem;
  font-weight: 600;
}

.invite-modal__actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

ion-modal {
  --border-radius: 10px;
  --height: auto;
  --width: 90%;
  --background: var(--ion-color-dark);
}
</style>
