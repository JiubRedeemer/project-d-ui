<script setup lang="ts">
import {computed, ref} from "vue";
import {useRoute} from "vue-router";
import {IonIcon, IonSpinner} from "@ionic/vue";
import {constructOutline, sparkles} from "ionicons/icons";
import {useBlueprintsStore} from "@/stores/BlueprintsStore";
import {CUSTOMIZATION_LABELS, type BlueprintDto} from "@/api/blueprintApi.types";
import {getItemByIdForRoom} from "@/api/itemApi";
import type {Item} from "@/components/models/response/InventoryResponse";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import InventorySearchItemFullViewModal from "@/views/character/tabs/inventory/InventorySearchItemFullViewModal.vue";

const route = useRoute();
const blueprintsStore = useBlueprintsStore();

const selectedItem = ref<Item | null>(null);
const showItemModal = ref(false);
const loadingItemId = ref<string | null>(null);

const ITEM_PLACEHOLDER =
    "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";

function itemImageUrl(imgUrl: string | null | undefined): string {
  return imgUrl?.trim()
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : ITEM_PLACEHOLDER;
}

/** Группировка по требуемому уровню — как заклинания по уровням. */
const groups = computed(() => {
  const byLevel = new Map<number, BlueprintDto[]>();
  for (const bp of blueprintsStore.blueprints) {
    const lvl = bp.requiredLevel ?? 1;
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl)!.push(bp);
  }
  return [...byLevel.entries()]
      .sort(([a], [b]) => a - b)
      .map(([level, items]) => ({
        level,
        items: items.sort((a, b) => a.name.localeCompare(b.name, "ru")),
      }));
});

async function openItem(bp: BlueprintDto) {
  if (!bp.itemId) return; // вариативный чертёж — конкретного предмета нет
  loadingItemId.value = bp.id;
  try {
    selectedItem.value = await getItemByIdForRoom(String(route.params.roomId), bp.itemId);
    showItemModal.value = true;
  } catch (e) {
    console.error("Failed to load blueprint item:", e);
  } finally {
    loadingItemId.value = null;
  }
}

function closeItemModal() {
  showItemModal.value = false;
  selectedItem.value = null;
}
</script>

<template>
  <div class="blueprints">
    <div v-if="blueprintsStore.loading" class="loading">
      <ion-spinner name="crescent"/>
    </div>

    <div v-else-if="groups.length === 0" class="empty">
      Доступных чертежей нет
    </div>

    <template v-else>
      <template v-for="group in groups" :key="group.level">
        <h1 class="sectionHeader">{{ group.level }} уровень</h1>
        <div class="bp-list">
          <div
              v-for="bp in group.items"
              :key="bp.id"
              class="bp-card"
              :class="{ 'bp-card--variable': !bp.itemId }"
              @click="openItem(bp)"
          >
            <div class="bp-card__media">
              <img
                  v-if="bp.itemId"
                  class="bp-card__img"
                  :src="itemImageUrl(bp.itemImgUrl)"
                  :alt="bp.name"
              />
              <span v-else class="bp-card__img bp-card__img--placeholder">
                <ion-icon :icon="sparkles"/>
              </span>
            </div>

            <div class="bp-card__body">
              <div class="bp-card__name">{{ bp.name }}</div>
              <div class="bp-card__meta">
                <span v-if="bp.itemName" class="bp-card__item">{{ bp.itemName }}</span>
                <span v-else class="bp-card__item bp-card__item--variable">На выбор</span>
                <span
                    v-if="bp.customization && bp.customization !== 'NO'"
                    class="bp-card__attune"
                >Настройка: {{ CUSTOMIZATION_LABELS[bp.customization] }}</span>
              </div>
            </div>

            <ion-spinner v-if="loadingItemId === bp.id" name="crescent" class="bp-card__spinner"/>
            <ion-icon v-else-if="bp.itemId" :icon="constructOutline" class="bp-card__arrow"/>
          </div>
        </div>
      </template>
    </template>

    <InventorySearchItemFullViewModal
        :item="selectedItem"
        :is-open="showItemModal"
        :character-id="String(route.params.characterId)"
        :room-id="String(route.params.roomId)"
        @close="closeItemModal"
    />
  </div>
</template>

<style scoped>
.blueprints {
  padding-bottom: 24px;
}

.loading, .empty {
  display: flex;
  justify-content: center;
  padding: 32px 16px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
}

.sectionHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 18px 0 10px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.72);
}

.sectionHeader::before {
  content: "";
  flex-shrink: 0;
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: var(--ion-color-primary);
}

.bp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bp-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 16px;
  cursor: pointer;
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.92) 100%);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  transition: border-color 0.15s ease;
}

.bp-card:active {
  transform: scale(0.99);
}

.bp-card:hover {
  border-color: rgba(var(--ion-color-primary-rgb), 0.35);
}

.bp-card--variable {
  cursor: default;
  border-style: dashed;
}

.bp-card__media {
  flex-shrink: 0;
}

.bp-card__img {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  object-fit: cover;
  background: rgba(var(--ion-color-light-rgb), 0.06);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
}

.bp-card__img--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.1);
}

.bp-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bp-card__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.bp-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.bp-card__item {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  color: rgba(var(--ion-color-light-rgb), 0.7);
  background: rgba(var(--ion-color-light-rgb), 0.07);
}

.bp-card__item--variable {
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
}

.bp-card__attune {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  color: var(--ion-color-warning);
  background: rgba(var(--ion-color-warning-rgb), 0.12);
}

.bp-card__arrow, .bp-card__spinner {
  flex-shrink: 0;
  font-size: 18px;
  color: rgba(var(--ion-color-primary-rgb), 0.7);
}
</style>
