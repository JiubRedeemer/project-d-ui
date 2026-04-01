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
    <div class="sectionHeader">Пассивные чувства</div>
    <div class="passive-feels">
      <div class="passive-feel">
        <div class="feel-name">Восприятие(Мудрость)</div>
        <div class="feel-value">{{ getPassiveByWis() }}</div>
      </div>
      <div class="passive-feel">
        <div class="feel-name">Проницательность(Мудрость)</div>
        <div class="feel-value">{{ getPassiveByWis() }}</div>
      </div>
      <div class="passive-feel">
        <div class="feel-name">Анализ(Интеллект)</div>
        <div class="feel-value">{{ getPassiveByInt() }}</div>
      </div>
    </div>
    <div class="sectionHeader">Владения вида</div>
    <div class="traits">
      <div class="race-trait section" v-for="(trait, index) in getRaceTraitsOrdered()" :key="index">
        <div class="trait-name">{{ trait.name }}</div>
        <div class="description">{{ trait.description }}</div>
      </div>
      <div class="sectionHeader">Владения предыстории</div>
      <div class="background-trait section" v-for="(trait, index) in getBackgroundTraitsOrdered()" :key="index">
        <div class="trait-name">{{ trait.name }}</div>
        <div class="description">{{ trait.description }}</div>
      </div>
      <div class="sectionHeader" v-if="getCharacterTraitsOrdered()">Пользовательские владения</div>
      <div class="character-trait section" v-for="(trait, index) in getCharacterTraitsOrdered()" :key="index">
        <div class="trait-header">
          <div class="trait-name">{{ trait.name }}</div>
          <ion-button
              size="small"
              shape="round"
              color="danger"
              fill="clear"
              @click.stop="deleteTrait(trait.id)"
          >
            <ion-icon :icon="trashOutline"></ion-icon>
          </ion-button>
        </div>
        <div class="description">{{ trait.description }}</div>
      </div>
    </div>
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

.passive-feels {
  border-radius: 20px;
  background-color: var(--ion-color-medium);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
}

.sectionHeader {
  color: var(--ion-color-light);
  font-size: 22px;
  font-weight: normal;
  margin-top: 10px;
  margin-bottom: 5px;
}

.section {
  background-color: var(--ion-color-medium);
  border-radius: 20px;
  padding: 10px;
  overflow: hidden;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.trait-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.trait-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
}

.passive-feel {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 27px;
  padding-left: 4px;
  padding-right: 4px;
  background: var(--ion-color-medium-tint);
  border-radius: 20px;
}

.feel-name {
  padding-left: 4px;
}

.feel-value {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 11px;
  color: var(--ion-color-primary-contrast);
  background: var(--ion-color-primary);
  border-radius: 50%;
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