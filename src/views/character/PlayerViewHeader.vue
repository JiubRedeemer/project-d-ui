<script setup lang="ts">

import {IonBackButton, IonButtons, IonTitle, IonToolbar} from "@ionic/vue";
import LogOutButton from "@/views/common/LogOutButton.vue";
import {useCharacterStore} from "@/stores/CharacterStore"
import {computed} from "vue";


const characterStore = useCharacterStore()
const emit = defineEmits<{
  (e: "open-levelup-modal"): void;
}>();

const openLevelupModal = () => {
  emit("open-levelup-modal");
};

/**
 * Масштаб имени под ширину заголовка на смартфонах (портрет).
 *
 * Оценка полезной ширины под `ion-title`: типичный экран 360 CSS px минус back (~48px),
 * отступы тулбара, блок уровня (~40px) + отступы, LogOut — остаётся порядка 150–175px;
 * на узких 320px — ближе к 125–145px. Берём консервативный бюджет ~148px, чтобы не
 * упираться в край на SE/малых Android.
 *
 * Визуальная ширина строки ≈ len × (font-size × коэфф. ширины глифа). Для bold 16px
 * смесь кириллица/латиница ~0.58em ≈ 9.3px на знак (чуть уже, чем «средняя» метрика шрифта).
 * Ищем scale: len × 9.35 × scale ≤ 148 → scale ≤ 148 / (len × 9.35), не выше 1.
 */
const NAME_LINE_BUDGET_PX = 148;
/** Средняя ширина знака (px) для font-weight: 700, font-size: 16px. */
const NAME_AVG_CHAR_WIDTH_PX = 9.35;
const NAME_SCALE_MIN = 0.34;

const nameTextScale = computed(() => {
  const len = (characterStore.character?.name ?? "").length;
  if (len === 0) return 1;
  const raw = NAME_LINE_BUDGET_PX / (len * NAME_AVG_CHAR_WIDTH_PX);
  const clamped = Math.min(1, raw);
  const rounded = Math.round(clamped * 100) / 100;
  return Math.max(NAME_SCALE_MIN, rounded);
});


</script>

<template>
  <ion-toolbar class="player-view-toolbar" color="dark">
    <ion-buttons slot="start">
      <ion-back-button/>
    </ion-buttons>

    <ion-title slot="start">
      <div class="header-content" v-if="characterStore.character">
        <div
          class="name-block"
          :style="{ transform: `scale(${nameTextScale})` }"
        >{{ characterStore.character?.name }}</div>
        <div class="race-class-block">{{ characterStore.character?.raceInfo?.name }} -
          {{ characterStore.character?.clazzInfo?.name }}
        </div>
      </div>
    </ion-title>

    <ion-buttons slot="end">
      <div class="level-container"
           role="button"
           tabindex="0"
           @click="openLevelupModal"
           @keydown.enter.prevent="openLevelupModal"
           @keydown.space.prevent="openLevelupModal">
        <div class="level-circle">
          <div class="level">{{ characterStore.character?.level?.level }}</div>
          <div class="experience">{{
              characterStore.character?.level?.xp
            }}/{{ characterStore.character?.level?.nextLevelXp }}
          </div>
        </div>
      </div>
      <LogOutButton/>
    </ion-buttons>
  </ion-toolbar>
</template>

<style scoped>
.player-view-toolbar :deep(ion-title) {
  overflow: hidden;
  min-width: 0;
}

.header-content {
  display: flex;
  flex-direction: column;
  align-items: start;
  min-width: 0;
  width: 100%;
}

.name-block {
  font-size: 16px;
  font-weight: bold;
  display: inline-block;
  transform-origin: left center;
  line-height: 1.2;
  max-width: 100%;
}

.race-class-block {
  font-size: 10px;
  max-height: 50px;
  color: var(--ion-color-primary);

  white-space: wrap;        /* разрешает перенос строк */
}

.level-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  cursor: pointer;
}

.level-circle {
  position: relative;
  width: 40px; /* Размер круга */
  height: 40px;
  border-radius: 50%;
  background-color: var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: bold;
  text-align: center;
  box-sizing: border-box;
}

.level {
  font-size: 16px; /* Размер уровня в центре */
  color: var(--ion-color-primary-contrast);
}

.experience {
  position: absolute;
  bottom: -5px; /* Смещение текста опыта ближе к обводке */
  font-size: 12px; /* Мелкий текст для опыта */
  color: #ffffff;
  background-color: var(--ion-color-secondary); /* Цвет фона для синхронности с кругом */
  padding: 0 4px;
  border-radius: 4px;
}


</style>
