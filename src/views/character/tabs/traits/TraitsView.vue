<script setup lang="ts">
import {useCharacterStore} from "@/stores/CharacterStore";
import {addOutline, trashOutline} from "ionicons/icons";
import {IonButton, IonIcon, toastController} from "@ionic/vue";
import {ref} from "vue";
import CreateTraitModal from "./CreateTraitModal.vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";

const characterStore = useCharacterStore();
const showCreateTraitModal = ref(false);
const route = useRoute();

function openCreateTraitModal() {
  showCreateTraitModal.value = true;
}

function closeCreateTraitModal() {
  showCreateTraitModal.value = false;
}

function getPassiveByWis() {
  const wis = Math.floor((characterStore.character.abilities.filter(ability => ability.code === "WIS")[0].value + characterStore.character.abilities.filter(ability => ability.code === "WIS")[0].bonusValue - 10) / 2);
  return 10 + wis;
}

function getPassiveByInt() {
  const int = Math.floor((characterStore.character.abilities.filter(ability => ability.code === "INT")[0].value + characterStore.character.abilities.filter(ability => ability.code === "INT")[0].bonusValue - 10) / 2);
  return 10 + int;
}

function getRaceTraitsOrdered() {
  return characterStore.character.raceInfo?.traits?.sort((a, b) => {
    if (a.description?.length && b.description?.length)
      return a.description.length - b.description.length;
    else if (a.description?.length && !b.description?.length) return 1;
    else if (!a.description?.length && b.description?.length) return -1;
    else return 0;
  });
}

function getBackgroundTraitsOrdered() {
  return characterStore.character.backgroundInfo?.stats?.traits?.sort((a, b) => {
    if (a.description?.length && b.description?.length)
      return a.description.length - b.description.length;
    else if (a.description?.length && !b.description?.length) return 1;
    else if (!a.description?.length && b.description?.length) return -1;
    else return 0;
  });
}

function getCharacterTraitsOrdered() {
  return characterStore.character?.traits?.sort((a, b) => {
    if (a.description?.length && b.description?.length)
      return a.description.length - b.description.length;
    else if (a.description?.length && !b.description?.length) return 1;
    else if (!a.description?.length && b.description?.length) return -1;
    else return 0;
  });
}

async function deleteTrait(traitId: string) {
  const roomId = String(route.params.roomId);
  const characterId = String(route.params.characterId);

  try {
    await axios.delete(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterId}/traits/${encodeURIComponent(traitId)}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );

    await characterStore.updateCharacterInStoreById(roomId, characterId);

    const toast = await toastController.create({
      message: "Владение удалено",
      duration: 1500,
      position: "top",
      color: "success",
    });
    await toast.present();
  } catch (error) {
    console.error("Ошибка при удалении владения:", error);
    const toast = await toastController.create({
      message: "Ошибка при удалении владения",
      duration: 2000,
      position: "top",
      color: "danger",
    });
    await toast.present();
  }
}
</script>

<template>
  <div class="traits-body">
    <h3 class="section-heading section-heading--passive">Пассивные чувства</h3>
    <div class="passive-grid">
      <div class="passive-tile">
        <span class="passive-tile__value">{{ getPassiveByWis() }}</span>
        <span class="passive-tile__name">Восприятие<span class="passive-tile__src">Мудрость</span></span>
      </div>
      <div class="passive-tile">
        <span class="passive-tile__value">{{ getPassiveByWis() }}</span>
        <span class="passive-tile__name">Проницательность<span class="passive-tile__src">Мудрость</span></span>
      </div>
      <div class="passive-tile">
        <span class="passive-tile__value">{{ getPassiveByInt() }}</span>
        <span class="passive-tile__name">Анализ<span class="passive-tile__src">Интеллект</span></span>
      </div>
    </div>

    <template v-if="getRaceTraitsOrdered()?.length">
      <h3 class="section-heading section-heading--race">Владения вида</h3>
      <div class="traits-list">
        <div class="trait-card trait-card--race" v-for="(trait, index) in getRaceTraitsOrdered()" :key="index">
          <div class="trait-card__name">{{ trait.name }}</div>
          <div class="trait-card__desc" v-if="trait.description">{{ trait.description }}</div>
        </div>
      </div>
    </template>

    <template v-if="getBackgroundTraitsOrdered()?.length">
      <h3 class="section-heading section-heading--bg">Владения предыстории</h3>
      <div class="traits-list">
        <div class="trait-card trait-card--bg" v-for="(trait, index) in getBackgroundTraitsOrdered()" :key="index">
          <div class="trait-card__name">{{ trait.name }}</div>
          <div class="trait-card__desc" v-if="trait.description">{{ trait.description }}</div>
        </div>
      </div>
    </template>

    <template v-if="getCharacterTraitsOrdered()?.length">
      <h3 class="section-heading section-heading--custom">Пользовательские владения</h3>
      <div class="traits-list">
        <div class="trait-card trait-card--custom" v-for="(trait, index) in getCharacterTraitsOrdered()" :key="index">
          <div class="trait-card__header">
            <div class="trait-card__name">{{ trait.name }}</div>
            <ion-button
                class="trait-card__delete"
                size="small"
                shape="round"
                color="danger"
                fill="clear"
                @click.stop="deleteTrait(trait.id)"
            >
              <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
            </ion-button>
          </div>
          <div class="trait-card__desc" v-if="trait.description">{{ trait.description }}</div>
        </div>
      </div>
    </template>

    <div class="security-block" style="height: 50px;"></div>
  </div>
  <div class="add-new-button">
    <ion-button size="large" shape="round" color="secondary" @click="openCreateTraitModal">
      <ion-icon slot="icon-only" :icon="addOutline"/>
    </ion-button>
  </div>
  <CreateTraitModal :is-open="showCreateTraitModal" @close="closeCreateTraitModal"/>
</template>

<style scoped>
.traits-body {
  width: 100%;
}

/* Section headings */
.section-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 20px 0 12px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.72);
}

.section-heading:first-child {
  margin-top: 0;
}

.section-heading::before {
  content: "";
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: var(--accent, var(--ion-color-primary));
}

.section-heading--passive,
.section-heading--race {
  --accent: var(--ion-color-primary);
}

.section-heading--bg {
  --accent: var(--ion-color-tertiary);
}

.section-heading--custom {
  --accent: var(--ion-color-secondary-tint);
}

/* Passive senses */
.passive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.passive-tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.92) 100%);
}

.passive-tile__value {
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
  color: var(--ion-color-primary);
  font-variant-numeric: tabular-nums;
}

.passive-tile__name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(var(--ion-color-light-rgb), 0.82);
}

.passive-tile__src {
  font-size: 11px;
  font-weight: 500;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

/* Trait cards */
.traits-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

@media (min-width: 1100px) {
  .traits-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

.trait-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  border-left: 3px solid var(--accent, var(--ion-color-primary));
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.92) 100%);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.trait-card:hover {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
}

.trait-card--race {
  --accent: var(--ion-color-primary);
}

.trait-card--bg {
  --accent: var(--ion-color-tertiary);
}

.trait-card--custom {
  --accent: var(--ion-color-secondary-tint);
}

.trait-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.trait-card__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-light);
  margin-bottom: 6px;
}

.trait-card__header .trait-card__name {
  margin-bottom: 0;
  padding-top: 4px;
}

.trait-card__delete {
  flex-shrink: 0;
  margin: 0;
  --padding-start: 6px;
  --padding-end: 6px;
}

.trait-card__desc {
  font-size: 13.5px;
  line-height: 1.55;
  color: rgba(var(--ion-color-light-rgb), 0.74);
  white-space: pre-wrap;
}

.trait-card__header + .trait-card__desc {
  margin-top: 6px;
}

.add-new-button {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
  padding-bottom: max(8px, env(safe-area-inset-bottom, 0));
}
</style>