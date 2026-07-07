<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonModal,
  IonTitle,
  IonToggle,
  IonToolbar,
} from "@ionic/vue";
import {computed, ref, watch} from "vue";
import type {Item, ItemSkill} from "@/components/models/response/InventoryResponse";
import type {ItemTagDto} from "@/api/itemTagApi";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {HEADERS, TEXTS} from "@/config/localisations";
import {add, chevronForwardOutline, remove} from "ionicons/icons";
import {marked} from "marked";
import EditItemSkillValueModal from "@/views/character/tabs/inventory/EditItemSkillValueModal.vue";
import {extractDominantColorFromUrl} from "@/utils/imageAmbient";
import goldenCoinIcon from "@/static/icons/GoldenCoin.svg";
import silverCoinIcon from "@/static/icons/SilverCoin.svg";
import copperCoinIcon from "@/static/icons/CopperCoin.svg";
import axios from "axios";

const props = withDefaults(
    defineProps<{
      item: Item | null;
      isOpen: boolean;
      characterId: string;
      roomId: string;
      availableTags?: ItemTagDto[];
    }>(),
    {item: null, isOpen: false, characterId: "", roomId: "", availableTags: () => []},
);

const shownTagInfo = ref<string | null>(null);
function toggleTagInfo(tag: string) {
  shownTagInfo.value = shownTagInfo.value === tag ? null : tag;
}

const emit = defineEmits<{
  (e: "close"): void;
  (e: "addToInventory", item: Item, count: number): void;
  (e: "deleteItem", itemId: string): void;
}>();

const fullViewCount = ref(1);
const showEditItemSkillModal = ref(false);
const editingItemSkill = ref<ItemSkill | undefined>();
const myUserId = ref<string | null>(null);
const ambientColor = ref<string | null>(null);

const SKILL_IMAGE_PLACEHOLDER =
    "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";

watch(
    () => [props.item, props.isOpen],
    () => {
      if (props.item) fullViewCount.value = props.item.count ?? 1;
    },
    {immediate: true},
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
            },
        );
        myUserId.value = response.data;
      } catch (e) {
        console.error("Не удалось получить идентификатор пользователя", e);
      }
    },
);

const isOwner = computed(() => {
  if (!props.item || !myUserId.value) return false;
  return props.item.creatorId === myUserId.value;
});

const isArmor = computed(() => props.item?.type === "ARMOR");
const isWeapon = computed(() => props.item?.type === "WEAPON");

const hasArmorStatRequirement = computed(() => {
  const requirement = props.item?.stats?.requirement?.trim();
  if (!requirement || requirement === "-1") return false;
  const numericRequirement = Number(requirement);
  return !Number.isNaN(numericRequirement) && numericRequirement > 0;
});

const getItemImageUrl = (imgUrl: string | undefined) =>
    imgUrl != null && imgUrl.trim()
        ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
        : SKILL_IMAGE_PLACEHOLDER;

const getSkillImageUrl = (imgUrl: string | undefined) =>
    imgUrl != null && imgUrl.trim()
        ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.skills_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
        : SKILL_IMAGE_PLACEHOLDER;

const itemImageUrl = computed(() => getItemImageUrl(props.item?.imgUrl));

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
        },
    );
    emit("deleteItem", props.item.id);
    closeModal();
  } catch (e) {
    console.error("Ошибка при удалении предмета", e);
  }
}

const renderMarkdown = (text: string | undefined): string => {
  if (!text) return "";
  return marked.parse(text.replace(/\r\n/g, "\n"), {gfm: true, breaks: true}) as string;
};

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
      return {icon: goldenCoinIcon};
    case "SILVER":
      return {icon: silverCoinIcon};
    case "COPPER":
      return {icon: copperCoinIcon};
    default:
      return {icon: ""};
  }
}

const headerStats = computed(() => {
  const stats: Array<{key: string; label: string; value: string; wide?: boolean; coinIcon?: string}> = [];
  const currentItem = props.item;
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

function getRefillLabel(refill: ItemSkill["chargesRefill"]): string {
  return refill === "SHORT_REST" ? "короткий отдых" : "долгий отдых";
}
</script>

<template>
  <ion-modal :is-open="isOpen" class="full-view-modal" @didDismiss="closeModal">
    <ion-header>
      <ion-toolbar color="dark" class="item-toolbar">
        <ion-title>Предмет</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="closeModal">Закрыть</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="item" class="item-ion-content" color="dark">
      <div class="item-page">
        <div class="item-header">
          <div
              class="avatar"
              :style="ambientColor ? { '--ambient-color': ambientColor } : undefined"
          >
            <div class="avatar-ambient" aria-hidden="true">
              <img :src="itemImageUrl" alt="" class="avatar-ambient__img"/>
            </div>
            <img :src="itemImageUrl" :alt="item.name?.rus" class="avatar-img"/>
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
          <h1 class="item-identity__name">{{ item.name?.rus }}</h1>
          <div v-if="item.hiddenStats && item.unidentifiedName?.rus" class="item-identity__unidentified-hint">
            До опознания: {{ item.unidentifiedName.rus }}
          </div>
        </div>

        <div class="item-details">
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
                <span class="detail-row__value detail-row__value--pill">{{ item.stats.armorClassMaxDexterityBonus }}</span>
              </div>
              <div v-if="isArmor && hasArmorStatRequirement" class="detail-row">
                <span class="detail-row__label">{{ HEADERS.force_requirements.rus }}</span>
                <span class="detail-row__value detail-row__value--pill">{{ item.stats?.requirement }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-row__label">Настройка</span>
                <span class="detail-row__value detail-row__value--toggle">
                  <ion-toggle :checked="item.customization" :disabled="true"/>
                </span>
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
                @click="openViewItemSkillModal(skill)"
            >
              <div class="skill-card__media">
                <img
                    class="skill-card__img"
                    :src="getSkillImageUrl(skill.imgUrl)"
                    :alt="skill.name?.rus"
                    @error="($event.target as HTMLImageElement).src = SKILL_IMAGE_PLACEHOLDER"
                />
              </div>
              <div class="skill-card__body">
                <div class="skill-card__name">{{ skill.name?.rus }}</div>
                <div v-if="skill.shortDescription" class="skill-card__desc">{{ skill.shortDescription }}</div>
                <div class="skill-card__meta">
                  Зарядов: {{ skill.charges }} · {{ getRefillLabel(skill.chargesRefill) }}
                </div>
              </div>
              <ion-icon class="skill-card__chevron" :icon="chevronForwardOutline"/>
            </button>
          </div>
        </section>
      </div>
    </ion-content>

    <div v-if="item" class="item-footer">
      <div class="full-view-count-row">
        <ion-button size="small" shape="round" @click="fullViewCount = Math.max(1, fullViewCount - 1)">
          <ion-icon slot="icon-only" :icon="remove"/>
        </ion-button>
        <ion-label>{{ fullViewCount }}</ion-label>
        <ion-button size="small" shape="round" @click="fullViewCount = fullViewCount + 1">
          <ion-icon slot="icon-only" :icon="add"/>
        </ion-button>
      </div>
      <ion-button
          v-if="isOwner"
          class="item-footer__btn item-footer__btn--danger"
          expand="block"
          fill="clear"
          color="danger"
          @click="deleteItem"
      >
        Удалить предмет
      </ion-button>
      <ion-button
          class="item-footer__btn item-footer__btn--primary"
          expand="block"
          fill="solid"
          shape="round"
          color="primary"
          @click="addFromFullView"
      >
        Добавить в инвентарь
      </ion-button>
    </div>

    <EditItemSkillValueModal
        :isOpen="showEditItemSkillModal"
        :character-id="characterId"
        :is-editing="false"
        :item-skill="editingItemSkill"
        :is-read-only="true"
        :isCharacterSkill="false"
        @closeEditItemSkillModal="closeEditItemSkillModal"
    />
  </ion-modal>
</template>

<style scoped>
.full-view-modal {
  --width: 100%;
  --max-width: 500px;
  --height: 100%;
  --border-radius: 0;
  --item-footer-height: 168px;
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
}

.item-header {
  display: grid;
  grid-template-columns: repeat(2, 180px);
  justify-content: center;
  gap: 20px;
  width: 100%;
}

.avatar {
  position: relative;
  width: 180px;
  height: 180px;
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
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.stats {
  width: 180px;
  height: 180px;
  box-sizing: border-box;
  border-radius: 25px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 8px;
  background-color: var(--ion-color-medium);
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  background-color: var(--ion-color-secondary-opacity-40);
  flex: 1 1 0;
  min-height: 0;
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

.item-identity__name {
  margin: 0;
  padding: 0 4px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.15;
  color: var(--ion-color-light);
}

.item-identity__unidentified-hint {
  margin-top: 4px;
  padding: 0 4px;
  font-size: 13px;
  font-style: italic;
  color: var(--ion-color-warning);
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  border: 1px solid rgba(var(--ion-color-primary), 0.4);
  background: transparent; color: var(--ion-color-primary);
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
  font-size: 12px; line-height: 1.5; color: var(--ion-color-secondary);
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
  gap: 6px;
  padding: 8px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  background: rgba(var(--ion-color-dark-rgb), 0.94);
  border-top: 1px solid rgba(var(--ion-color-primary-rgb), 0.12);
  backdrop-filter: blur(12px);
}

.full-view-count-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12px;
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
</style>
