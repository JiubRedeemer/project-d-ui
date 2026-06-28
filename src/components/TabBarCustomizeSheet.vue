<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { starOutline, star } from 'ionicons/icons'
import type { TabKey } from '@/composables/useTabBarConfig'
import { MAX_VISIBLE } from '@/composables/useTabBarConfig'

const props = defineProps<{
  isOpen: boolean
  order: TabKey[]
  hidden: TabKey[]
  allTabs: readonly TabKey[]
  tabMeta: Record<TabKey, { label: string; icon: string }>
  currentTab: TabKey
}>()

const emit = defineEmits<{
  close: []
  toggleHidden: [tab: TabKey]
  navigate: [tab: TabKey]
}>()

const localHidden = ref<TabKey[]>([...props.hidden])

watch(() => props.isOpen, (open) => {
  if (open) localHidden.value = [...props.hidden]
})

const favoriteCount = computed(() => props.allTabs.filter(t => !localHidden.value.includes(t)).length)
const canAddFavorite = computed(() => favoriteCount.value < MAX_VISIBLE)

function isFavorite(tab: TabKey) {
  return !localHidden.value.includes(tab)
}

function onToggleFavorite(tab: TabKey) {
  if (isFavorite(tab)) {
    if (favoriteCount.value <= 1) return
    localHidden.value = [...localHidden.value, tab]
  } else {
    if (!canAddFavorite.value) return
    localHidden.value = localHidden.value.filter(t => t !== tab)
  }
  emit('toggleHidden', tab)
}

function onNavigate(tab: TabKey) {
  emit('navigate', tab)
  emit('close')
}
</script>

<template>
  <Transition name="sheet-fade">
    <div v-if="isOpen" class="sheet-backdrop" @click.self="emit('close')">
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Меню разделов">
        <div class="sheet__handle" aria-hidden="true"/>

        <div class="sheet__header">
          <h2 class="sheet__title">Разделы</h2>
          <div class="sheet__fav-count">
            <ion-icon :icon="star" class="sheet__fav-count-icon"/>
            <span>{{ favoriteCount }}&thinsp;/&thinsp;{{ MAX_VISIBLE }}</span>
          </div>
        </div>
        <p class="sheet__hint">Нажмите, чтобы перейти. Звёздочка — добавить в панель быстрого доступа.</p>

        <ul class="sheet__list">
          <li
            v-for="tab in allTabs"
            :key="tab"
            class="sheet__row"
            :class="{ 'sheet__row--active': tab === currentTab }"
            @click="onNavigate(tab)"
          >
            <div class="sheet__row-icon-wrap">
              <ion-icon :icon="tabMeta[tab].icon" class="sheet__row-icon"/>
            </div>
            <span class="sheet__row-label">{{ tabMeta[tab].label }}</span>
            <span v-if="tab === currentTab" class="sheet__row-badge">Сейчас</span>

            <button
              class="fav-btn"
              :class="{
                'fav-btn--on': isFavorite(tab),
                'fav-btn--locked': !isFavorite(tab) && !canAddFavorite
              }"
              :aria-label="isFavorite(tab) ? `Убрать ${tabMeta[tab].label} из панели` : `Добавить ${tabMeta[tab].label} в панель`"
              :aria-pressed="isFavorite(tab)"
              @click.stop="onToggleFavorite(tab)"
            >
              <ion-icon :icon="isFavorite(tab) ? star : starOutline"/>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.sheet {
  background: var(--ion-color-medium, #2d2d3a);
  border-radius: 20px 20px 0 0;
  padding: 12px 0 calc(12px + env(safe-area-inset-bottom, 0px));
  max-height: 85vh;
  overflow-y: auto;
}

.sheet__handle {
  width: 36px;
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.18);
  margin: 0 auto 14px;
}

.sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  margin-bottom: 4px;
}

.sheet__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--ion-color-light, #fff);
  margin: 0;
}

.sheet__fav-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
}
.sheet__fav-count-icon {
  font-size: 13px;
  color: #f0b840;
}

.sheet__hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 16px 12px;
  line-height: 1.5;
}

.sheet__list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sheet__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  cursor: pointer;
  transition: background 0.12s;
  position: relative;
}
.sheet__row::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 56px;
  right: 16px;
  height: 0.5px;
  background: rgba(255, 255, 255, 0.07);
}
.sheet__list li:last-child::after {
  display: none;
}
.sheet__row:active {
  background: rgba(255, 255, 255, 0.05);
}
.sheet__row--active {
  background: rgba(var(--ion-color-primary-rgb, 124,106,240), 0.1);
}

.sheet__row-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.07);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sheet__row--active .sheet__row-icon-wrap {
  background: rgba(var(--ion-color-primary-rgb, 124,106,240), 0.2);
}

.sheet__row-icon {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.65);
}
.sheet__row--active .sheet__row-icon {
  color: var(--ion-color-primary, #7c6af0);
}

.sheet__row-label {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: var(--ion-color-light, #fff);
}
.sheet__row--active .sheet__row-label {
  color: var(--ion-color-primary, #7c6af0);
  font-weight: 600;
}

.sheet__row-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--ion-color-primary, #7c6af0);
  background: rgba(var(--ion-color-primary-rgb, 124,106,240), 0.15);
  border-radius: 6px;
  padding: 2px 7px;
}

/* Favorite star button */
.fav-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.25);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px;
  transition: color 0.15s, transform 0.15s;
}
.fav-btn:active {
  transform: scale(0.85);
}
.fav-btn--on {
  color: #f0b840;
}
.fav-btn--locked {
  color: rgba(255, 255, 255, 0.12);
  cursor: default;
  pointer-events: none;
}

/* Transition */
.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 0.22s ease;
}
.sheet-fade-enter-active .sheet,
.sheet-fade-leave-active .sheet {
  transition: transform 0.22s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}
.sheet-fade-enter-from .sheet,
.sheet-fade-leave-to .sheet {
  transform: translateY(100%);
}
</style>
