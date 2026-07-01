<script setup lang="ts">

import {IonBackButton, IonToolbar} from "@ionic/vue";
import LogOutButton from "@/views/common/LogOutButton.vue";
import {useCharacterStore} from "@/stores/CharacterStore";
import {useTransformStore} from "@/stores/TransformStore";
import {computed} from "vue";

const characterStore = useCharacterStore()
const transformStore = useTransformStore()
const emit = defineEmits<{
  (e: "open-levelup-modal"): void;
}>();

const activeForm = computed(() =>
  characterStore.character?.id
    ? transformStore.activeForm(characterStore.character.id)
    : null
)

const openLevelupModal = () => {
  emit("open-levelup-modal");
};

/**
 * Сжатие имени через `transform: scale()` — те же коэффициенты, что в HpBar.vue.
 */
const NAME_TOOLBAR_HEADROOM = 8;
const NAME_SCALE_MIN = 0.34;

const nameTextScale = computed(() => {
  const len = (characterStore.character?.name ?? "").length;
  if (len === 0) return 1;
  if (len <= NAME_TOOLBAR_HEADROOM) return 1;

  const total = len - NAME_TOOLBAR_HEADROOM;

  if (total <= 5) return 1;
  if (total <= 7) return 1;
  if (total <= 9) return 1;
  if (total <= 11) return 0.8;
  if (total <= 24) return 0.75;
  if (total <= 32) return 0.6;
  if (total <= 42) return 0.5;
  return NAME_SCALE_MIN;
});
</script>

<template>
  <ion-toolbar class="player-header" color="dark">
    <div class="player-header__row">
      <ion-back-button class="player-header__back" default-href="/rooms"/>

      <div class="player-identity" v-if="characterStore.character">
        <div class="player-identity__name" :style="{ transform: `scale(${nameTextScale})` }">{{ characterStore.character.name }}</div>
        <div class="player-identity__meta">
          <template v-if="activeForm">
            <span class="transform-badge">⬡ {{ activeForm.name }}</span>
          </template>
          <template v-else>
            <span>{{ characterStore.character.raceInfo?.name }}</span>
            <span class="player-identity__sep" aria-hidden="true"/>
            <span>{{ characterStore.character.clazzInfo?.name }}</span>
          </template>
        </div>
      </div>

      <div class="player-header__actions">
        <button type="button" class="level-badge" @click="openLevelupModal">
          <span class="level-badge__circle">
            <span class="level-badge__level">{{ characterStore.character?.level?.level }}</span>
          </span>
        </button>
        <LogOutButton class="header-action-btn"/>
      </div>
    </div>
  </ion-toolbar>
</template>

<style scoped>
.player-header {
  --min-height: 56px;
  --padding-top: 4px;
  --padding-bottom: 8px;
  --padding-start: 4px;
  --padding-end: 4px;
  --border-width: 0;
}

.player-header__row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.player-header__back {
  flex-shrink: 0;
  --color: rgba(var(--ion-color-light-rgb), 0.78);
  --icon-margin-start: 0;
  --icon-margin-end: 0;
  --icon-font-size: 20px;
  width: 36px;
}

.player-identity {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  overflow: hidden;
}

.player-identity__name {
  display: inline-block;
  max-width: 100%;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--ion-color-light);
  white-space: nowrap;
  transform-origin: left center;
}

.player-identity__meta {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  color: rgba(var(--ion-color-primary-rgb), 0.82);
}

.player-identity__meta span:not(.player-identity__sep) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-identity__sep {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(var(--ion-color-primary-rgb), 0.5);
  flex-shrink: 0;
}

.player-header__actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.level-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-right: 2px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.level-badge:active .level-badge__circle {
  transform: scale(0.95);
}

.level-badge__circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid var(--ion-color-primary);
  background: radial-gradient(circle at 35% 30%, rgba(var(--ion-color-primary-rgb), 0.28), var(--ion-color-medium) 70%);
  box-shadow: 0 0 0 3px rgba(var(--ion-color-primary-rgb), 0.12), 0 4px 10px rgba(0, 0, 0, 0.35);
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.level-badge:hover .level-badge__circle {
  box-shadow: 0 0 0 4px rgba(var(--ion-color-primary-rgb), 0.18), 0 6px 14px rgba(0, 0, 0, 0.4);
}

.level-badge__level {
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
  color: var(--ion-color-primary);
  font-variant-numeric: tabular-nums;
}

.level-badge__xp {
  font-size: 8px;
  font-weight: 600;
  line-height: 1;
  color: rgba(var(--ion-color-light-rgb), 0.42);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.player-header :deep(.header-action-btn) {
  --color: rgba(var(--ion-color-light-rgb), 0.78);
  --padding-start: 2px;
  --padding-end: 2px;
  margin: 0;
}

.player-header :deep(.header-action-btn ion-icon) {
  font-size: 32px;
}

.transform-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--ion-color-secondary);
  letter-spacing: 0.02em;
  animation: transform-pulse 2s ease-in-out infinite alternate;
}

@keyframes transform-pulse {
  from { opacity: 0.75; }
  to   { opacity: 1; }
}
</style>
