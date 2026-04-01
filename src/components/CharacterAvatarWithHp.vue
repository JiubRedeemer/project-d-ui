<script setup lang="ts">
import {IonAvatar} from "@ionic/vue";
import {computed} from "vue";
import {Character} from "@/components/models/response/Character";
import CachedFileImage from "@/components/CachedFileImage.vue";
import {getCharacterAvatarUrl, CHARACTER_AVATAR_PLACEHOLDER} from "@/utils/characterAvatar";

const props = withDefaults(
  defineProps<{
    character: Character;
    size?: "normal" | "compact";
  }>(),
  { size: "normal" }
);

const sizePx = computed(() => (props.size === "compact" ? 48 : 64));

const hasHealth = computed(
  () =>
    props.character.health &&
    props.character.health.maxHp > 0 &&
    typeof props.character.health.currentHp === "number"
);

const hpPercent = computed(() => {
  if (!hasHealth.value) return 100;
  const {currentHp, maxHp} = props.character.health;
  return Math.min(100, Math.max(0, (currentHp / maxHp) * 100));
});

const strokeDashoffset = computed(() => 100 - hpPercent.value);
</script>

<template>
  <div class="avatar-hp-wrapper" :style="{ width: sizePx + 'px', height: sizePx + 'px' }">
    <svg
      v-if="hasHealth"
      class="hp-ring"
      viewBox="0 0 36 36"
      aria-hidden="true"
    >
      <path
        class="hp-ring-bg"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      />
      <path
        class="hp-ring-fill"
        :class="{ danger: hpPercent <= 25 }"
        :style="{ strokeDasharray: '100 100', strokeDashoffset }"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      />
    </svg>
    <ion-avatar class="avatar-inner" :style="{ width: sizePx + 'px', height: sizePx + 'px' }">
      <CachedFileImage
        :width="sizePx"
        :height="sizePx"
        :src="getCharacterAvatarUrl(character)"
        alt=""
        @error="($event.target as HTMLImageElement).src = CHARACTER_AVATAR_PLACEHOLDER"
      />
    </ion-avatar>
  </div>
</template>

<style scoped>
.avatar-hp-wrapper {
  position: relative;
  flex-shrink: 0;
}

.hp-ring {
  position: absolute;
  inset: -4px;
  width: calc(100% + 8px);
  height: calc(100% + 8px);
  transform: rotate(-90deg);
  pointer-events: none;
}

.hp-ring-bg {
  fill: none;
  stroke: rgba(0, 0, 0, 0.4);
  stroke-width: 3;
}

.hp-ring-fill {
  fill: none;
  stroke: var(--ion-color-danger);
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.4s ease;
}

.hp-ring-fill.danger {
  stroke: #8b0000;
  animation: hp-pulse 1.2s infinite;
}

.avatar-inner {
  position: absolute;
  inset: 0;
}

.avatar-inner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

@keyframes hp-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
