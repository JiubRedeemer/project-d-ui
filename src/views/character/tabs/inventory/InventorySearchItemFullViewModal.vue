<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonModal,
  IonTitle,
  IonToggle,
  IonToolbar
} from "@ionic/vue";
import {computed, ref, watch} from "vue";
import type {Item, ItemSkill} from "@/components/models/response/InventoryResponse";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {HEADERS, TEXTS} from "@/config/localisations";
import {add, remove, searchOutline} from "ionicons/icons";
import {marked} from "marked";
import armorIcon from "@/static/icons/Armor.svg";
import EditItemSkillValueModal from "@/views/character/tabs/inventory/EditItemSkillValueModal.vue";
import axios from "axios";

const props = withDefaults(
  defineProps<{
    item: Item | null;
    isOpen: boolean;
    characterId: string;
    roomId: string;
  }>(),
  { item: null, isOpen: false, characterId: "", roomId: "" }
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "addToInventory", item: Item, count: number): void;
  (e: "deleteItem", itemId: string): void;
}>();

const fullViewCount = ref(1);
const showEditItemSkillModal = ref(false);
const editingItemSkill = ref<ItemSkill | undefined>();
const myUserId = ref<string | null>(null);

watch(
  () => [props.item, props.isOpen],
  () => {
    if (props.item) fullViewCount.value = props.item.count ?? 1;
  },
  { immediate: true }
);

watch(
  () => props.isOpen,
  async (open) => {
    if (!open || myUserId.value) return;
    try {
      const response = await axios.get(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}/users/myId`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      myUserId.value = response.data;
    } catch (e) {
      console.error("Не удалось получить идентификатор пользователя", e);
    }
  }
);

const isOwner = computed(() => {
  if (!props.item || !myUserId.value) return false;
  return props.item.creatorId === myUserId.value;
});

function closeModal() {
  emit("close");
}

function openViewItemSkillModal(skill: ItemSkill | undefined) {
  editingItemSkill.value = skill;
  showEditItemSkillModal.value = true;
}

function closeEditItemSkillModal() {
  showEditItemSkillModal.value = false;
}

function addFromFullView() {
  if (!props.item) return;
  emit("addToInventory", props.item, fullViewCount.value);
  closeModal();
}

async function deleteItem() {
  if (!props.item) return;
  try {
    await axios.delete(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${props.roomId}${GATEWAY_INTEGRATION_ROUTES.items}/${props.item.id}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    emit("deleteItem", props.item.id);
    closeModal();
  } catch (e) {
    console.error("Ошибка при удалении предмета", e);
  }
}

function isLetter(str: string) {
  const regExp = /[0-9]/;
  if (!regExp.test(str) && str.length >= 3) return str;
}

function getAbbreviation(str: string | undefined): string {
  if (!str) return "";
  if (isLetter(str)) return str.split(/\s+/).map((word) => word[0].toUpperCase()).join("");
  return "Bad name";
}

const renderMarkdown = (text: string | undefined): string | Promise<string> =>
  text ? marked(text) : "";

function getCoinType(coinType: string | undefined) {
  switch (coinType) {
    case "GOLDEN":
      return { rus: "зм.", eng: "gc.", emoji: "🪙" };
    case "SILVER":
      return { rus: "см.", eng: "sc.", emoji: "⚪" };
    case "COPPER":
      return { rus: "мм.", eng: "cc.", emoji: "🟠" };
    default:
      return { rus: "", eng: "", emoji: "" };
  }
}

const getItemImageUrl = (imgUrl: string | undefined) =>
  imgUrl != null
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
    : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";

const getSkillImageUrl = (imgUrl: string | undefined) =>
  imgUrl != null
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.skills_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
    : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
</script>

<template>
  <ion-modal :is-open="isOpen" @didDismiss="closeModal" class="full-view-modal">
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Предмет</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="closeModal">Закрыть</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding" color="dark" v-if="item">
      <div class="full-view-container">
        <div class="full-view-header">
          <div class="avatar">
            <img :src="getItemImageUrl(item.imgUrl)" class="avatar-img" alt="" />
          </div>
          <div class="stats">
            <div class="stat">
              {{ TEXTS.itemType.rus }}:
              <span class="stat-value">{{ getAbbreviation(item?.typeName) }}</span>
            </div>
            <div class="stat" v-if="item?.type && ['WEAPON', 'ARMOR'].includes(item.type)">
              {{ item.type === "ARMOR" ? TEXTS.armorType.rus : TEXTS.weaponType.rus }}:
              <span class="stat-value">{{ getAbbreviation(item?.subtypeName) }}</span>
            </div>
            <div class="stat" v-if="item?.stats?.weight">
              {{ TEXTS.weight.rus }}:
              <span class="stat-value">{{ item.stats.weight }}</span>
            </div>
          </div>
        </div>
        <div class="item-body">
          <div class="item-name">{{ item?.name?.rus }}</div>
          <div class="item-main-stat">
            <div class="armory-class" v-if="item?.type === 'ARMOR'">
              <ion-icon class="armory-class-icon" slot="icon-only" :src="armorIcon"></ion-icon>
              <div class="armory-class-value">{{ item.stats?.armorClass }}</div>
            </div>
            <div class="damage" v-if="item?.type === 'WEAPON'">
              {{ item.stats?.damage?.value }} ({{ item.stats?.damage?.damageTypeName }})
            </div>
          </div>
          <div
            class="simple-stat"
            v-if="item?.type === 'ARMOR' && (item.stats?.armorClassMaxDexterityBonus ?? 0) > 0"
          >
            <div class="simple-stat-text">{{ HEADERS.max_dex_bonus.rus }}:</div>
            <div class="simple-stat-value">{{ item.stats?.armorClassMaxDexterityBonus }}</div>
          </div>
          <div class="simple-stat" v-if="item?.type === 'ARMOR'">
            <div class="simple-stat-text">{{ HEADERS.force_requirements.rus }}:</div>
            <div class="simple-stat-value">{{ item.stats?.requirement }}</div>
          </div>
          <div class="simple-stat">
            <div class="simple-stat-text">{{ HEADERS.need_customization.rus }}:</div>
            <div class="simple-stat-value">
              <ion-toggle :checked="item?.customization" :disabled="true"></ion-toggle>
            </div>
          </div>
          <div class="simple-stat" v-if="item?.stats?.defaultPrice?.length">
            <div class="simple-stat-text">{{ HEADERS.default_price.rus }}:</div>
            <div class="simple-stat-value">
              {{ item.stats.defaultPrice![0].value }}
              {{ getCoinType(item.stats.defaultPrice![0].coinType).emoji }}
            </div>
          </div>
          <div class="tags" v-if="item?.stats?.tags?.length">
            <div class="tag" v-for="(tag, idx) in item.stats.tags" :key="idx">
              <ion-chip><ion-label>{{ tag }}</ion-label></ion-chip>
            </div>
          </div>
          <div class="section-description" v-if="item?.description">
            <p v-html="renderMarkdown(item.description)"></p>
          </div>
        </div>
        <div class="item-skills" v-if="item?.skills?.length">
          <div class="section skill-section" v-for="skill in item.skills" :key="skill.id">
            <div class="section-start-block">
              <div class="image-block">
                <img
                  v-if="skill.imgUrl"
                  width="55"
                  height="55"
                  class="skill-image"
                  :src="getSkillImageUrl(skill.imgUrl)"
                  :alt="skill.name?.rus"
                />
                <img
                  v-else
                  width="55"
                  height="55"
                  class="skill-image"
                  src="https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png"
                  :alt="skill.name?.rus"
                />
              </div>
              <div class="stats-block">
                <div class="skill-stats-block">
                  <div class="skill-name">{{ skill.name?.rus }}</div>
                  <div class="skill-short-description">{{ skill.shortDescription }}</div>
                  <div class="skill-limitations">
                    Зарядов: {{ skill.charges }}
                    ({{
                      skill.chargesRefill === "SHORT_REST" ? "короткий отдых" : "долгий отдых"
                    }})
                  </div>
                </div>
              </div>
            </div>
            <ion-buttons class="skill-buttons-block">
              <ion-button size="small" shape="round" @click="openViewItemSkillModal(skill)">
                <ion-icon slot="icon-only" :icon="searchOutline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </div>
        </div>
        <div class="buttons full-view-buttons">
          <div class="full-view-count-row">
            <ion-button size="small" @click="fullViewCount = Math.max(1, fullViewCount - 1)">
              <ion-icon slot="icon-only" size="small" :icon="remove"></ion-icon>
            </ion-button>
            <ion-label>{{ fullViewCount }}</ion-label>
            <ion-button size="small" @click="fullViewCount = fullViewCount + 1">
              <ion-icon slot="icon-only" size="small" :icon="add"></ion-icon>
            </ion-button>
          </div>
          <ion-button
            v-if="isOwner"
            expand="block"
            shape="round"
            color="danger"
            fill="outline"
            @click="deleteItem"
          >
            Удалить предмет
          </ion-button>
          <ion-button expand="block" shape="round" color="primary" @click="addFromFullView">
            Добавить в инвентарь
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-modal>

  <EditItemSkillValueModal
    :isOpen="showEditItemSkillModal"
    :character-id="characterId"
    :is-editing="false"
    :item-skill="editingItemSkill"
    @closeEditItemSkillModal="closeEditItemSkillModal"
    :is-read-only="true"
    :isCharacterSkill="false"
  />
</template>

<style scoped>
.full-view-modal {
  --width: 100%;
  --max-width: 500px;
  --height: 100%;
  --border-radius: 0;
}

.full-view-container {
  background-color: var(--ion-color-dark, #222428);
  padding-bottom: 20px;
}

.full-view-header {
  margin-top: 10px;
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.avatar-img {
  width: 180px;
  height: 180px;
  border-radius: 25px;
  object-fit: cover;
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

.item-body {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
}

.item-body .item-name {
  font-size: 22px;
}

.item-main-stat {
  display: flex;
  align-items: center;
  justify-content: center;
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
  flex-wrap: wrap;
  justify-content: start;
  gap: 6px;
}

.section-description {
  background-color: var(--ion-color-medium);
  border-radius: 15px;
  padding: 10px;
  overflow: hidden;
  width: 100%;
}

.section-description p {
  margin: 0;
}

.item-skills {
  margin-top: 10px;
  width: 100%;
}

.section.skill-section {
  max-height: none;
  margin-top: 10px;
  min-height: 75px;
  background-color: var(--ion-color-medium);
  border-radius: 25px;
  padding: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
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
  scrollbar-width: none;
  font-size: 16px;
  font-weight: bold;
}

.skill-short-description,
.skill-limitations {
  scrollbar-width: none;
  font-size: 12px;
}

.skill-buttons-block {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-shrink: 0;
}

.full-view-buttons {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.full-view-count-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}
</style>
