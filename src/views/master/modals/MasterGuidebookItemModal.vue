<script setup lang="ts">
import {computed, ref, watch, withDefaults} from "vue";
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonToolbar,
  IonIcon,
  IonToggle,
} from "@ionic/vue";
import {closeOutline, createOutline, trashOutline} from "ionicons/icons";
import type {Item} from "@/components/models/response/InventoryResponse";
import type {ItemTagDto} from "@/api/itemTagApi";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {marked} from "marked";
import {extractDominantColorFromUrl} from "@/utils/imageAmbient";
import {HEADERS, TEXTS} from "@/config/localisations";
import goldenCoinIcon from "@/static/icons/GoldenCoin.svg";
import silverCoinIcon from "@/static/icons/SilverCoin.svg";
import copperCoinIcon from "@/static/icons/CopperCoin.svg";

const props = withDefaults(defineProps<{
  item: Item | null;
  isOpen: boolean;
  availableTags?: ItemTagDto[];
}>(), { availableTags: () => [] });

const emit = defineEmits<{ (e: "close"): void; (e: "edit"): void; (e: "delete"): void }>();

const shownTagInfo = ref<string | null>(null);
function toggleTagInfo(tag: string) {
  shownTagInfo.value = shownTagInfo.value === tag ? null : tag;
}

const PLACEHOLDER = "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";

const ambientColor = ref<string | null>(null);

const itemImageUrl = computed(() => {
  const imgUrl = props.item?.imgUrl;
  return imgUrl?.trim()
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
    : PLACEHOLDER;
});

watch(itemImageUrl, (src) => {
  if (!src) { ambientColor.value = null; return; }
  void extractDominantColorFromUrl(src).then((color) => {
    if (src === itemImageUrl.value) ambientColor.value = color;
  });
}, {immediate: true});

const isArmor = computed(() => props.item?.type === "ARMOR");
const isWeapon = computed(() => props.item?.type === "WEAPON");

function getCoinType(coinType: string | undefined) {
  switch (coinType) {
    case "SILVER": return {icon: silverCoinIcon};
    case "COPPER": return {icon: copperCoinIcon};
    default: return {icon: goldenCoinIcon};
  }
}

function getTypeAbbreviation(typeName: string | undefined): string {
  if (!typeName?.trim()) return "—";
  const name = typeName.trim();
  if (name === "Доспех") return "Д";
  if (name === "Оружие") return "О";
  if (name === "Магический предмет") return "М";
  if (name === "Другое" || name === "Прочее") return "П";
  return name.charAt(0).toUpperCase();
}

function getSubtypeAbbreviation(subtypeName: string | undefined): string {
  if (!subtypeName?.trim()) return "—";
  return subtypeName.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase()).join("");
}

const headerStats = computed(() => {
  const stats: Array<{key: string; label: string; value: string; wide?: boolean; coinIcon?: string}> = [];
  const item = props.item;
  if (!item) return stats;

  if (item.typeName) stats.push({key: "type", label: "Тип", value: getTypeAbbreviation(item.typeName)});

  if (item.subtypeName && ["ARMOR", "WEAPON"].includes(item.type ?? ""))
    stats.push({key: "subtype", label: "Подтип", value: getSubtypeAbbreviation(item.subtypeName), wide: true});

  if (item.stats?.defaultPrice?.length) {
    const price = item.stats.defaultPrice[0];
    stats.push({key: "price", label: "Цена", value: String(price.value), coinIcon: getCoinType(price.coinType).icon, wide: true});
  }

  return stats;
});

const hasArmorStatRequirement = computed(() => {
  const req = props.item?.stats?.requirement?.trim();
  if (!req || req === "-1") return false;
  const n = Number(req);
  return !Number.isNaN(n) && n > 0;
});

const renderMarkdown = (text: string | undefined): string =>
  text ? marked.parse(text.replace(/\r\n/g, "\n"), {gfm: true, breaks: true}) as string : "";

function closeModal() { emit("close"); }
function editItem() { emit("edit"); }
function deleteItem() { emit("delete"); }
</script>

<template>
  <ion-modal :is-open="isOpen" @didDismiss="closeModal" :initial-breakpoint="1" :breakpoints="[0, 1]">
    <ion-header>
      <ion-toolbar color="dark" class="item-toolbar">
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="editItem">
            <ion-icon :icon="createOutline" slot="icon-only"/>
          </ion-button>
          <ion-button fill="clear" @click="closeModal">
            <ion-icon :icon="closeOutline" slot="icon-only"/>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="item-ion-content" color="dark" v-if="item">
      <div class="item-page">

        <!-- Header: avatar + stats pills -->
        <div class="item-header">
          <div
            class="avatar"
            :style="ambientColor ? {'--ambient-color': ambientColor} : undefined"
          >
            <div class="avatar-ambient" aria-hidden="true">
              <img :src="itemImageUrl" alt="" class="avatar-ambient__img"/>
            </div>
            <img :src="itemImageUrl" :alt="item.name?.rus" class="avatar-img"/>
          </div>

          <div class="stats">
            <div v-for="stat in headerStats" :key="stat.key" class="stat">
              <span class="stat__label">{{ stat.label }}</span>
              <span class="stat-value" :class="{'stat-value--wide': stat.wide}">
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

        <!-- Name -->
        <div class="item-identity">
          <h1 class="item-identity__name">{{ item.name?.rus ?? item.name?.eng ?? "—" }}</h1>
          <p v-if="item.name?.eng" class="item-identity__eng">{{ item.name.eng }}</p>
        </div>

        <div class="item-details">
          <!-- Stats panel -->
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
                  <template v-if="item.stats.damage.damageTypeName"> ({{ item.stats.damage.damageTypeName }})</template>
                </span>
              </div>
              <div v-if="isArmor && item.stats?.armorClass" class="detail-row">
                <span class="detail-row__label">{{ HEADERS.armoryClass.rus }}</span>
                <span class="detail-row__value detail-row__value--pill">{{ item.stats.armorClass }}</span>
              </div>
              <div v-if="isArmor && Number(item.stats?.armorClassMaxDexterityBonus) > 0" class="detail-row">
                <span class="detail-row__label">{{ HEADERS.max_dex_bonus.rus }}</span>
                <span class="detail-row__value detail-row__value--pill">{{ item.stats.armorClassMaxDexterityBonus }}</span>
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

          <!-- Description -->
          <section v-if="item.description" class="panel">
            <h2 class="panel__title">Описание</h2>
            <div class="description-html" v-html="renderMarkdown(item.description)"/>
          </section>
        </div>
      </div>
      <div v-if="item.creatorId" class="item-delete-section">
        <ion-button expand="block" fill="clear" color="danger" @click="deleteItem">
          <ion-icon slot="start" :icon="trashOutline"/>
          Удалить предмет
        </ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.item-toolbar {
  --min-height: 44px;
}

.item-delete-section {
  padding: 8px 16px 16px;
}

.item-ion-content {
  --background: var(--ion-color-dark);
  --padding-top: 0;
  --padding-bottom: 24px;
}

.item-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 14px 24px;
  max-width: 720px;
  margin: 0 auto;
}

/* Header */
.item-header {
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: center;
  gap: 20px;
}

.avatar {
  position: relative;
  flex-shrink: 0;
  height: 160px;
  width: 160px;
  border-radius: 22px;
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
  max-width: 160px;
  max-height: 160px;
  object-fit: contain;
}

.stats {
  flex: 1;
  height: 160px;
  border-radius: 22px;
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
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.28));
}

/* Identity */
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

.item-identity__eng {
  margin: 3px 0 0;
  font-size: 13px;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

/* Details */
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

.tag-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

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
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.4);
  background: transparent;
  color: var(--ion-color-primary);
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
}

.tag-info-btn--active,
.tag-info-btn:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.15);
  color: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
}

.tag-description {
  width: 100%;
  margin-top: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--ion-color-primary-rgb), 0.06);
  border-left: 3px solid var(--ion-color-primary);
  font-size: 12px;
  line-height: 1.5;
  color: var(--ion-color-secondary);
}

.tag-description__name {
  font-weight: 600;
  color: var(--ion-color-primary);
  margin-right: 4px;
}

.description-html :deep(p) {
  margin: 0 0 0.75em;
  font-size: 15px;
  line-height: 1.6;
  color: rgba(var(--ion-color-light-rgb), 0.9);
  word-break: break-word;
}

.description-html :deep(p:last-child) { margin-bottom: 0; }

.description-html :deep(ul),
.description-html :deep(ol) {
  margin: 0.5em 0 0.75em;
  padding-left: 1.25em;
  font-size: 15px;
  line-height: 1.55;
}
</style>
