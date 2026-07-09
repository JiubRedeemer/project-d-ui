<script setup lang="ts">

import {computed, ref, watch} from "vue";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {HEADERS, TEXTS} from "@/config/localisations";
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonToggle,
  IonToolbar,
  onIonViewDidEnter,
  useIonRouter,
} from "@ionic/vue";
import {useInventoryItemStore} from "@/stores/InventoryItemStore";
import {marked} from "marked";
import axios from "axios";
import {useRoute, useRouter} from "vue-router";
import {useInventoryStore} from "@/stores/InventoryStore";
import {useCharacterStore} from "@/stores/CharacterStore";
import {useCreateInventoryItemStore} from "@/stores/CreateInventoryItemStore";
import {bookOutline, chevronForwardOutline, createOutline, eyeOutline, trashOutline} from "ionicons/icons";
import type {ItemSkill} from "@/components/models/response/InventoryResponse";
import {getTagsForRoom, type ItemTagDto} from "@/api/itemTagApi";
import EditItemSkillValueModal from "@/views/character/tabs/inventory/EditItemSkillValueModal.vue";
import {extractDominantColorFromUrl} from "@/utils/imageAmbient";
import goldenCoinIcon from "@/static/icons/GoldenCoin.svg";
import silverCoinIcon from "@/static/icons/SilverCoin.svg";
import copperCoinIcon from "@/static/icons/CopperCoin.svg";
import electrumCoinIcon from "@/static/icons/ElectrumCoin.svg";
import platinumCoinIcon from "@/static/icons/PlatinumCoin.svg";

const route = useRoute();
const ionRouter = useIonRouter();
const router = useRouter();
const inventoryItemStore = useInventoryItemStore();
const inventoryStore = useInventoryStore();
const createInventoryItemStore = useCreateInventoryItemStore();
const characterStore = useCharacterStore();

const availableTags = ref<ItemTagDto[]>([]);
const myUserId = ref<string | null>(null);
const userRoles = ref<string[]>([]);
const identifyLoading = ref(false);
const shownTagInfo = ref<string | null>(null);
function toggleTagInfo(tag: string) {
  shownTagInfo.value = shownTagInfo.value === tag ? null : tag;
}

const isMyItem = computed(() => Boolean(item.value?.creatorId && item.value.creatorId === myUserId.value));
const isCatalogItem = computed(() => !item.value?.creatorId);
const isMaster = computed(() => userRoles.value.includes("MASTER"));
const isUnidentified = computed(() => inventoryItem.value?.identified === false);

const showEditItemSkillModal = ref(false);
const isEditingItemSkill = ref(false);
const editingItemSkill = ref<ItemSkill>();
const ambientColor = ref<string | null>(null);

const SKILL_IMAGE_PLACEHOLDER =
    "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";

const hasSkillImage = (imgUrl: string | undefined | null) => Boolean(imgUrl?.trim());

const getItemImageUrl = (imgUrl: string | undefined) =>
    imgUrl != null && imgUrl.trim()
        ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
        : SKILL_IMAGE_PLACEHOLDER;

const getSkillImageUrl = (imgUrl: string | undefined) =>
    hasSkillImage(imgUrl)
        ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.skills_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
        : SKILL_IMAGE_PLACEHOLDER;

const inventoryItem = computed(() => inventoryItemStore.inventoryItem);
const item = computed(() => inventoryItem.value?.item);
const itemImageUrl = computed(() => getItemImageUrl(item.value?.imgUrl));

const isArmor = computed(() => item.value?.type === "ARMOR");
const isWeapon = computed(() => item.value?.type === "WEAPON");

const hasArmorStatRequirement = computed(() => {
  const requirement = item.value?.stats?.requirement?.trim();
  if (!requirement || requirement === "-1") return false;

  const numericRequirement = Number(requirement);
  return !Number.isNaN(numericRequirement) && numericRequirement > 0;
});

const showRequirementsWarning = computed(() => {
  if (!isArmor.value || !hasArmorStatRequirement.value) return false;
  const requirement = Number(item.value?.stats?.requirement?.trim());
  if (Number.isNaN(requirement) || requirement <= 0) return false;
  const strAbility = characterStore.character?.abilities?.find((a: { code: string }) => a.code === "STR");
  if (strAbility != null) return strAbility.value < requirement;
  return !inventoryItem.value.requirementsOk;
});

const inventorySkillsByItemSkillId = computed(() => {
  const map = new Map<string, number>();
  for (const entry of inventoryItem.value?.skills ?? []) {
    map.set(entry.itemSkillId, entry.currentCharges);
  }
  return map;
});

watch(itemImageUrl, (src) => {
  if (!src) {
    ambientColor.value = null;
    return;
  }

  void extractDominantColorFromUrl(src).then((color) => {
    if (src === itemImageUrl.value) {
      ambientColor.value = color;
    }
  });
}, {immediate: true});

const closeEditItemSkillModal = () => {
  showEditItemSkillModal.value = false;
};

function openViewItemSkillModal(isEditing: boolean, itemSkill: ItemSkill | undefined) {
  isEditingItemSkill.value = isEditing;
  if (!isEditing) {
    editingItemSkill.value = itemSkill;
  }
  showEditItemSkillModal.value = true;
}

onIonViewDidEnter(async () => {
  if (availableTags.value.length === 0) {
    getTagsForRoom(String(route.params.roomId)).then(tags => { availableTags.value = tags; }).catch(() => {});
  }
  if (!inventoryItemStore.inventoryItem.itemId) {
    inventoryItemStore.updateInventoryItemInStoreById(route.params.roomId, route.params.characterId, route.params.itemId);
  }
  if (!myUserId.value) {
    axios.get(`${GATEWAY_INTEGRATION_ROUTES.baseURL}/users/myId`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
    }).then(r => { myUserId.value = r.data; }).catch(() => {});
  }
  if (userRoles.value.length === 0) {
    axios.get(`${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}/roles`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
    }).then(r => { userRoles.value = r.data; }).catch(() => {});
  }
});

function getTypeAbbreviation(typeName: string | undefined): string {
  if (!typeName?.trim()) return "—";
  const name = typeName.trim();
  if (name === HEADERS.other.rus || name === "Другое" || name === "Прочее") return "П";
  if (name === HEADERS.armor.rus || name === "Доспех") return "Д";
  if (name === HEADERS.weapon.rus || name === "Оружие") return "О";
  if (name === HEADERS.magic_items.rus || name === "Магический предмет") return "М";
  return name.charAt(0).toUpperCase();
}

function getSubtypeAbbreviation(subtypeName: string | undefined): string {
  if (!subtypeName?.trim()) return "—";
  return subtypeName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
}

function getCoinType(coinType: string | undefined) {
  switch (coinType) {
    case "GOLDEN":
      return {rus: "зм.", eng: "gc.", icon: goldenCoinIcon};
    case "SILVER":
      return {rus: "см.", eng: "sc.", icon: silverCoinIcon};
    case "COPPER":
      return {rus: "мм.", eng: "cc.", icon: copperCoinIcon};
    case "ELECTRUM":
      return {rus: "эм.", eng: "ep.", icon: electrumCoinIcon};
    case "PLATINUM":
      return {rus: "пм.", eng: "pp.", icon: platinumCoinIcon};
    default:
      return {rus: "", eng: "", icon: ""};
  }
}

const headerStats = computed(() => {
  const stats: Array<{ key: string; label: string; value: string; wide?: boolean; coinIcon?: string }> = [];
  const currentItem = item.value;
  if (!currentItem) return stats;

  if (currentItem.typeName) {
    stats.push({
      key: "type",
      label: "Тип",
      value: getTypeAbbreviation(currentItem.typeName),
    });
  }

  if (currentItem.subtypeName && ["ARMOR", "WEAPON"].includes(currentItem.type ?? "")) {
    stats.push({
      key: "subtype",
      label: "Подтип",
      value: getSubtypeAbbreviation(currentItem.subtypeName),
      wide: true,
    });
  }

  if (currentItem.stats?.defaultPrice?.length) {
    const price = currentItem.stats.defaultPrice[0];
    stats.push({
      key: "price",
      label: "Цена",
      value: String(price.value),
      coinIcon: getCoinType(price.coinType).icon,
      wide: true,
    });
  }

  return stats;
});

const renderMarkdown = (text: string | undefined): string => {
  if (!text) return "";
  return marked.parse(text.replace(/\r\n/g, "\n"), {gfm: true, breaks: true}) as string;
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
    router.back();
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
}

async function editItem() {
  createInventoryItemStore.clearAll();
  createInventoryItemStore.item = { ...inventoryItemStore.inventoryItem.item };
  createInventoryItemStore.inventoryItemId = inventoryItemStore.inventoryItem.id;
  createInventoryItemStore.item.roomId = route.params.roomId;
  ionRouter.navigate(`/rooms/${route.params.roomId}/characters/${route.params.characterId}/inventory/add`, "forward", "push");
}

async function copyAndEditItem() {
  createInventoryItemStore.clearAll();
  createInventoryItemStore.item = { ...inventoryItemStore.inventoryItem.item, id: undefined as any };
  createInventoryItemStore.inventoryItemId = inventoryItemStore.inventoryItem.id;
  createInventoryItemStore.item.roomId = route.params.roomId;
  ionRouter.navigate(`/rooms/${route.params.roomId}/characters/${route.params.characterId}/inventory/add`, "forward", "push");
}

async function identifyItem() {
  if (identifyLoading.value) return;
  identifyLoading.value = true;
  try {
    const response = await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}/items/${inventoryItemStore.inventoryItem.id.trim()}/identify`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
    );
    inventoryStore.inventory = response.data;
    inventoryItemStore.updateInventoryItemInStoreById(route.params.roomId, route.params.characterId, route.params.itemId);
  } catch (error) {
    console.error("Ошибка при опознании предмета:", error);
  } finally {
    identifyLoading.value = false;
  }
}

function getSkillCharges(skill: ItemSkill): number {
  return inventorySkillsByItemSkillId.value.get(skill.id) ?? skill.charges;
}

function getRefillLabel(refill: ItemSkill["chargesRefill"]): string {
  return refill === "SHORT_REST" ? "короткий отдых" : "долгий отдых";
}

</script>

<template>
  <ion-page class="item-page-root">
    <ion-header>
      <ion-toolbar color="dark" class="item-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/" text=""/>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="item-ion-content" color="dark">
      <div v-if="item" class="item-page" :class="{ 'item-page--no-skills': !item.skills?.length }">
        <div class="item-header">
          <div
              class="avatar"
              :style="ambientColor ? { '--ambient-color': ambientColor } : undefined"
          >
            <div class="avatar-ambient" aria-hidden="true">
              <img :src="itemImageUrl" alt="" class="avatar-ambient__img"/>
            </div>
            <img :src="itemImageUrl" :alt="item.name?.rus" class="avatar-img"/>
            <div class="avatar-badges">
              <span v-if="inventoryItem.inUse" class="avatar-badge avatar-badge--equipped">Снаряжено</span>
              <span v-if="isUnidentified" class="avatar-badge avatar-badge--unidentified">Неопознан</span>
              <span v-if="inventoryItem.count > 1" class="avatar-badge">×{{ inventoryItem.count }}</span>
            </div>
          </div>

          <div class="stats">
            <div v-for="stat in headerStats" :key="stat.key" class="stat">
              <span class="stat__label">{{ stat.label }}</span>
              <span class="stat-value" :class="{ 'stat-value--wide': stat.wide }">
                {{ stat.value }}<ion-icon
                  v-if="stat.coinIcon"
                  class="stat-value__coin"
                  :src="stat.coinIcon"
                  aria-hidden="true"
              />
              </span>
            </div>
          </div>
        </div>

        <div class="item-identity">
          <h1 class="item-identity__name">{{ item.name.rus }}</h1>
        </div>

        <div class="item-details">
          <section v-if="showRequirementsWarning" class="notice notice--warning">
            Требования к характеристикам не выполнены
          </section>
          <section v-if="item.itemBundleId" class="notice notice--primary">
            <ion-icon :icon="bookOutline" /> Из набора предметов: {{item.itemBundleName}}
          </section>

          <section class="panel">
            <h2 class="panel__title">Характеристики</h2>
            <div class="details-grid">
              <div v-if="item.stats?.weight != null" class="detail-row">
                <span class="detail-row__label">{{ TEXTS.weight.rus }}</span>
                <span class="detail-row__value detail-row__value--pill">{{ item.stats.weight }}</span>
              </div>
              <div v-if="isWeapon && item.stats?.damage" class="detail-row">
                <span class="detail-row__label">Урон</span>
                <span class="detail-row__value detail-row__value--pill">
                {{ item.stats.damage.value }}
                <template v-if="item.stats.damage.damageTypeName">
                  ({{ item.stats.damage.damageTypeName }})
                </template>
              </span>
              </div>
              <div v-if="isArmor && item.stats?.armorClass" class="detail-row">
                <span class="detail-row__label">{{ HEADERS.armoryClass.rus }}</span>
                <span class="detail-row__value detail-row__value--pill">{{ item.stats.armorClass }}</span>
              </div>
              <div
                  v-if="isArmor && Number(item.stats?.armorClassMaxDexterityBonus) > 0"
                  class="detail-row"
              >
                <span class="detail-row__label">{{ HEADERS.max_dex_bonus.rus }}</span>
                <span class="detail-row__value detail-row__value--pill">{{
                    item.stats.armorClassMaxDexterityBonus
                  }}</span>
              </div>
              <div v-if="isArmor && hasArmorStatRequirement" class="detail-row">
                <span class="detail-row__label">{{ HEADERS.force_requirements.rus }}</span>
                <span class="detail-row__value detail-row__value--pill">{{ item.stats?.requirement }}</span>
              </div>
              <div v-if="isArmor" class="detail-row">
                <span class="detail-row__label">{{ HEADERS.stealth_disadvantage.rus }}</span>
                <span class="detail-row__value detail-row__value--pill">{{ item.stats?.stealthDisadvantage == 'DISADVANTAGE' ? 'Помеха' : 'Нет помехи' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-row__label">Настройка</span>
                <span class="detail-row__value detail-row__value--toggle">
                <ion-toggle :checked="item.customization" :disabled="true"/>
              </span>
              </div>
              <div v-if="inventoryItem.attackBonusValue" class="detail-row">
                <span class="detail-row__label">Бонус атаки</span>
                <span class="detail-row__value">+{{ inventoryItem.attackBonusValue }}</span>
              </div>
              <div v-if="inventoryItem.damageBonusValue" class="detail-row">
                <span class="detail-row__label">Бонус урона</span>
                <span class="detail-row__value">+{{ inventoryItem.damageBonusValue }}</span>
              </div>
            </div>

            <div v-if="item.stats?.tags?.length" class="tags">
              <span v-for="(tag, idx) in item.stats.tags" :key="idx" class="tag-wrapper">
                <span class="tag">{{ tag }}</span>
                <button
                    v-if="availableTags.find(t => t.name === tag)?.description"
                    :class="['tag-info-btn', { 'tag-info-btn--active': shownTagInfo === tag }]"
                    @click.stop="toggleTagInfo(tag)"
                >?</button>
              </span>
              <div v-if="shownTagInfo" class="tag-description">
                <span class="tag-description__name">{{ shownTagInfo }}</span>
                {{ availableTags.find(t => t.name === shownTagInfo)?.description }}
              </div>
            </div>
          </section>

          <section v-if="item.description" class="panel">
            <h2 class="panel__title">Описание</h2>
            <div class="description-html" v-html="renderMarkdown(item.description)"/>
          </section>
        </div>

        <section v-if="item.skills?.length" class="panel panel--skills">
          <h2 class="panel__title">Навыки предмета</h2>
          <div class="skills-list">
            <button
                v-for="skill in item.skills"
                :key="skill.id"
                type="button"
                class="skill-card"
                @click="openViewItemSkillModal(false, skill)"
            >
              <div class="skill-card__media">
                <img
                    class="skill-card__img"
                    :src="getSkillImageUrl(skill.imgUrl)"
                    :alt="skill.name.rus"
                    @error="($event.target as HTMLImageElement).src = SKILL_IMAGE_PLACEHOLDER"
                />
              </div>
              <div class="skill-card__body">
                <div class="skill-card__name">{{ skill.name.rus }}</div>
                <div v-if="skill.shortDescription" class="skill-card__desc">{{ skill.shortDescription }}</div>
                <div class="skill-card__meta">
                  Зарядов: {{ getSkillCharges(skill) }} · {{ getRefillLabel(skill.chargesRefill) }}
                </div>
              </div>
              <ion-icon class="skill-card__chevron" :icon="chevronForwardOutline"/>
            </button>
          </div>
        </section>
      </div>
    </ion-content>

    <div v-if="item" class="item-footer">
      <ion-button
          v-if="isMyItem"
          class="item-footer__btn item-footer__btn--primary"
          expand="block"
          fill="solid"
          shape="round"
          color="primary"
          @click="editItem"
      >
        <ion-icon slot="start" :icon="createOutline"/>
        Изменить
      </ion-button>
      <ion-button
          v-if="isCatalogItem"
          class="item-footer__btn item-footer__btn--primary"
          expand="block"
          fill="solid"
          shape="round"
          color="primary"
          @click="copyAndEditItem"
      >
        <ion-icon slot="start" :icon="createOutline"/>
        Скопировать и изменить
      </ion-button>
      <ion-button
          v-if="isMaster && isUnidentified"
          class="item-footer__btn item-footer__btn--primary"
          expand="block"
          fill="solid"
          shape="round"
          color="success"
          :disabled="identifyLoading"
          @click="identifyItem"
      >
        <ion-icon slot="start" :icon="eyeOutline"/>
        Опознать
      </ion-button>
      <ion-button
          class="item-footer__btn item-footer__btn--danger"
          expand="block"
          fill="clear"
          color="danger"
          @click="deleteItemFromInventory"
      >
        <ion-icon slot="start" :icon="trashOutline"/>
        Удалить из инвентаря
      </ion-button>
    </div>

    <EditItemSkillValueModal
        :isOpen="showEditItemSkillModal"
        :character-id="String(route.params.characterId)"
        :is-editing="isEditingItemSkill"
        :item-skill="editingItemSkill"
        @closeEditItemSkillModal="closeEditItemSkillModal"
        :is-read-only="true"
        :isCharacterSkill="false"
    />
  </ion-page>
</template>

<style scoped>
.item-page-root {
  --item-footer-height: 112px;
}

.item-toolbar {
  --min-height: 44px;
}

.item-ion-content {
  --background: var(--ion-color-dark);
  --padding-top: 4px;
  --padding-bottom: calc(var(--item-footer-height) + env(safe-area-inset-bottom, 0px) + 16px);
}

.item-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 14px;
  max-width: 720px;
  margin: 0 auto;
}

.item-header {
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  gap: 20px;
}

.avatar {
  position: relative;
  flex-shrink: 0;
  height: 180px;
  width: 180px;
  border-radius: 25px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ambient-color, var(--ion-color-dark));
  border: 1px solid var(--ion-color-medium);
  transition: background-color 0.45s ease;
}

.avatar-ambient {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

.avatar-ambient__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.14);
  filter: blur(20px) saturate(1.5);
}

.avatar-img {
  position: relative;
  z-index: 1;
  display: block;
  width: auto;
  height: auto;
  max-width: 180px;
  max-height: 180px;
  object-fit: contain;
}

.avatar-badges {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.avatar-badge {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--ion-color-light);
  background: rgba(var(--ion-color-dark-rgb), 0.72);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.16);
}

.avatar-badge--equipped {
  color: var(--ion-color-primary-contrast);
  background: rgba(var(--ion-color-primary-rgb), 0.92);
  border-color: transparent;
}

.avatar-badge--unidentified {
  color: var(--ion-color-warning-contrast);
  background: rgba(var(--ion-color-warning-rgb), 0.92);
  border-color: transparent;
}

.stats {
  flex: 1;
  width: 180px;
  height: 180px;
  border-radius: 25px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  background-color: var(--ion-color-medium);
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  background-color: var(--ion-color-secondary-opacity-40);
  margin: 0 5%;
  height: 23%;
  min-height: 36px;
  border-radius: 15px;
  padding: 0 8px;
  font-weight: bold;
  font-size: 11px;
  line-height: 1.2;
  color: var(--ion-color-light);
}

.stat__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-value {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border-radius: 50%;
  height: 30px;
  width: 30px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.stat-value--wide {
  width: auto;
  min-width: 30px;
  max-width: 58px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
  gap: 2px;
}

.stat-value__coin {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.28));
}

.item-identity {
  padding: 0 4px;
}

.item-identity__name {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.15;
  color: var(--ion-color-light);
}

.item-identity__type {
  margin: 5px 0 0;
  font-size: 13px;
  line-height: 1.35;
  color: rgba(var(--ion-color-light-rgb), 0.55);
}

.notice {
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.notice--warning {
  color: var(--ion-color-warning);
  background: rgba(var(--ion-color-warning-rgb), 0.12);
  border: 1px solid rgba(var(--ion-color-warning-rgb), 0.28);
}

.notice--primary {
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.28);
}

.panel {
  padding: 14px;
  border-radius: 16px;
  background: var(--ion-color-medium);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.1);
}

.panel__title {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.details-grid {
  display: flex;
  flex-direction: column;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 46px;
  padding: 9px 0;
  border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.06);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row__label {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 1.35;
  color: rgba(var(--ion-color-light-rgb), 0.62);
}

.detail-row__value {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-light);
  text-align: right;
}

.detail-row__value--pill {
  min-width: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.14);
  color: var(--ion-color-primary);
  font-variant-numeric: tabular-nums;
}

.detail-row__value--toggle {
  display: flex;
  justify-content: flex-end;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(var(--ion-color-light-rgb), 0.06);
}

.tag-wrapper { display: inline-flex; align-items: center; gap: 3px; }

.tag {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--ion-color-primary-rgb), 0.95);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.22);
}

.tag-info-btn {
  width: 18px; height: 18px; border-radius: 50%;
  border: 1px solid rgba(var(--ion-color-medium-rgb), 0.4);
  background: var(--ion-color-medium-tint); color: var(--ion-color-primary);
  font-size: 10px; font-weight: bold; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0; flex-shrink: 0;
}
.tag-info-btn--active, .tag-info-btn:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.15);
  color: var(--ion-color-primary); border-color: var(--ion-color-primary);
}
.tag-description {
  width: 100%; margin-top: 6px; padding: 10px 12px;
  border-radius: 8px; background: rgba(var(--ion-color-primary-rgb), 0.06);
  border-left: 3px solid var(--ion-color-primary);
  font-size: 12px; line-height: 1.5; color: var(--ion-color-primary);
}
.tag-description__name { font-weight: 600; color: var(--ion-color-primary); margin-right: 4px; }

.description-html :deep(p) {
  margin: 0 0 0.75em;
  font-size: 15px;
  line-height: 1.6;
  color: rgba(var(--ion-color-light-rgb), 0.9);
  word-break: break-word;
}

.description-html :deep(p:last-child) {
  margin-bottom: 0;
}

.description-html :deep(ul),
.description-html :deep(ol) {
  margin: 0.5em 0 0.75em;
  padding-left: 1.25em;
  font-size: 15px;
  line-height: 1.55;
}

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-card {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.12);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s ease, transform 0.15s ease;
}

.skill-card:active {
  transform: scale(0.99);
  background: rgba(var(--ion-color-primary-rgb), 0.08);
}

.skill-card__media {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-dark);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.14);
}

.skill-card__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: var(--ion-color-dark);
}

.skill-card__body {
  flex: 1;
  min-width: 0;
}

.skill-card__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-card__desc,
.skill-card__meta {
  font-size: 12px;
  line-height: 1.35;
  color: rgba(var(--ion-color-light-rgb), 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-card__meta {
  margin-top: 3px;
  color: rgba(var(--ion-color-primary-rgb), 0.85);
}

.skill-card__chevron {
  flex-shrink: 0;
  font-size: 18px;
  color: rgba(var(--ion-color-light-rgb), 0.35);
}

.item-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  background: rgba(var(--ion-color-dark-rgb), 0.94);
  border-top: 1px solid rgba(var(--ion-color-primary-rgb), 0.12);
  backdrop-filter: blur(12px);
}

.item-footer__btn {
  margin: 0;
  text-transform: none;
  letter-spacing: 0;
  font-size: 15px;
  font-weight: 600;
  --border-radius: 14px;
}

.item-footer__btn--primary {
  min-height: 46px;
}

.item-footer__btn--danger {
  min-height: 40px;
  --padding-top: 0;
  --padding-bottom: 0;
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (min-width: 1024px) {
  .item-page {
    max-width: 960px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      "header header"
      "identity identity"
      "details skills";
    column-gap: 16px;
    row-gap: 12px;
    align-items: start;
    padding-top: 8px;
  }

  .item-page--no-skills {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "identity"
      "details";
  }

  .item-page--no-skills .item-header {
    justify-content: center;
  }

  .item-page--no-skills .stats {
    flex: none;
    height: auto;
    min-height: 180px;
  }

  .item-header {
    grid-area: header;
    gap: 38px;
  }

  .item-identity {
    grid-area: identity;
  }

  .item-details {
    grid-area: details;
  }

  .panel--skills {
    grid-area: skills;
  }

  .item-footer {
    max-width: 960px;
    left: 50%;
    transform: translateX(-50%);
    flex-direction: row;
    gap: 10px;
    border-radius: 16px 16px 0 0;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }

  .item-footer__btn--primary {
    flex: 1.2;
  }

  .item-footer__btn--danger {
    flex: 1;
    --background: transparent;
    border: 1px solid rgba(var(--ion-color-danger-rgb), 0.35);
    border-radius: 14px;
  }
}
</style>
