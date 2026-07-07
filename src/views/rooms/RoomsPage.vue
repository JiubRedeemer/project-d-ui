<script setup lang="ts">

import {
  IonAvatar,
  IonContent,
  IonFooter,
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonPopover,
  IonButton,
  onIonViewDidEnter,
  useIonRouter
} from "@ionic/vue";
import {add, calendarOutline, chevronForwardOutline, informationCircleOutline, searchOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import PwaInstallHintModal from "@/components/PwaInstallHintModal.vue";
import {onBeforeUnmount, onMounted, ref} from "vue";
import axios from "axios";
import {useSubscriptionStore} from "@/stores/SubscriptionStore";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {
  bindBeforeInstallPromptListener,
  dismissPwaHint,
  shouldShowPwaHintOnEnter,
} from "@/utils/pwaInstall";

type Room = { id: string; name: string; description: string; filePath: string; lastActivityDate: string; nextSessionAt: string | null };

const ionRouter = useIonRouter();
const rooms = ref<Room[]>([]);
const deletePopoverOpen = ref(false);
const deletePopoverEvent = ref<Event | null>(null);
const roomToDelete = ref<Room | null>(null);
const didOpenDeletePopover = ref(false);
const showLegalInformation = ref(false);
const showPwaHintModal = ref(false);
let unbindBeforeInstallPrompt: (() => void) | null = null;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let pressStartX = 0;
let pressStartY = 0;
const MOVE_THRESHOLD_PX = 10;
const currentYear = new Date().getFullYear();

const http = () => axios.create({
  baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
  headers: {
    "Content-type": "application/json",
    "Authorization": "Bearer " + localStorage.getItem("accessToken")
  },
});

const setupRooms = async () => {
  const res = await http().get(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.rooms);
  if (res.status == 200) {
    rooms.value = (res.data as Room[]).sort((a, b) => {
      if (a.nextSessionAt && b.nextSessionAt) return a.nextSessionAt.localeCompare(b.nextSessionAt);
      if (a.nextSessionAt) return -1;
      if (b.nextSessionAt) return 1;
      return 0;
    });
  }
};

onIonViewDidEnter(() => {
  setupRooms();
  if (shouldShowPwaHintOnEnter()) {
    showPwaHintModal.value = true;
  }
});

const subscriptionStore = useSubscriptionStore();

onMounted(() => {
  setupRooms();
  subscriptionStore.load();
  unbindBeforeInstallPrompt = bindBeforeInstallPromptListener();
});

onBeforeUnmount(() => {
  unbindMoveListener();
  if (longPressTimer) clearTimeout(longPressTimer);
  unbindBeforeInstallPrompt?.();
  unbindBeforeInstallPrompt = null;
});

const goToRoom = (roomId: string) => {
  ionRouter.navigate('/rooms/' + roomId + '/characters', 'forward', 'push');
};

const goToCreateRoom = () => {
  if (!subscriptionStore.canCreateRoom()) {
    ionRouter.navigate('/subscription', 'forward', 'push');
    return;
  }
  ionRouter.navigate('/rooms/create/ruleType', 'forward', 'push');
};

const onRoomPressMove = (e: MouseEvent | TouchEvent) => {
  if (!longPressTimer) return;
  const source = e instanceof TouchEvent ? (e as TouchEvent).touches[0] : (e as MouseEvent);
  const x = source?.clientX ?? 0;
  const y = source?.clientY ?? 0;
  const dist = Math.hypot(x - pressStartX, y - pressStartY);
  if (dist > MOVE_THRESHOLD_PX) {
    onRoomPressEnd();
  }
};

const bindMoveListener = () => {
  document.addEventListener('touchmove', onRoomPressMove, { passive: true });
  document.addEventListener('mousemove', onRoomPressMove);
};
const unbindMoveListener = () => {
  document.removeEventListener('touchmove', onRoomPressMove);
  document.removeEventListener('mousemove', onRoomPressMove);
};

const onRoomPressStart = (room: Room, e: MouseEvent | TouchEvent) => {
  roomToDelete.value = room;
  const source = e instanceof TouchEvent ? (e as TouchEvent).touches[0] : (e as MouseEvent);
  pressStartX = source?.clientX ?? 0;
  pressStartY = source?.clientY ?? 0;
  bindMoveListener();
  longPressTimer = setTimeout(() => {
    longPressTimer = null;
    unbindMoveListener();
    didOpenDeletePopover.value = true;
    const ev = new MouseEvent('click', { clientX: pressStartX, clientY: pressStartY, bubbles: true });
    deletePopoverEvent.value = ev;
    deletePopoverOpen.value = true;
  }, 500);
};

const onRoomPressEnd = () => {
  unbindMoveListener();
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
};

const confirmDeleteRoom = async () => {
  if (!roomToDelete.value) return;
  const roomId = roomToDelete.value.id;
  try {
    await http().delete(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.rooms + '/' + roomId);
    rooms.value = rooms.value.filter((r) => r.id !== roomId);
  } finally {
    deletePopoverOpen.value = false;
    deletePopoverEvent.value = null;
    roomToDelete.value = null;
  }
};

const dismissDeletePopover = () => {
  deletePopoverOpen.value = false;
  deletePopoverEvent.value = null;
  roomToDelete.value = null;
};

const goToRoomIfNotLongPress = (roomId: string) => {
  if (didOpenDeletePopover.value) {
    didOpenDeletePopover.value = false;
    return;
  }
  goToRoom(roomId);
};

const toggleLegalInformation = () => {
  showLegalInformation.value = !showLegalInformation.value;
};

const openPwaHint = () => {
  showPwaHintModal.value = true;
};

const closePwaHint = () => {
  showPwaHintModal.value = false;
};

const dismissPwaHintAndClose = () => {
  dismissPwaHint();
  showPwaHintModal.value = false;
};


</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="HEADERS.rooms.rus"></RoomsHeader>
    <ion-content :fullscreen="true" class="rooms-content">
      <div class="rooms-wrapper">
        <div class="glow glow-top"></div>
        <div class="glow glow-mid"></div>
        <div class="glow glow-bottom"></div>

        <div class="rooms-shell">
          <section class="rooms-hero">
            <p class="rooms-eyebrow">Mythrill</p>
            <h1 class="rooms-title">{{ HEADERS.rooms.rus }}</h1>
            <p class="rooms-subtitle">Выберите комнату для продолжения приключения или создайте новую.</p>
          </section>

          <ion-list v-show="rooms.length !== 0" lines="none" class="room-list">
            <ion-item
              v-for="(room, index) in rooms"
              :key="index"
              :button="true"
              class="room-item"
              @click="goToRoomIfNotLongPress(room.id)"
              @touchstart.passive="onRoomPressStart(room, $event)"
              @touchend="onRoomPressEnd"
              @touchcancel="onRoomPressEnd"
              @mousedown="onRoomPressStart(room, $event)"
              @mouseup="onRoomPressEnd"
              @mouseleave="onRoomPressEnd"
            >
              <ion-avatar aria-hidden="false" slot="start">
                <img width="64" height="64"
                     :src="room.filePath ? FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                     FILE_STORAGE_INTEGRATION_ROUTES.api +
                     FILE_STORAGE_INTEGRATION_ROUTES.room_images_bucket +
                     FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + room.filePath :
                     'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                     alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"/>
              </ion-avatar>
              <ion-icon aria-hidden="false" :icon="chevronForwardOutline" slot="end"></ion-icon>
              <ion-label>
                <h2 class="room-name">{{ room.name }}</h2>
                <p class="room-description">{{ room.description }}</p>
                <p v-if="room.nextSessionAt" class="room-session">
                  <ion-icon :icon="calendarOutline" class="session-icon"/>
                  {{ new Date(room.nextSessionAt).toLocaleString('ru-RU', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) }}
                </p>
              </ion-label>
            </ion-item>
          </ion-list>

          <div class="room-list-placeholder-wrapper" v-show="rooms.length === 0">
            <div class="room-list-placeholder">
              <p class="placeholder-title">{{ TEXTS.emptyRoomList.rus }}</p>
              <ion-button shape="round" class="placeholder-cta" color="primary" @click="goToCreateRoom()">
                Создать комнату
              </ion-button>
            </div>
          </div>
        </div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button class="rooms-fab" @click="goToCreateRoom()">
          <ion-icon :icon="add" color="light"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <ion-fab slot="fixed" vertical="bottom" horizontal="start">
        <ion-fab-button class="rooms-fab rooms-fab--discover" @click="ionRouter.navigate('/rooms/discover', 'forward', 'push')">
          <ion-icon :icon="searchOutline" color="light"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <ion-popover
        :is-open="deletePopoverOpen"
        :event="deletePopoverEvent"
        @didDismiss="dismissDeletePopover"
      >
        <div class="delete-room-popover">
          <p>Удалить комнату?</p>
          <div class="delete-room-actions">
            <ion-button fill="clear" size="small" @click="dismissDeletePopover">Нет</ion-button>
            <ion-button fill="solid" color="danger" size="small" @click="confirmDeleteRoom">да</ion-button>
          </div>
        </div>
      </ion-popover>

      <PwaInstallHintModal
        :is-open="showPwaHintModal"
        @close="closePwaHint"
        @dismiss="dismissPwaHintAndClose"
      />

    </ion-content>
    <ion-footer class="rooms-footer" color="dark">
      <div class="rooms-footer-main">
        <span>© jiubredeemer {{ currentYear }}</span>
        <div class="rooms-footer-actions">
          <ion-button fill="clear" size="small" class="rooms-footer-link" @click="openPwaHint">
            {{ TEXTS.pwaInstallHint.footerLink.rus }}
          </ion-button>
          <ion-button fill="clear" size="small" @click="toggleLegalInformation">
            <ion-icon :icon="informationCircleOutline" />
          </ion-button>
        </div>
      </div>
      <div v-if="showLegalInformation" class="rooms-footer-legal">
        Данная работа включает материалы из System Reference Document 5.2.1 («SRD 5.2.1») и System
        Reference Document 5.1 («SRD 5.1») от Wizards of the Coast LLC, доступных по адресам
        <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noopener noreferrer">
          https://www.dndbeyond.com/srd
        </a>
        и
        <a href="https://dnd.wizards.com/resources/systems-reference-document" target="_blank" rel="noopener noreferrer">
          https://dnd.wizards.com/resources/systems-reference-document
        </a>.
        Материалы SRD 5.2.1 и SRD 5.1 лицензированы по лицензии Creative Commons Attribution 4.0
        International, доступной по адресу:
        <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener noreferrer">
          https://creativecommons.org/licenses/by/4.0/legalcode
        </a>.
      </div>
    </ion-footer>
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

.room-list {
  margin-top: 12px;
  background: transparent;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.room-item {
  --background: linear-gradient(145deg, rgba(var(--ion-color-light-rgb), 0.1), rgba(var(--ion-color-light-rgb), 0.03));
  --border-radius: 14px;
  --padding-start: 12px;
  --inner-padding-end: 10px;
  --min-height: 72px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
}

.room-item ion-avatar {
  width: 52px;
  height: 52px;
}

.room-item ion-avatar img {
  border-radius: 14px;
}

.room-item ion-icon[slot="end"] {
  color: rgba(var(--ion-color-primary-rgb), 0.85);
  font-size: 18px;
}

.room-name {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  color: var(--ion-color-light);
}

.room-description {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(var(--ion-color-light-rgb), 0.76);
}

.room-session {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--ion-color-primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.session-icon {
  font-size: 13px;
}

.room-list-placeholder-wrapper {
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

.placeholder-title {
  margin: 0;
  font-size: 15px;
  color: rgba(var(--ion-color-light-rgb), 0.86);
}

.placeholder-cta {
  margin-top: 12px;
  min-height: 44px;
}

.delete-room-popover {
  padding: 12px 16px;
  min-width: 180px;
  background-color: var(--ion-color-dark);
}
.delete-room-popover p {
  margin: 0 0 12px 0;
  font-size: 14px;
}
.delete-room-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.rooms-footer {
  --background: rgba(var(--ion-color-dark-rgb), 0.82);
  background: linear-gradient(180deg, rgba(var(--ion-color-medium-rgb), 0.7), rgba(var(--ion-color-medium-rgb), 0.9));
  backdrop-filter: blur(10px);
  opacity: 1;
  border-top: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  padding: 8px 12px 10px;
}

.rooms-footer-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: rgba(var(--ion-color-light-rgb), 0.9);
  font-size: 0.82rem;
  font-weight: 500;
}

.rooms-footer-legal {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  font-size: 0.76rem;
  line-height: 1.45;
  color: rgba(var(--ion-color-light-rgb), 0.8);
}

.rooms-footer-legal a {
  color: rgba(var(--ion-color-primary-rgb), 0.95);
  text-decoration: underline;
}

.rooms-footer-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.rooms-footer-main ion-button {
  --color: rgba(var(--ion-color-light-rgb), 0.85);
  --border-radius: 10px;
  margin: 0;
}

.rooms-footer-link {
  font-size: 0.78rem;
  text-transform: none;
  letter-spacing: 0;
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

  .room-list {
    margin-top: 14px;
    gap: 10px;
  }
}
</style>
