<script setup lang="ts">
import {ref, watch, computed} from "vue";
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonItem, IonLabel, IonToggle, IonSelect, IonSelectOption, IonIcon,
  IonInput, IonDatetime, IonDatetimeButton, IonSpinner,
} from "@ionic/vue";
import {closeOutline, trashOutline} from "ionicons/icons";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

const props = defineProps<{ isOpen: boolean; roomId: string }>();
const emit = defineEmits<{ (e: "close"): void; (e: "saved"): void }>();

const isRecurring = ref(false);
const sessionDatetime = ref<string>("");
const recurrenceType = ref<"WEEKLY" | "BIWEEKLY" | "MONTHLY">("WEEKLY");
const dayOfWeek = ref<number>(1);
const dayOfMonth = ref<number>(1);
const sessionTime = ref<string>("20:00:00");
const loading = ref(false);
const hasSchedule = ref(false);

const DAYS = [
  {value: 1, label: "Пн"}, {value: 2, label: "Вт"}, {value: 3, label: "Ср"},
  {value: 4, label: "Чт"}, {value: 5, label: "Пт"}, {value: 6, label: "Сб"},
  {value: 7, label: "Вс"},
];

const http = () => axios.create({
  baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
  headers: {"Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("accessToken")},
});

const scheduleUrl = computed(() =>
  `${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${props.roomId}${GATEWAY_INTEGRATION_ROUTES.schedule}`
);

watch(() => props.isOpen, async (open) => {
  if (!open) return;
  try {
    const res = await http().get(scheduleUrl.value);
    if (res.status === 200 && res.data) {
      const d = res.data;
      hasSchedule.value = true;
      isRecurring.value = d.isRecurring;
      if (!d.isRecurring && d.sessionDatetime) {
        sessionDatetime.value = d.sessionDatetime;
      }
      if (d.isRecurring) {
        recurrenceType.value = d.recurrenceType ?? "WEEKLY";
        dayOfWeek.value = d.dayOfWeek ?? 1;
        dayOfMonth.value = d.dayOfMonth ?? 1;
        sessionTime.value = d.sessionTime ?? "20:00:00";
      }
    } else {
      resetForm();
    }
  } catch {
    resetForm();
  }
});

function resetForm() {
  hasSchedule.value = false;
  isRecurring.value = false;
  sessionDatetime.value = "";
  recurrenceType.value = "WEEKLY";
  dayOfWeek.value = 1;
  dayOfMonth.value = 1;
  sessionTime.value = "20:00:00";
}

async function save() {
  loading.value = true;
  try {
    const body: any = {isRecurring: isRecurring.value};
    if (!isRecurring.value) {
      body.sessionDatetime = sessionDatetime.value?.replace("Z", "").slice(0, 19) || null;
    } else {
      body.recurrenceType = recurrenceType.value;
      const t = sessionTime.value;
      body.sessionTime = t.length === 5 ? t + ":00" : t;
      if (recurrenceType.value !== "MONTHLY") body.dayOfWeek = dayOfWeek.value;
      else body.dayOfMonth = dayOfMonth.value;
    }
    await http().put(scheduleUrl.value, body);
    hasSchedule.value = true;
    emit("saved");
    emit("close");
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function deleteSchedule() {
  loading.value = true;
  try {
    await http().delete(scheduleUrl.value);
    resetForm();
    emit("saved");
    emit("close");
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <ion-modal :is-open="isOpen" @didDismiss="emit('close')" :initial-breakpoint="0.85" :breakpoints="[0, 0.85, 1]">
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Расписание игр</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="emit('close')">
            <ion-icon :icon="closeOutline" slot="icon-only"/>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content color="dark" class="schedule-content">
      <div class="schedule-form">

        <ion-item color="dark" lines="none" class="toggle-item">
          <ion-label>Повторяющееся</ion-label>
          <ion-toggle v-model="isRecurring" slot="end" color="primary"/>
        </ion-item>

        <!-- Разовое событие -->
        <template v-if="!isRecurring">
          <div class="form-section">
            <p class="form-label">Дата и время</p>
            <ion-datetime
              v-model="sessionDatetime"
              presentation="date-time"
              locale="ru-RU"
              :first-day-of-week="1"
              hour-cycle="h23"
              color="primary"
              class="datetime-picker"
            />
          </div>
        </template>

        <!-- Повторяющееся -->
        <template v-else>
          <ion-item color="dark" lines="none">
            <ion-label>Периодичность</ion-label>
            <ion-select v-model="recurrenceType" interface="popover">
              <ion-select-option value="WEEKLY">Каждую неделю</ion-select-option>
              <ion-select-option value="BIWEEKLY">Каждые 2 недели</ion-select-option>
              <ion-select-option value="MONTHLY">Раз в месяц</ion-select-option>
            </ion-select>
          </ion-item>

          <div v-if="recurrenceType !== 'MONTHLY'" class="form-section">
            <p class="form-label">День недели</p>
            <div class="day-buttons">
              <button
                v-for="day in DAYS"
                :key="day.value"
                :class="['day-btn', {active: dayOfWeek === day.value}]"
                @click="dayOfWeek = day.value"
              >{{ day.label }}</button>
            </div>
          </div>

          <ion-item v-if="recurrenceType === 'MONTHLY'" color="dark" lines="none">
            <ion-label>День месяца</ion-label>
            <ion-input
              v-model="dayOfMonth"
              type="number"
              :min="1"
              :max="28"
              slot="end"
              class="day-month-input"
            />
          </ion-item>

          <div class="form-section">
            <p class="form-label">Время начала</p>
            <ion-datetime
              v-model="sessionTime"
              presentation="time"
              hour-cycle="h23"
              color="primary"
              class="datetime-picker"
            />
          </div>
        </template>

        <div class="form-actions">
          <ion-button expand="block" shape="round" color="primary" :disabled="loading" @click="save">
            <ion-spinner v-if="loading" name="crescent"/>
            <span v-else>Сохранить</span>
          </ion-button>
          <ion-button v-if="hasSchedule" expand="block" fill="clear" color="danger" :disabled="loading" @click="deleteSchedule">
            <ion-icon slot="start" :icon="trashOutline"/>
            Удалить расписание
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.schedule-content {
  --padding-bottom: 32px;
}
.schedule-form {
  padding: 8px 0 32px;
}
.toggle-item {
  margin-bottom: 8px;
}
.form-section {
  padding: 12px 16px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.form-label {
  font-size: 13px;
  color: var(--ion-color-primary);
  margin: 0 0 8px;
}
.datetime-picker {
  --background: var(--ion-color-dark-shade);
  border-radius: 12px;
}
.day-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.day-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid var(--ion-color-medium);
  background: transparent;
  color: var(--ion-color-light);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.day-btn.active {
  background: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
  color: #fff;
}
.day-month-input {
  max-width: 64px;
  text-align: right;
}
.form-actions {
  padding: 24px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
