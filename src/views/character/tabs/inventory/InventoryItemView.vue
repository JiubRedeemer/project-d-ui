<script setup lang="ts">

import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {HEADERS, TEXTS} from "@/config/localisations";
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonToggle,
  IonToolbar,
  useIonRouter
} from "@ionic/vue";
import {useInventoryItemStore} from "@/stores/InventoryItemStore";
import armorIcon from "@/static/icons/Armor.svg";
import {marked} from "marked";
import axios from "axios";
import {useRoute} from "vue-router";
import {useInventoryStore} from "@/stores/InventoryStore";
import {onMounted, ref} from "vue";
import {useCreateInventoryItemStore} from "@/stores/CreateInventoryItemStore";
import {searchOutline} from "ionicons/icons";
import type {ItemSkill} from "@/components/models/response/InventoryResponse";
import EditItemSkillValueModal from "@/views/character/tabs/inventory/EditItemSkillValueModal.vue";

const route = useRoute();
const ionRouter = useIonRouter();
const inventoryItemStore = useInventoryItemStore();
const inventoryStore = useInventoryStore();
const createInventoryItemStore = useCreateInventoryItemStore();

const showEditItemSkillModal = ref(false);
const isEditingItemSkill = ref(false);
const editingItemSkill = ref<ItemSkill>();


const closeEditItemSkillModal = () => {
  showEditItemSkillModal.value = false; // Закрываем модалку
};

function openViewItemSkillModal(isEditing: boolean, itemSkill: ItemSkill | undefined) {
  isEditingItemSkill.value = isEditing;
  if (!isEditing) {
    editingItemSkill.value = itemSkill;
  }
  showEditItemSkillModal.value = true;
};

onMounted(async () => {
  if (!inventoryItemStore.inventoryItem.itemId) {
    inventoryItemStore.updateInventoryItemInStoreById(route.params.roomId, route.params.characterId, route.params.itemId);
  }
});

function isLetter(str: string) {
  const regExp = /[0-9]/
  if (!regExp.test(str) && str.length >= 3) {
    return str
  }
}


function getAbbreviation(str: string | undefined): string {
  if (!str) {
    return "";
  }
  if (isLetter(str)) {
    return str.split(/\s+/).map(word => word[0].toUpperCase()).join('')
  } else {
    return 'Bad name'
  }
}

const renderMarkdown = (text: string | undefined): string | Promise<string> => {
  return text ? marked(text) : "";
};

function getCoinType(coinType: string | undefined) {
  switch (coinType) {
    case 'GOLDEN':
      return {rus: 'зм.', eng: 'gc.', emoji: '🪙'};
    case 'SILVER':
      return {rus: 'см.', eng: 'sc.', emoji: '⚪'};
    case 'COPPER':
      return {rus: 'мм.', eng: 'cc.', emoji: '🟠'};
    default:
      return {rus: '', eng: '', emoji: ''};
  }
}

const getItemImageUrl = (imgUrl: string | undefined) => {
  return imgUrl != null
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png';
};

async function deleteItemFromInventory() {
  try {
    const response = await axios.delete(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}/${inventoryItemStore.inventoryItem.id.trim()}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
    inventoryStore.inventory = response.data;
    ionRouter.back();
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
}

async function editItem() {
  createInventoryItemStore.item = inventoryItemStore.inventoryItem.item;
  createInventoryItemStore.item.roomId = route.params.roomId;
  ionRouter.navigate('/rooms/' + route.params.roomId + '/characters/' + route.params.characterId + '/inventory/add', 'forward', 'push')
  console.log("Edit Item")
  console.log(createInventoryItemStore.item)
}

const getSkillImageUrl = (imgUrl: string | undefined) => {
  return imgUrl != null
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.skills_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png';
};

</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button/>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding" color="dark">
      <div class="container">
        <div class="header">
          <div class="avatar">
            <img :src="getItemImageUrl(inventoryItemStore.inventoryItem.item?.imgUrl)"
                 class="avatar-img"
                 alt="avatar"/>
          </div>
          <div class="stats">
            <div class="stat">
              {{ TEXTS.itemType.rus }} :
              <span
                  class="stat-value"
              >{{ getAbbreviation(inventoryItemStore.inventoryItem?.item?.typeName) }}</span>
            </div>
            <div class="stat"
                 v-if="inventoryItemStore.inventoryItem?.item?.type && ['WEAPON', 'ARMOR'].includes(inventoryItemStore.inventoryItem?.item?.type)">
              {{ inventoryItemStore.inventoryItem.item.type == 'ARMOR' ? TEXTS.armorType.rus : TEXTS.weaponType.rus }} :
              <span
                  class="stat-value"
              >{{ getAbbreviation(inventoryItemStore.inventoryItem?.item.subtypeName) }}</span>
            </div>
            <div class="stat" v-if="inventoryItemStore?.inventoryItem.item?.stats?.weight">
              {{ TEXTS.weight.rus }} :
              <span
                  class="stat-value"
              >{{ inventoryItemStore.inventoryItem?.item?.stats.weight }}</span>
            </div>
          </div>
        </div>
        <div class="item-body">
          <div class="item-name">{{ inventoryItemStore.inventoryItem?.item?.name.rus }}</div>
          <div class="item-main-stat">
            <div class="armory-class" v-if="inventoryItemStore.inventoryItem?.item?.type == 'ARMOR'">
              <div class="armory-class">
                <ion-icon class="armory-class-icon" slot="icon-only" :src="armorIcon"></ion-icon>
                <div class="armory-class-value">
                  {{ inventoryItemStore.inventoryItem.item.stats.armorClass }}
                </div>
              </div>
            </div>
            <div class="damage" v-if="inventoryItemStore.inventoryItem.item?.type == 'WEAPON'">
              {{ inventoryItemStore.inventoryItem.item.stats.damage?.value }}
              ({{ inventoryItemStore.inventoryItem.item.stats.damage?.damageTypeName }})
            </div>
          </div>
          <div class="simple-stat"
               v-if="inventoryItemStore.inventoryItem.item?.type == 'ARMOR' && inventoryItemStore.inventoryItem.item.stats.armorClassMaxDexterityBonus > 0">
            <div class="simple-stat-text">{{ HEADERS.max_dex_bonus.rus }}:</div>
            <div class="simple-stat-value">
              {{ inventoryItemStore.inventoryItem.item.stats.armorClassMaxDexterityBonus }}
            </div>
          </div>
          <div class="simple-stat" v-if="inventoryItemStore.inventoryItem.item?.type == 'ARMOR'">
            <div class="simple-stat-text">{{ HEADERS.force_requirements.rus }}:</div>
            <div class="simple-stat-value">
              {{ inventoryItemStore.inventoryItem.item.stats.requirement }}
            </div>
          </div>
          <div class="simple-stat">
            <div class="simple-stat-text">{{ HEADERS.need_customization.rus }}:</div>
            <div class="simple-stat-value">
              <ion-toggle :checked="inventoryItemStore.inventoryItem.item?.customization" :disabled="true"></ion-toggle>
            </div>
          </div>
          <div class="simple-stat">
            <div class="simple-stat-text">{{ HEADERS.default_price.rus }}:</div>
            <div class="simple-stat-value">
              {{ inventoryItemStore.inventoryItem.item?.stats.defaultPrice[0].value }}
              {{ getCoinType(inventoryItemStore.inventoryItem.item?.stats.defaultPrice[0].coinType).emoji }}
            </div>
          </div>
          <div class="tags">
            <div class="tag" :key="idx" v-for="(tag, idx) in inventoryItemStore.inventoryItem.item?.stats.tags">
              <ion-chip>
                <ion-label>{{ tag }}</ion-label>
              </ion-chip>
            </div>
          </div>
          <div class="section-description" v-if="inventoryItemStore?.inventoryItem?.item?.description">
            <p v-html="renderMarkdown(inventoryItemStore.inventoryItem.item?.description)">
            </p>
          </div>
        </div>
        <div class="item-skills">
          <div class="section" v-for="item in inventoryItemStore?.inventoryItem?.item?.skills" :key="item.id">
            <div class="section-start-block" @click="">
              <div class="image-block">
                <img v-if="item.imgUrl" width="55px" height="55px" class="skill-image"
                     :src="getSkillImageUrl(item.imgUrl)"
                     :alt="item.name.rus"/>
                <img v-else width="55px" height="55px" class="skill-image"
                     :src="'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                     :alt="item.name.rus"/>
              </div>
              <div class="stats-block">
                <div class="skill-stats-block">
                  <div class="skill-name">
                    {{ item.name.rus }}
                  </div>
                  <div class="skill-short-description">
                    {{ item.shortDescription }}
                  </div>
                  <div class="skill-limitations">
                    Зарядов: {{ item.charges }} ({{
                      item.chargesRefill === "SHORT_REST"
                          ? "короткий отдых"
                          : "долгий отдых"
                    }})
                  </div>
                </div>
              </div>
            </div>
            <ion-buttons class="skill-buttons-block">
              <ion-buttons>
                <ion-button size="small" shape="round" @click="openViewItemSkillModal(false, item)">
                  <ion-icon slot="icon-only" :icon="searchOutline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-buttons>
          </div>
        </div>

        <div class="buttons">
          <ion-button expand="block" shape="round" color="secondary" fill="outline" @click="editItem">
            {{ HEADERS.edit.rus }}
          </ion-button>
          <ion-button expand="block" shape="round" color="danger" fill="outline" @click="deleteItemFromInventory">
            {{ HEADERS.delete_from_inventory.rus }}
          </ion-button>
        </div>
      </div>
    </ion-content>
    <EditItemSkillValueModal :isOpen="showEditItemSkillModal"
                             :character-id="String(route.params.characterId)"
                             :is-editing="isEditingItemSkill"
                             :item-skill="editingItemSkill"
                             @closeEditItemSkillModal="closeEditItemSkillModal"
                             :is-read-only="true"
                             :isCharacterSkill="false"/>
  </ion-page>
</template>

<style scoped>
.container {
  background-color: var(--ion-color-dark, #222428) !important;;
}

.header {
  margin-top: 10px;
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.item-body {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
}

.skill-name {
  font-size: 24px;
}

.avatar-img {
  width: 180px;
  height: 180px;
  border-radius: 25px;
  align-content: center;
  justify-content: center;
  display: flex;
}

.stats {
  border-radius: 25px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  background-color: var(--ion-color-medium);
  width: 180px;
  height: 180px;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--ion-color-secondary-opacity-40);
  margin-bottom: 3%;
  height: 23%;
  border-radius: 15px;
  padding-left: 5%;
  padding-right: 5%;
  margin-right: 5%;
  margin-left: 5%;
  font-weight: bold;
  font-size: 10pt;
}

.stat-value {
  display: flex;
  background-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border-radius: 50%;
  height: 30px;
  width: 30px;
  align-items: center;
  justify-content: center;
  font-size: 10pt;
}

.placeholder-icon {
  align-self: center;
  justify-self: center;
  font-size: 48px;
  color: white;
}

.armory-class {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 40px;
}

.armory-class-icon {
  width: 100%;
  height: 100%;
  fill: var(--ion-color-light);
}

.armory-class-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
  pointer-events: none;
}

.simple-stat {
  font-size: 18px;
  padding-left: 10px;
  padding-right: 10px;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.tags {
  padding: 10px;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: start;
}

.section-description {
  background-color: var(--ion-color-medium);
  border-radius: 15px;
  padding: 10px;
  overflow: hidden;
  transition: max-height 4s ease;
  width: 100%;
}

.buttons {
  margin-top: 10px;
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-direction: column;
}

.section {
  margin-top: 10px;
  background-color: var(--ion-color-medium);
  border-radius: 25px;
  padding: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  min-height: 75px;
}

.section-start-block {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.image-block {
  flex-shrink: 0;
}

.skill-image {
  border-radius: 15px;
  border: 2px solid transparent;
  width: 55px;
  height: 55px;
  object-fit: cover;
}

.stats-block {
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  min-width: 0;
  flex: 1;
}

.skill-stats-block {
  min-width: 0;
}

.skill-name {
  font-size: 16px;
  font-weight: bold;
  white-space: nowrap;
  overflow: scroll;
}

.skill-short-description,
.skill-limitations {
  font-size: 12px;
  white-space: nowrap;
  overflow: scroll;
}

.skill-buttons-block {
  display: flex;
  justify-content: end;
  align-items: center;
  flex-shrink: 0;
  gap: 5px;
}

.add-skill-button {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

</style>
