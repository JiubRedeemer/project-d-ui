<script setup lang="ts">

import {
  IonAvatar,
  IonContent,
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
import {add, chevronForwardOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {onMounted, ref} from "vue";
import axios from "axios";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

type Room = { id: string; name: string; description: string; filePath: string; lastActivityDate: string };

const ionRouter = useIonRouter();
const rooms = ref<Room[]>([]);
const deletePopoverOpen = ref(false);
const deletePopoverEvent = ref<Event | null>(null);
const roomToDelete = ref<Room | null>(null);
const didOpenDeletePopover = ref(false);
let longPressTimer: ReturnType<typeof setTimeout> | null = null;

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

const goToRoom = (roomId: string) => {
  ionRouter.navigate('/rooms/' + roomId + '/characters', 'forward', 'push');
};

const goToCreateRoom = () => {
  ionRouter.navigate('/rooms/create/ruleType', 'forward', 'push');
};

const onRoomPressStart = (room: Room, e: MouseEvent | TouchEvent) => {
  roomToDelete.value = room;
  const source = e instanceof TouchEvent ? (e as TouchEvent).touches[0] : (e as MouseEvent);
  const clientX = source?.clientX ?? 0;
  const clientY = source?.clientY ?? 0;
  longPressTimer = setTimeout(() => {
    longPressTimer = null;
    didOpenDeletePopover.value = true;
    const ev = new MouseEvent('click', { clientX, clientY, bubbles: true });
    deletePopoverEvent.value = ev;
    deletePopoverOpen.value = true;
  }, 500);
};

const onRoomPressEnd = () => {
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
</style>
