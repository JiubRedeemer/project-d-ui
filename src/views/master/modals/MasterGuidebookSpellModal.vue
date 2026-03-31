<script setup lang="ts">
import {IonButton, IonButtons, IonContent, IonHeader, IonModal, IonTitle, IonToolbar} from "@ionic/vue";
import type {SpellDto} from "@/components/models/response/MagicApi";
import {FILE_STORAGE_INTEGRATION_ROUTES, SPELL_IMAGE_PLACEHOLDER} from "@/config/integrationRoutes";

const props = defineProps<{
  spell: SpellDto | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{ (e: "close"): void }>();

function closeModal() {
  emit("close");
}

function getSpellName(s: SpellDto | undefined): string {
  if (!s?.name) return "—";
  const n = s.name as Record<string, string>;
  return n.rus ?? n.en ?? "—";
}

function getSpellImageUrl(imgUrl: string | undefined) {
  if (!imgUrl) return SPELL_IMAGE_PLACEHOLDER;
  if (imgUrl.startsWith("http")) return imgUrl;
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.spell_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
}
</script>

<template>
  <ion-modal :is-open="isOpen" @didDismiss="closeModal" :initial-breakpoint="1" :breakpoints="[0, 1]">
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Заклинание</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="closeModal">Закрыть</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding" color="dark" v-if="spell">
      <div class="spell-modal">
        <h2>{{ getSpellName(spell) }}</h2>
        <img
          :src="getSpellImageUrl(spell.imgUrl)"
          alt=""
          class="spell-image"
        />
        <div class="spell-meta">
          <span v-if="spell.level !== undefined && spell.level !== null">
            {{ spell.level === "0" ? "Фокус" : spell.level + " уровень" }}
          </span>
          <span v-if="spell.school">{{ spell.school }}</span>
          <span v-if="spell.damageType">{{ spell.damageType }}</span>
        </div>
        <div class="spell-details" v-if="spell.useTime || spell.distance || spell.duration">
          <p v-if="spell.useTime"><strong>Время каста:</strong> {{ spell.useTime }}</p>
          <p v-if="spell.distance"><strong>Дистанция:</strong> {{ spell.distance }}</p>
          <p v-if="spell.duration"><strong>Длительность:</strong> {{ spell.duration }}</p>
          <p v-if="spell.components"><strong>Компоненты:</strong> {{ spell.components }}</p>
        </div>
        <div class="spell-description" v-if="spell.description" v-html="spell.description" />
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.spell-modal {
  padding-bottom: 24px;
}

.spell-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  margin: 12px 0;
}

.spell-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.spell-meta span {
  font-size: 14px;
  color: var(--ion-color-medium);
}

.spell-details p,
.spell-description {
  margin: 8px 0;
  font-size: 14px;
}
</style>
