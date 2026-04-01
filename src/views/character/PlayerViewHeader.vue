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
 * Сжатие имени через `transform: scale()` — те же коэффициенты и порядок, что `hpTextScale`
 * в HpBar.vue. «Эффективная длина» = длина имени минус запас под ширину тулбара (как в HP
 * total = длины чисел + «/»). Для очень длинных имён — дополнительные ступени ниже 0.75.
 */
const NAME_TOOLBAR_HEADROOM = 8;
const NAME_SCALE_MIN = 0.34;

const nameTextScale = computed(() => {
  const len = (characterStore.character?.name ?? "").length;
  if (len === 0) return 1;
  if (len <= NAME_TOOLBAR_HEADROOM) return 1;

  const total = len - NAME_TOOLBAR_HEADROOM;

  if (total <= 5) return 0.8;
  if (total <= 7) return 0.7;
  if (total <= 9) return 0.5;
  if (total <= 11) return 0.82;
  if (total <= 24) return 0.75;
  if (total <= 32) return 0.6;
  if (total <= 42) return 0.5;
  return NAME_SCALE_MIN;
});


</script>

<template>
  <ion-toolbar class="player-view-toolbar" color="dark">
    <ion-buttons slot="start">
      <ion-back-button/>
    </ion-buttons>

    <ion-title >
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
  line-height: 1;
  margin-right: 0;
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
