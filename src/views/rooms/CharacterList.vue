<script setup lang="ts">

import {
  alertController,
  IonAvatar,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonInput,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
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
import {add, chevronForwardOutline, keyOutline, personAddOutline, sendOutline, trashOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {computed, ref} from "vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {Character} from "@/components/models/response/Character";
import {useSubscriptionStore} from "@/stores/SubscriptionStore";
import CachedFileImage from "@/components/CachedFileImage.vue";
import {getCharacterAvatarUrl, CHARACTER_AVATAR_PLACEHOLDER} from "@/utils/characterAvatar";

const ionRouter = useIonRouter();
const route = useRoute();

const characters = ref<Character[]>([]);
const showInviteModal = ref(false);
const inviteEmail = ref("");
const inviteRole = ref<"PLAYER" | "MASTER">("PLAYER");
const userRoles = ref<String[]>([]);
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

const getRoleInRoom = async () => {
  const http = axios.create({
    baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
    headers: {
      "Content-type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("accessToken")
    },
  });

  const res = await http.get(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.rooms + '/' + route.params.roomId + GATEWAY_INTEGRATION_ROUTES.roles);

  if (res.status == 200) {
    userRoles.value = res.data
  }
}

const isMaster = () => {
  return userRoles.value.filter(role => role === "MASTER").length > 0;
}

onIonViewWillEnter(() => {
  setupCharacters()
  getRoleInRoom()
})

const subscriptionStore = useSubscriptionStore();

const createCharacter = () => {
  const myChars = characters.value.filter((c) => isCharacterOwned(c)).length;
  if (!subscriptionStore.canCreateCharacter(myChars)) {
    ionRouter.navigate('/subscription', 'forward', 'push');
    return;
  }
  ionRouter.navigate('/rooms/' + route.params.roomId + '/create-character', 'forward', 'push');
}

const goToCharacter = (characterId: string) => {
  ionRouter.navigate('/rooms/' + route.params.roomId + '/characters/' + characterId, 'forward', 'push')
}

const confirmDeleteCharacter = async (characterId: string) => {
  const roomId = String(route.params.roomId);
  await axios.delete(
    `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterId}/logical`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      }
    }
  );
  characters.value = characters.value.filter((character) => character.id !== characterId);
};

const requestDeleteCharacter = async (character: Character) => {
  const alert = await alertController.create({
    header: "Удалить персонажа?",
    message: `Персонаж "${character.name}" будет удален.`,
    buttons: [
      { text: "Отмена", role: "cancel" },
      {
        text: "Удалить",
        role: "destructive",
        handler: () => void confirmDeleteCharacter(character.id)
      }
    ]
  });
  await alert.present();
};

function goToMasterLk() {
  ionRouter.navigate('/rooms/' + route.params.roomId + '/master', 'forward', 'push')
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
    <RoomsHeader :header-name="HEADERS.characters.rus" force-back-button></RoomsHeader>
    <ion-content :fullscreen="true" class="rooms-content">
      <div class="rooms-wrapper">
        <div class="glow glow-top"></div>
        <div class="glow glow-mid"></div>
        <div class="glow glow-bottom"></div>

        <div class="rooms-shell">
          <section class="rooms-hero">
            <p class="rooms-eyebrow">Mythrill</p>
            <h1 class="rooms-title">{{ HEADERS.characters.rus }}</h1>
            <p class="rooms-subtitle">Откройте персонажа, создайте нового или пригласите игрока в комнату.</p>
          </section>

          <ion-item :button="true" class="character-item master-item" @click="goToMasterLk()" v-if="isMaster()">
            <ion-avatar aria-hidden="false" slot="start">
              <img width="64" height="64"
                   src="https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png"
                   alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"/>
            </ion-avatar>
            <ion-icon aria-hidden="false" :icon="keyOutline" slot="end"></ion-icon>
            <ion-label>
              <h1 class="character-name character-owned">Ширма мастера</h1>
              <p class="character-description">Управление комнатой</p>
            </ion-label>
          </ion-item>

          <ion-list v-show="sortedCharacters.length != 0" class="character-list" lines="none">
            <ion-item-sliding v-for="character in sortedCharacters" :key="character.id" class="character-slide">
              <ion-item :button="true" class="character-item" @click="goToCharacter(character.id)">
                <ion-avatar aria-hidden="false" slot="start">
                  <CachedFileImage
                    width="64"
                    height="64"
                    :src="getCharacterAvatarUrl(character)"
                    alt=""
                    @error="($event.target as HTMLImageElement).src = CHARACTER_AVATAR_PLACEHOLDER"
                  />
                </ion-avatar>
                <ion-icon aria-hidden="false" :icon="chevronForwardOutline" slot="end"></ion-icon>
                <ion-label>
                  <h1 class="character-name" :class="isCharacterOwned(character) ? 'character-owned' : 'character-not-owned'">
                    {{ character.name }}</h1>
                  <h2 class="username">{{ character.ownerUsername }}</h2>
                  <p class="character-description">{{ character.raceInfo.name }} - {{ character.clazzInfo.name }}</p>
                </ion-label>
              </ion-item>
              <ion-item-options side="end">
                <ion-item-option color="danger" @click="requestDeleteCharacter(character)">
                  <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          </ion-list>

          <div class="character-list-placeholder-wrapper" v-show="sortedCharacters.length == 0">
            <div class="room-list-placeholder">{{ TEXTS.emptyCharactersList.rus }}</div>
          </div>
        </div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button class="rooms-fab" @click="createCharacter()">
          <ion-icon :icon="add" color="dark"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="invite-fab">
        <ion-fab-button class="rooms-fab invite-fab-button" @click="openInviteModal()" size="small">
          <ion-icon :icon="personAddOutline" color="light" size="small"></ion-icon>
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
.rooms-content {
  --background: radial-gradient(circle at 14% 16%, rgba(var(--ion-color-primary-rgb), 0.2), transparent 46%),
  radial-gradient(circle at 88% 10%, rgba(var(--ion-color-tertiary-rgb), 0.16), transparent 44%),
  linear-gradient(165deg, var(--ion-color-dark) 0%, var(--ion-color-medium-shade) 60%, var(--ion-color-medium) 100%);
  --padding-top: calc(10px + var(--sat, 0px));
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-bottom: calc(20px + var(--sab, 0px));
}

.rooms-wrapper {
  width: 100%;
  min-height: 100%;
  position: relative;
  padding: 4px 0 14px;
  box-sizing: border-box;
}

.rooms-shell {
  width: min(680px, 100%);
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.glow {
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  filter: blur(56px);
  opacity: 0.34;
  pointer-events: none;
}

.glow-top {
  top: -86px;
  right: -54px;
  background: rgba(var(--ion-color-primary-rgb), 0.72);
}

.glow-mid {
  top: 34%;
  left: -90px;
  width: 220px;
  height: 220px;
  background: rgba(var(--ion-color-secondary-rgb), 0.34);
}

.glow-bottom {
  bottom: -110px;
  left: 18%;
  background: rgba(var(--ion-color-tertiary-rgb), 0.5);
}

.rooms-hero {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.14);
  background: linear-gradient(150deg, rgba(var(--ion-color-light-rgb), 0.1), rgba(var(--ion-color-light-rgb), 0.03));
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(6px);
}

.rooms-eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--ion-color-light-rgb), 0.68);
}

.rooms-title {
  margin: 8px 0 6px;
  font-size: clamp(24px, 4.8vw, 34px);
  line-height: 1.18;
  font-weight: 700;
}

.rooms-subtitle {
  margin: 0;
  color: rgba(var(--ion-color-light-rgb), 0.84);
  line-height: 1.45;
  font-size: 14px;
}

.character-list {
  margin-top: 12px;
  background: transparent;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.character-slide {
  border-radius: 14px;
  overflow: hidden;
}

.character-item {
  --background: linear-gradient(145deg, rgba(var(--ion-color-light-rgb), 0.1), rgba(var(--ion-color-light-rgb), 0.03));
  --border-radius: 14px;
  --padding-start: 12px;
  --inner-padding-end: 10px;
  --min-height: 72px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
}

.master-item {
  margin-top: 12px;
}

.character-not-owned {
  color: var(--ion-color-secondary);
}

.character-owned {
  color: var(--ion-color-primary);
}

.username {
  color: var(--ion-color-tertiary);
  margin: 3px 0 0;
  font-size: 13px;
}

.character-name {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
}

.character-description {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(var(--ion-color-light-rgb), 0.76);
}

.character-list-placeholder-wrapper {
  width: 100%;
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
}

.room-list-placeholder {
  width: 100%;
  padding: 20px 16px;
  text-align: center;
  border-radius: 14px;
  border: 1px dashed rgba(var(--ion-color-light-rgb), 0.18);
  color: rgba(var(--ion-color-light-rgb), 0.84);
  background: rgba(var(--ion-color-dark-rgb), 0.2);
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

.rooms-fab {
  --background: transparent !important;
  --background-activated: transparent !important;
  --background-hover: transparent !important;
  --color: var(--ion-color-light);
  --border-radius: 50%;
  --box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
}

.rooms-fab::part(native) {
  background: linear-gradient(
    145deg,
    rgba(var(--ion-color-light-rgb), 0.2),
    rgba(var(--ion-color-light-rgb), 0.07)
  ) !important;
  backdrop-filter: blur(10px) saturate(130%);
  -webkit-backdrop-filter: blur(10px) saturate(130%);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.22);
  border-radius: 50%;
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(var(--ion-color-light-rgb), 0.3);
}

.invite-fab-button::part(native) {
  background: linear-gradient(
    145deg,
    rgba(var(--ion-color-secondary-rgb), 0.32),
    rgba(var(--ion-color-secondary-rgb), 0.18)
  ) !important;
}

@media (min-width: 768px) {
  .rooms-content {
    --padding-top: calc(14px + var(--sat, 0px));
    --padding-start: 16px;
    --padding-end: 16px;
    --padding-bottom: calc(24px + var(--sab, 0px));
  }

  .rooms-shell {
    width: min(720px, 100%);
  }

  .rooms-hero {
    padding: 20px 22px;
  }

  .character-list {
    margin-top: 14px;
    gap: 10px;
  }
}

</style>
