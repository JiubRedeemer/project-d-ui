<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSegment,
  IonSegmentButton,
  onIonViewDidEnter,
} from "@ionic/vue";
import { calendarOutline, locationOutline, timeOutline } from "ionicons/icons";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import { useSchedulerStore } from "@/stores/SchedulerStore";

const route = useRoute();
const schedulerStore = useSchedulerStore();
const roomId = computed(() => String(route.params.roomId ?? ""));
const from = ref("");
const to = ref("");
const selectedGameId = ref<string | null>(null);
const attendanceStatus = ref<"GOING" | "MAYBE" | "NOT_GOING">("GOING");

const games = computed(() => schedulerStore.getGamesForRoom(roomId.value));
const selectedGame = computed(() => games.value.find((game) => game.id === selectedGameId.value) ?? null);
const attendance = computed(() =>
  selectedGameId.value ? schedulerStore.attendanceByGame[selectedGameId.value] ?? [] : []
);
const statusLabelMap: Record<string, string> = {
  PLANNED: "Запланирована",
  RESCHEDULED: "Перенесена",
  CANCELLED: "Отменена",
  COMPLETED: "Завершена",
};

const gameStatusColor = (status: string) => {
  if (status === "CANCELLED") return "danger";
  if (status === "RESCHEDULED") return "warning";
  if (status === "COMPLETED") return "medium";
  return "success";
};

const statusLabel = (status: string) => statusLabelMap[status] ?? status;

const loadGames = async () => {
  await schedulerStore.loadGames(roomId.value, from.value || undefined, to.value || undefined);
};

const openDetails = async (gameId: string) => {
  selectedGameId.value = gameId;
  await schedulerStore.loadAttendance(gameId);
};

const saveAttendance = async () => {
  if (!selectedGameId.value) return;
  await schedulerStore.saveAttendance(selectedGameId.value, attendanceStatus.value);
  await schedulerStore.loadAttendance(selectedGameId.value);
};

onIonViewDidEnter(async () => {
  await loadGames();
});
</script>

<template>
  <ion-page>
    <RoomsHeader header-name="Календарь игр" force-back-button />
    <ion-content :fullscreen="true" color="dark" class="calendar-content">
      <div class="calendar-shell">
        <section class="calendar-hero">
          <p class="calendar-eyebrow">Room Scheduler</p>
          <h1>Календарь игр</h1>
          <p>Выберите сессию, чтобы увидеть детали и attendance.</p>
        </section>

        <section class="filters-card">
          <ion-item color="dark" class="filter-item">
            <ion-label position="stacked">От</ion-label>
            <ion-input v-model="from" type="datetime-local" />
          </ion-item>
          <ion-item color="dark" class="filter-item">
            <ion-label position="stacked">До</ion-label>
            <ion-input v-model="to" type="datetime-local" />
          </ion-item>
          <ion-button expand="block" class="ion-margin-top" @click="loadGames">
            Применить фильтр
          </ion-button>
        </section>

        <ion-list lines="none" class="games-list">
        <ion-item
          v-for="game in games"
          :key="game.id"
          color="dark"
          button
          class="game-item"
          @click="openDetails(game.id)"
        >
          <ion-label>
            <div class="game-title-row">
              <h2>{{ game.title }}</h2>
              <span class="status-pill" :class="`status-${gameStatusColor(game.status)}`">{{ statusLabel(game.status) }}</span>
            </div>
            <p class="meta-row">
              <ion-icon :icon="calendarOutline" />
              {{ new Date(game.scheduledAt).toLocaleString() }}
            </p>
            <p class="meta-row">
              <ion-icon :icon="timeOutline" />
              {{ game.durationMinutes }} мин
            </p>
            <p class="meta-row">
              <ion-icon :icon="locationOutline" />
              {{ game.location }}
            </p>
          </ion-label>
        </ion-item>
        </ion-list>

        <div v-if="!games.length" class="empty">Нет игр в выбранном периоде</div>

        <div v-if="selectedGame" class="details">
          <h2>{{ selectedGame.title }}</h2>
          <p class="details-description">{{ selectedGame.description || "Без описания" }}</p>
          <ion-segment v-model="attendanceStatus">
            <ion-segment-button value="GOING"><ion-label>GOING</ion-label></ion-segment-button>
            <ion-segment-button value="MAYBE"><ion-label>MAYBE</ion-label></ion-segment-button>
            <ion-segment-button value="NOT_GOING"><ion-label>NOT_GOING</ion-label></ion-segment-button>
          </ion-segment>
          <ion-button expand="block" class="ion-margin-top" @click="saveAttendance">Сохранить attendance</ion-button>
          <ion-list lines="none" class="ion-margin-top">
            <ion-item v-for="item in attendance" :key="item.id" color="dark">
              <ion-label>{{ item.playerId }}: {{ item.status }}</ion-label>
            </ion-item>
          </ion-list>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.calendar-content {
  --background: radial-gradient(circle at 14% 16%, rgba(var(--ion-color-primary-rgb), 0.2), transparent 46%),
    radial-gradient(circle at 88% 10%, rgba(var(--ion-color-tertiary-rgb), 0.16), transparent 44%),
    linear-gradient(165deg, var(--ion-color-dark) 0%, var(--ion-color-medium-shade) 60%, var(--ion-color-medium) 100%);
}

.calendar-shell {
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 12px;
}

.calendar-hero {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.14);
  background: linear-gradient(150deg, rgba(var(--ion-color-light-rgb), 0.1), rgba(var(--ion-color-light-rgb), 0.03));
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.24);
}

.calendar-eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.68);
}

.calendar-hero h1 {
  margin: 8px 0 6px;
  font-size: clamp(24px, 4.8vw, 34px);
}

.calendar-hero p {
  margin: 0;
  color: rgba(var(--ion-color-light-rgb), 0.84);
}

.filters-card {
  margin-top: 12px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(var(--ion-color-dark-rgb), 0.28);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
}

.filter-item {
  --background: transparent;
  --inner-padding-end: 0;
}

.games-list {
  margin-top: 12px;
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.game-item {
  --background: linear-gradient(145deg, rgba(var(--ion-color-light-rgb), 0.1), rgba(var(--ion-color-light-rgb), 0.03));
  --border-radius: 14px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
}

.game-title-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.status-pill {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid currentColor;
}

.status-success { color: var(--ion-color-success); }
.status-warning { color: var(--ion-color-warning); }
.status-danger { color: var(--ion-color-danger); }
.status-medium { color: var(--ion-color-medium); }

.meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0 0;
  color: rgba(var(--ion-color-light-rgb), 0.82);
}

.empty {
  opacity: 0.8;
  text-align: center;
  margin-top: 18px;
}

.details {
  margin-top: 14px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(var(--ion-color-dark-rgb), 0.36);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
}

.details-description {
  color: rgba(var(--ion-color-light-rgb), 0.84);
}
</style>
