<script setup lang="ts">
import {
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  toastController,
} from "@ionic/vue";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useSchedulerStore } from "@/stores/SchedulerStore";
import { useRoomStore } from "@/stores/RoomStore";

const route = useRoute();
const schedulerStore = useSchedulerStore();
const roomStore = useRoomStore();
const roomId = computed(() => String(route.params.roomId ?? ""));

const form = ref({
  title: "",
  description: "",
  scheduledAt: "",
  durationMinutes: 180,
  timezone: "UTC",
  location: "",
  playerLimit: 6,
});

const rescheduleDate = ref<Record<string, string>>({});
const rescheduleReason = ref<Record<string, string>>({});
const selectedPlayerIds = ref<Record<string, string[]>>({});

const games = computed(() => schedulerStore.getGamesForRoom(roomId.value));

const create = async () => {
  await schedulerStore.createRoomGame(roomId.value, {
    campaignId: roomId.value,
    ...form.value,
  });
  const toast = await toastController.create({ message: "Игра создана", duration: 1200, position: "top" });
  await toast.present();
};

const saveGame = async (gameId: string) => {
  await schedulerStore.editGame(roomId.value, gameId, {
    title: form.value.title || undefined,
    description: form.value.description || undefined,
    scheduledAt: form.value.scheduledAt || undefined,
    durationMinutes: Number(form.value.durationMinutes) || undefined,
    timezone: form.value.timezone || undefined,
    location: form.value.location || undefined,
    playerLimit: Number(form.value.playerLimit) || undefined,
  });
};

const reschedule = async (gameId: string) => {
  await schedulerStore.rescheduleRoomGame(
    roomId.value,
    gameId,
    rescheduleDate.value[gameId],
    rescheduleReason.value[gameId]
  );
};

const cancel = async (gameId: string) => {
  await schedulerStore.cancelRoomGame(roomId.value, gameId);
};

const invite = async (gameId: string) => {
  await schedulerStore.invitePlayersToGame(gameId, selectedPlayerIds.value[gameId] ?? []);
  await schedulerStore.loadGameInvitations(gameId);
};

const loadInvitations = async (gameId: string) => {
  await schedulerStore.loadGameInvitations(gameId);
};
</script>

<template>
  <div class="scheduler-tab">
    <ion-item color="dark"><ion-label position="stacked">Название</ion-label><ion-input v-model="form.title" /></ion-item>
    <ion-item color="dark"><ion-label position="stacked">Описание</ion-label><ion-textarea v-model="form.description" /></ion-item>
    <ion-item color="dark"><ion-label position="stacked">Дата</ion-label><ion-input v-model="form.scheduledAt" type="datetime-local" /></ion-item>
    <ion-item color="dark"><ion-label position="stacked">Длительность (мин)</ion-label><ion-input v-model.number="form.durationMinutes" type="number" /></ion-item>
    <ion-item color="dark"><ion-label position="stacked">Timezone</ion-label><ion-input v-model="form.timezone" /></ion-item>
    <ion-item color="dark"><ion-label position="stacked">Локация</ion-label><ion-input v-model="form.location" /></ion-item>
    <ion-item color="dark"><ion-label position="stacked">Лимит игроков</ion-label><ion-input v-model.number="form.playerLimit" type="number" /></ion-item>
    <ion-button expand="block" class="ion-margin-vertical" @click="create" :disabled="schedulerStore.isPending(`createGame:${roomId}`)">
      Создать игру
    </ion-button>

    <ion-list lines="none">
      <ion-item v-for="game in games" :key="game.id" color="dark">
        <ion-label>
          <h2>{{ game.title }} · {{ game.status }}</h2>
          <p>{{ new Date(game.scheduledAt).toLocaleString() }}</p>
          <ion-button size="small" @click="saveGame(game.id)">Обновить</ion-button>
          <ion-button size="small" color="warning" @click="cancel(game.id)">Отменить</ion-button>
          <ion-item color="dark">
            <ion-label position="stacked">Новая дата</ion-label>
            <ion-input v-model="rescheduleDate[game.id]" type="datetime-local" />
          </ion-item>
          <ion-item color="dark">
            <ion-label position="stacked">Причина</ion-label>
            <ion-input v-model="rescheduleReason[game.id]" />
          </ion-item>
          <ion-button size="small" @click="reschedule(game.id)">Перенести</ion-button>

          <ion-item color="dark">
            <ion-label position="stacked">Игроки для инвайта</ion-label>
            <ion-select v-model="selectedPlayerIds[game.id]" multiple>
              <ion-select-option v-for="character in roomStore.characters" :key="character.id" :value="character.userId">
                {{ character.name }} ({{ character.ownerUsername }})
              </ion-select-option>
            </ion-select>
          </ion-item>
          <ion-button size="small" @click="invite(game.id)">Пригласить</ion-button>
          <ion-button size="small" fill="outline" @click="loadInvitations(game.id)">Показать инвайты</ion-button>
          <p v-for="inviteItem in schedulerStore.invitationsByGame[game.id] ?? []" :key="inviteItem.id">
            {{ inviteItem.playerId }}: {{ inviteItem.status }}
          </p>
        </ion-label>
      </ion-item>
    </ion-list>
  </div>
</template>
