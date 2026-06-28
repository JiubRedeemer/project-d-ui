<template>
  <transition name="offline-slide">
    <div v-if="showBanner" class="offline-banner" :class="bannerClass" role="status" aria-live="polite">
      <span class="offline-banner__icon">{{ isOnline ? '↑' : '✕' }}</span>
      <span class="offline-banner__text">{{ bannerText }}</span>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { isOnline, pendingMutationCount } from '@/composables/useOfflineSync';

// Show "synced" banner briefly after coming back online and flushing queue
const justSynced = ref(false);
let syncTimer: ReturnType<typeof setTimeout> | null = null;

watch(isOnline, (online) => {
  if (online && pendingMutationCount.value === 0) {
    // Came back online with nothing pending — flash briefly
    justSynced.value = true;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      justSynced.value = false;
    }, 2500);
  }
});

watch(pendingMutationCount, (count, prev) => {
  if (count === 0 && prev > 0 && isOnline.value) {
    justSynced.value = true;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      justSynced.value = false;
    }, 2500);
  }
});

const showBanner = computed(() => !isOnline.value || pendingMutationCount.value > 0 || justSynced.value);

const bannerClass = computed(() => {
  if (!isOnline.value) return 'offline-banner--offline';
  if (pendingMutationCount.value > 0) return 'offline-banner--pending';
  return 'offline-banner--synced';
});

const bannerText = computed(() => {
  if (!isOnline.value) {
    return pendingMutationCount.value > 0
      ? `Нет сети · ${pendingMutationCount.value} изм. ожидают синхронизации`
      : 'Нет сети · данные из кэша';
  }
  if (pendingMutationCount.value > 0) {
    return `Синхронизация · ${pendingMutationCount.value} изм.`;
  }
  return 'Данные синхронизированы';
});
</script>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  pointer-events: none;
  /* Safe area for notched devices */
  padding-top: calc(6px + env(safe-area-inset-top, 0px));
}

.offline-banner--offline {
  background: #c0392b;
  color: #fff;
}

.offline-banner--pending {
  background: #e67e22;
  color: #fff;
}

.offline-banner--synced {
  background: #27ae60;
  color: #fff;
}

.offline-banner__icon {
  font-style: normal;
  font-size: 15px;
}

.offline-slide-enter-active,
.offline-slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.offline-slide-enter-from,
.offline-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
