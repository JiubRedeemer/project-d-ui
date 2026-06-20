<script setup lang="ts">
import {computed, onMounted, ref, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonToolbar,
} from "@ionic/vue";
import {createOutline} from "ionicons/icons";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {getNpcByIdForRoom} from "@/api/npcApi";
import type {NpcDto, NpcTypeEnum} from "@/api/npcApi.types";
import {marked} from "marked";
import {extractDominantColorFromUrl} from "@/utils/imageAmbient";

marked.setOptions({breaks: true});

const NPC_TYPE_ABBREVIATIONS: Record<NpcTypeEnum, string> = {
  RATIONAL: "Р",
  BEAST: "Ж",
  MONSTER: "М",
  DEITY: "Б",
  UNDEAD: "Н",
};

const NPC_IMAGE_PLACEHOLDER =
    "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";

const route = useRoute();
const ionRouter = useRouter();

const npc = ref<NpcDto | null>(null);
const ambientColor = ref<string | null>(null);

const getImageUrl = (imgUrl: string | undefined | null) =>
    imgUrl != null && imgUrl.trim()
        ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
        : NPC_IMAGE_PLACEHOLDER;

const npcImageUrl = computed(() => getImageUrl(npc.value?.imgUrl));

watch(npcImageUrl, (src) => {
  if (!src || src === NPC_IMAGE_PLACEHOLDER) {
    ambientColor.value = null;
    return;
  }
  void extractDominantColorFromUrl(src).then((color) => {
    if (src === npcImageUrl.value) {
      ambientColor.value = color;
    }
  });
}, {immediate: true});

function getNpcTypeAbbreviation(type: NpcTypeEnum | undefined | null): string {
  if (!type) return "—";
  return NPC_TYPE_ABBREVIATIONS[type] ?? type.charAt(0);
}

function formatBool(value: boolean | undefined | null): string {
  return value ? "Да" : "Нет";
}

const headerStats = computed(() => {
  if (!npc.value) return [];
  return [
    {key: "type", label: "Тип", value: getNpcTypeAbbreviation(npc.value.type)},
    {key: "visible", label: "Видимость", value: formatBool(npc.value.visible), wide: true},
    {key: "unique", label: "Уникальность", value: formatBool(npc.value.unique), wide: true},
  ];
});

const renderMarkdown = (text: string | undefined | null): string => {
  if (!text?.trim()) return "";
  return marked.parse(text.replace(/\r\n/g, "\n"), {gfm: true, breaks: true}) as string;
};

const goToEdit = () => {
  const roomId = route.params.roomId as string;
  const id = npc.value?.id;
  if (id) ionRouter.push(`/rooms/${roomId}/npcs/${id}/edit`);
};

onMounted(async () => {
  const roomId = route.params.roomId as string;
  const npcId = route.params.npcId as string;
  try {
    npc.value = await getNpcByIdForRoom(roomId, npcId);
  } catch (e) {
    console.error("Failed to load NPC for full view:", e);
  }
});
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
      <div v-if="npc" class="item-page">
        <div class="item-header">
          <div
              class="avatar"
              :style="ambientColor ? { '--ambient-color': ambientColor } : undefined"
          >
            <div class="avatar-ambient" aria-hidden="true">
              <img :src="npcImageUrl" alt="" class="avatar-ambient__img"/>
            </div>
            <img :src="npcImageUrl" :alt="npc.name" class="avatar-img"/>
          </div>

          <div class="stats">
            <div v-for="stat in headerStats" :key="stat.key" class="stat">
              <span class="stat__label">{{ stat.label }}</span>
              <span class="stat-value" :class="{ 'stat-value--wide': stat.wide }">{{ stat.value }}</span>
            </div>
          </div>
        </div>

        <div class="item-identity">
          <h1 class="item-identity__name">{{ npc.name }}</h1>
        </div>

        <div class="item-details">
          <section class="panel">
            <h2 class="panel__title">Характеристики</h2>
            <div class="details-grid">
              <div v-if="npc.clazzInfo?.name || npc.clazzCode" class="detail-row">
                <span class="detail-row__label">Класс</span>
                <span class="detail-row__value detail-row__value--pill">
                  {{ npc.clazzInfo?.name || npc.clazzCode }}
                </span>
              </div>
              <div v-if="npc.raceInfo?.name || npc.raceCode" class="detail-row">
                <span class="detail-row__label">Раса</span>
                <span class="detail-row__value detail-row__value--pill">
                  {{ npc.raceInfo?.name || npc.raceCode }}
                </span>
              </div>
              <div v-if="npc.armoryClass" class="detail-row">
                <span class="detail-row__label">КД</span>
                <span class="detail-row__value detail-row__value--pill">{{ npc.armoryClass }}</span>
              </div>
              <div v-if="npc.speed" class="detail-row">
                <span class="detail-row__label">Скорость</span>
                <span class="detail-row__value detail-row__value--pill">{{ npc.speed }}</span>
              </div>
              <div v-if="npc.initiative != null" class="detail-row">
                <span class="detail-row__label">Инициатива</span>
                <span class="detail-row__value detail-row__value--pill">{{ npc.initiative }}</span>
              </div>
            </div>
          </section>

          <section v-if="npc.description" class="panel">
            <h2 class="panel__title">Описание</h2>
            <div class="description-html" v-html="renderMarkdown(npc.description)"/>
          </section>
        </div>
      </div>
    </ion-content>

    <div v-if="npc" class="item-footer">
      <ion-button
          class="item-footer__btn item-footer__btn--primary"
          expand="block"
          fill="solid"
          shape="round"
          color="primary"
          @click="goToEdit"
      >
        <ion-icon slot="start" :icon="createOutline"/>
        Редактировать
      </ion-button>
    </div>
  </ion-page>
</template>

<style scoped>
.item-page-root {
  --item-footer-height: 72px;
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

@media (min-width: 1024px) {
  .item-page {
    max-width: 960px;
    padding-top: 8px;
  }

  .item-header {
    gap: 38px;
  }

  .item-footer {
    max-width: 960px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 16px 16px 0 0;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
