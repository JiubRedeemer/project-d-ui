<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import type {Item} from "@/components/models/response/InventoryResponse";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {marked} from "marked";

const props = defineProps<{
  item: Item | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{ (e: "close"): void }>();

function closeModal() {
  emit("close");
}

function getItemName(item: Item | null): string {
  if (!item?.name) return "—";
  const n = item.name as { rus?: string; eng?: string };
  return n?.rus ?? n?.eng ?? "—";
}

function getItemImageUrl(imgUrl: string | undefined) {
  return imgUrl
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
    : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
}

const renderMarkdown = (text: string | undefined): string => {
  return text ? marked(text) : "";
};
</script>

<template>
  <ion-modal :is-open="isOpen" @didDismiss="closeModal" :initial-breakpoint="1" :breakpoints="[0, 1]">
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Предмет</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="closeModal">Закрыть</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding" color="dark" v-if="item">
      <div class="item-modal">
        <h2>{{ getItemName(item) }}</h2>
        <img
          :src="getItemImageUrl(item.imgUrl)"
          alt=""
          class="item-image"
        />
        <div class="item-meta">
          <span>{{ item.typeName }}</span>
          <span v-if="item.subtypeName">— {{ item.subtypeName }}</span>
          <span v-if="item.rarity">({{ item.rarity }})</span>
        </div>
        <div class="item-stats" v-if="item.stats">
          <p v-if="item.stats.weight !== undefined"><strong>Вес:</strong> {{ item.stats.weight }}</p>
          <p v-if="item.stats.armorClass"><strong>Класс брони:</strong> {{ item.stats.armorClass }}</p>
          <p v-if="item.stats.damage?.value"><strong>Урон:</strong> {{ item.stats.damage.value }}</p>
          <p v-if="item.stats.requirement"><strong>Требования:</strong> {{ item.stats.requirement }}</p>
        </div>
        <div
          class="item-description"
          v-if="item.description"
          v-html="renderMarkdown(item.description)"
        />
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.item-modal {
  padding-bottom: 24px;
}

.item-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  margin: 12px 0;
}

.item-meta {
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--ion-color-medium);
}

.item-stats p,
.item-description {
  margin: 8px 0;
  font-size: 14px;
}
</style>
