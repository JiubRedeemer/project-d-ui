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
import {add, chevronForwardOutline, informationCircleOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {onBeforeUnmount, onMounted, ref} from "vue";
import axios from "axios";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

type Room = { id: string; name: string; description: string; filePath: string; lastActivityDate: string };

const ionRouter = useIonRouter();
const rooms = ref<Room[]>([]);
const deletePopoverOpen = ref(false);
const deletePopoverEvent = ref<Event | null>(null);
const roomToDelete = ref<Room | null>(null);
const didOpenDeletePopover = ref(false);
const showLegalInformation = ref(false);
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
    rooms.value = res.data;
  }
};

onIonViewDidEnter(() => {
  setupRooms();
});

onMounted(() => {
  setupRooms();
});

onBeforeUnmount(() => {
  unbindMoveListener();
  if (longPressTimer) clearTimeout(longPressTimer);
});

const goToRoom = (roomId: string) => {
  ionRouter.navigate('/rooms/' + roomId + '/characters', 'forward', 'push');
};

const goToCreateRoom = () => {
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


</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="HEADERS.rooms.rus"></RoomsHeader>
    <ion-content :fullscreen="true" color="dark">

      <ion-list v-show="rooms.length != 0" class="room-list">
        <ion-item
          v-for="(room, index) in rooms"
          :key="index"
          :button="true"
          color="dark"
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
            <h1 class="room-name">{{ room.name }}</h1>
            <p class="room-description">{{ room.description }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <div class="room-list-placeholder-wrapper" v-show="rooms.length == 0">
        <div class="room-list-placeholder">{{ TEXTS.emptyRoomList.rus }}</div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button color="medium" @click="goToCreateRoom()">
          <ion-icon :icon="add" color="light"></ion-icon>
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

    </ion-content>
    <ion-footer class="rooms-footer" color="dark">
      <div class="rooms-footer-main">
        <span>© jiubredeemer {{ currentYear }}</span>
        <ion-button fill="clear" size="small" @click="toggleLegalInformation">
          <ion-icon :icon="informationCircleOutline" />
        </ion-button>
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

.room-list {
  background: transparent;
}

.room-list-placeholder-wrapper {
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
  --background: var(--ion-color-dark-shade);
  background-color: var(--ion-color-dark-shade);
  opacity: 1;
  border-top: 1px solid var(--ion-color-dark-tint);
  padding: 6px 10px 10px;
}

.rooms-footer-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--ion-color-light);
  font-size: 0.85rem;
}

.rooms-footer-legal {
  margin-top: 4px;
  font-size: 0.8rem;
  line-height: 1.35;
  color: var(--ion-color-light);
}

.rooms-footer-legal a {
  color: var(--ion-color-primary);
  text-decoration: underline;
}

.rooms-footer-main ion-button {
  font-size: 0.72rem;
}
</style>
