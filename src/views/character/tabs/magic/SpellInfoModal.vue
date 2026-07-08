<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonIcon,
  IonModal,
  toastController,
} from "@ionic/vue";
import { closeCircleOutline, createOutline, flashOutline, ribbon, star, trashOutline } from "ionicons/icons";

import { computed } from "vue";
import { useRoute } from "vue-router";
import { useIonRouter } from "@ionic/vue";
import { deleteSpellBookItem, setSpellAlwaysPrepared, setSpellInUse, useSpellCell } from "@/api/magicApi";
import type { SpellBookItemDto, SpellDto } from "@/components/models/response/MagicApi";
import { FILE_STORAGE_INTEGRATION_ROUTES, SPELL_IMAGE_PLACEHOLDER } from "@/config/integrationRoutes";
import { useMagicStore } from "@/stores/MagicStore";

const props = defineProps<{
  isOpen: boolean;
  item: SpellBookItemDto | null;
  spellBookId: string | null;
  readonly?: boolean;
}>();

const emit = defineEmits<{ (e: "closeSpellInfoModal"): void }>();

const magicStore = useMagicStore();
const route = useRoute();
const ionRouter = useIonRouter();

const spell = computed(() => props.item?.spell);
const spellLevel = computed(() => Number(spell.value?.level ?? 0));
const isCantrip = computed(() => spellLevel.value === 0);
const levelBadgeText = computed(() => {
  if (!Number.isFinite(spellLevel.value)) return "—";
  return isCantrip.value ? "Заговор" : `${spellLevel.value} уровень`;
});
const canUseCell = computed(() => {
  if (!magicStore.spellBook?.spellCells) return false;
  if (!Number.isFinite(spellLevel.value) || spellLevel.value <= 0) return false;
  const cell = magicStore.spellBook.spellCells[String(spellLevel.value)];
  return Boolean(cell?.id && (cell.currentCount ?? 0) > 0);
});

function getSpellName(s: SpellDto | undefined): string {
  if (!s?.name) return "—";
  const n = s.name as Record<string, string>;
  return n.rus ?? n.en ?? "—";
}

function getSpellImageUrl(imgUrl: string | undefined): string {
  if (!imgUrl) return SPELL_IMAGE_PLACEHOLDER;
  if (imgUrl.startsWith("http")) return imgUrl;
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.spell_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
}

async function togglePrepared() {
  if (!props.spellBookId || !props.item?.spellId) return;
  const newInUse = !(props.item.inUse === true);
  try {
    const updated = await setSpellInUse(props.spellBookId, props.item.spellId, newInUse);
    if (magicStore.spellBook?.spells) {
      const idx = magicStore.spellBook.spells.findIndex((s) => s.spellId === props.item!.spellId);
      if (idx >= 0) magicStore.spellBook.spells[idx] = updated;
    }
  } catch (e) {
    console.error("Failed to toggle prepared:", e);
  }
}

async function toggleAlwaysPrepared() {
  if (!props.spellBookId || !props.item?.spellId) return;
  const newValue = !(props.item.alwaysPrepared === true);
  try {
    const updated = await setSpellAlwaysPrepared(props.spellBookId, props.item.spellId, newValue);
    if (magicStore.spellBook?.spells) {
      const idx = magicStore.spellBook.spells.findIndex((s) => s.spellId === props.item!.spellId);
      if (idx >= 0) magicStore.spellBook.spells[idx] = updated;
    }
  } catch (e) {
    console.error("Failed to toggle always-prepared:", e);
  }
}

async function removeSpell() {
  if (!props.item?.id) return;
  try {
    await deleteSpellBookItem(props.item.id);
    if (magicStore.spellBook?.spells) {
      const filtered = magicStore.spellBook.spells.filter((s) => s.id !== props.item!.id);
      magicStore.setSpellBook({ ...magicStore.spellBook, spells: filtered });
    }
    emit("closeSpellInfoModal");
  } catch (e) {
    console.error("Failed to remove spell:", e);
  }
}

async function useSpell() {
  if (!props.spellBookId) return;
  const level = spellLevel.value;
  if (!Number.isFinite(level) || level <= 0) return;
  const cell = magicStore.spellBook?.spellCells?.[String(level)];
  if (!cell?.id) {
    const toast = await toastController.create({
      message: "Нет ячеек для этого уровня",
      duration: 1500,
      position: "top",
    });
    await toast.present();
    return;
  }
  if ((cell.currentCount ?? 0) <= 0) {
    const toast = await toastController.create({
      message: "Ячейки этого уровня закончились",
      duration: 1500,
      position: "top",
    });
    await toast.present();
    return;
  }
  try {
    const updated = await useSpellCell(cell.id);
    if (magicStore.spellBook) {
      magicStore.setSpellBook({
        ...magicStore.spellBook,
        spellCells: {
          ...(magicStore.spellBook.spellCells ?? {}),
          [String(level)]: updated,
        },
      });
    }
  } catch (e) {
    console.error("Failed to use spell cell:", e);
    const toast = await toastController.create({
      message: "Ошибка использования ячейки",
      duration: 1500,
      position: "top",
      color: "danger",
    });
    await toast.present();
  }
}

function onEdit() {
  if (!props.item?.spell) return;
  const spellData = {
    ...props.item.spell,
    id: props.item.spell.id ?? props.item.spellId,
  };
  magicStore.setEditingSpell(spellData);
  emit("closeSpellInfoModal");
  ionRouter.navigate(
    `/rooms/${route.params.roomId}/characters/${route.params.characterId}/magic/add`,
    "forward",
    "push"
  );
}

function closeModal() {
  emit("closeSpellInfoModal");
}

</script>

<template>
  <ion-modal
    :is-open="props.isOpen"
    @didDismiss="closeModal"
    :can-dismiss="true"
    :expand-to-scroll="false"
    :handle="false"
    :initial-breakpoint="1"
    :breakpoints="[0, 1]"
  >
    <div class="block spell-modal-layout spellbook-theme" v-if="item && spell">
      <div class="sheet-top-zone">
        <div class="sheet-top-zone-handle" aria-hidden="true" />
        <div class="header">
          <div class="header-top">
            <div class="name">
              {{ getSpellName(spell) }}
            </div>
            <div v-if="!props.readonly" class="prepared-buttons">
              <ion-button
                fill="clear"
                size="small"
                class="prepared-button"
                title="Всегда подготовлено"
                @click="toggleAlwaysPrepared"
              >
                <ion-icon :icon="ribbon" :class="{ 'filled-always': item.alwaysPrepared }" />
              </ion-button>
              <ion-button
                fill="clear"
                size="small"
                class="prepared-button"
                title="Подготовить"
                @click="togglePrepared"
              >
                <ion-icon :icon="star" :class="{ filled: item.inUse }" />
              </ion-button>
            </div>
          </div>
          <div class="image-row">
            <div class="image">
              <img
                :src="getSpellImageUrl(spell.imgUrl)"
                class="character-skill-image"
                :alt="getSpellName(spell)"
              />
            </div>
            <div class="subtitle">
              <span class="badge">{{ levelBadgeText }}</span>
              <span class="badge">{{ spell.school || "Без школы" }}</span>
            </div>
          </div>
        </div>
      </div>

      <ion-content class="spell-ion-content" :scroll-y="true">
        <div class="body-block">
          <div class="stats">
            <div class="block-name">{{ isCantrip ? "Заговор" : "Заклинание" }}</div>
            <div class="stats-grid">
              <div class="stat">
                <div class="stat-name">Время каста</div>
                <div class="stat-value">{{ spell.useTime || "—" }}</div>
              </div>
              <div class="stat">
                <div class="stat-name">Дистанция</div>
                <div class="stat-value">{{ spell.distance || "—" }}</div>
              </div>
              <div class="stat">
                <div class="stat-name">Компоненты</div>
                <div class="stat-value">{{ spell.components || "—" }}</div>
              </div>
              <div class="stat stat-duration-right">
                <div class="stat-name">Длительность</div>
                <div class="stat-value">{{ spell.duration || "—" }}</div>
              </div>
            </div>
            <div v-if="spell.materialComponents" class="material-components">
              <div class="stat-name">Материальные компоненты</div>
              <div class="stat-value">{{ spell.materialComponents }}</div>
            </div>
          </div>

          <div class="description">
            <div class="block-name">Описание</div>
            <div
              class="block-value description-html"
              v-html="spell.description || '—'"
            />
          </div>
        </div>
      </ion-content>

      <div class="footer spell-footer-bar">
        <ion-buttons>
          <ion-button
              size="default"
              fill="solid"
              shape="round"
              color="primary"
              @click="closeModal"
          >
            <ion-icon slot="start" :icon="closeCircleOutline" color="dark"/>
            Закрыть
          </ion-button>

          <div v-if="!props.readonly" class="small-buttons">
            <ion-button
                size="small"
                fill="solid"
                shape="round"
                color="tertiary"
                :disabled="!canUseCell"
                @click="useSpell"
            >
              <ion-icon slot="icon-only" :icon="flashOutline" color="dark"/>
            </ion-button>

            <ion-button
                size="small"
                fill="solid"
                shape="round"
                color="danger"
                @click="removeSpell"
            >
              <ion-icon slot="icon-only" :icon="trashOutline" color="dark"/>
            </ion-button>

            <ion-button
                size="small"
                fill="solid"
                shape="round"
                color="secondary"
                @click="onEdit"
            >
              <ion-icon slot="icon-only" :icon="createOutline" color="dark"/>
            </ion-button>
          </div>
        </ion-buttons>
      </div>
    </div>
  </ion-modal>
</template>

<style scoped>
.block {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: min(90vh, 850px);
  max-height: min(90vh, 850px);
  overflow: hidden;
}

.spell-modal-layout {
  min-height: 0;
}

.sheet-top-zone {
  flex-shrink: 0;
}

.sheet-top-zone-handle {
  width: 40px;
  height: 5px;
  border-radius: 999px;
  margin: 10px auto 6px;
  background: rgba(var(--ion-color-light-rgb), 0.28);
}

.body-block {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.spell-ion-content {
  flex: 1;
  min-height: 0;
  --background: transparent;
}

.spell-footer-bar {
  flex-shrink: 0;
  width: 100%;
  margin: 0;
  background: rgba(var(--ion-color-dark-rgb), 0.85);
  border-top: 1px solid rgba(var(--ion-color-primary-rgb), 0.12);
  box-shadow: 0 -6px 16px rgba(var(--ion-color-dark-rgb), 0.35);
}

.name {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--ion-color-light);
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.28);
}

.stats {
  background: linear-gradient(
    180deg,
    rgba(var(--ion-color-medium-rgb), 0.92),
    rgba(var(--ion-color-medium-rgb), 0.82)
  );
  border: none;
  border-radius: 14px;
  padding: 12px;
  margin: 6px 8px 6px;
  box-shadow: 0 10px 24px rgba(var(--ion-color-dark-rgb), 0.45);
  flex: 0 0 auto;
}

.description {
  background: linear-gradient(
    180deg,
    rgba(var(--ion-color-medium-rgb), 0.95),
    rgba(var(--ion-color-medium-rgb), 0.86)
  );
  border: none;
  border-radius: 14px;
  margin: 4px 8px 12px;
  padding: 16px;
  flex: 0 0 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 24px rgba(var(--ion-color-dark-rgb), 0.45);
}

.block-name {
  margin-top: 2px;
  margin-bottom: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  color: rgba(var(--ion-color-primary-rgb), 0.9);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
  width: 100%;
}

.stat {
  display: flex;
  flex-direction: column;
  max-width: none;
}

.stat-duration-right {
  grid-column: 2;
}

.material-components {
  margin-top: 8px;
}

.stat-name {
  color: rgba(var(--ion-color-light-rgb), 0.62);
  font-size: 0.8rem;
  margin-bottom: 3px;
}

.stat-value {
  font-weight: 700;
  color: var(--ion-color-light);
  overflow: auto;
  scrollbar-width: thin;
  max-height: 64px;
  font-size: 0.98rem;
  line-height: 1.25;
}

.header {
  padding: 15px 14px 12px;
  display: flex;
  flex-direction: column;
  border-bottom: none;
  background: linear-gradient(
    180deg,
    rgba(var(--ion-color-medium-rgb), 0.94),
    rgba(var(--ion-color-medium-rgb), 0.86)
  );
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.image-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.image {
  margin-top: 0;
}

.footer {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px));
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
}

.small-buttons {
  display: flex;
  gap: 10px;
}

ion-modal {
  --border-radius: 16px;
  --height: min(90vh, 800px);
  --background:
    linear-gradient(
      180deg,
      rgba(var(--ion-color-medium-rgb), 0.98) 0%,
      rgba(var(--ion-color-dark-rgb), 0.98) 100%
    );
}

.character-skill-image {
  border-radius: 12px;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.35);
  width: 68px;
  height: 68px;
  object-fit: cover;
  box-shadow: 0 8px 18px rgba(var(--ion-color-dark-rgb), 0.55);
}

.prepared-button ion-icon {
  font-size: 1.35rem;
  opacity: 0.72;
  transition: opacity 0.2s ease, transform 0.2s ease, filter 0.2s ease;
}

.prepared-button:hover ion-icon {
  opacity: 1;
  transform: scale(1.05);
}

.filled {
  color: var(--ion-color-warning);
  opacity: 1 !important;
  filter: drop-shadow(0 0 8px rgba(var(--ion-color-warning-rgb), 0.5));
}

.filled-always {
  color: var(--ion-color-tertiary);
  opacity: 1 !important;
  filter: drop-shadow(0 0 8px rgba(var(--ion-color-tertiary-rgb), 0.5));
}

.prepared-buttons {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.block-value {
  display: block;
  line-height: 1.7;
  color: var(--ion-color-light);
  font-size: 0.98rem;
}

.subtitle {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  border-radius: 999px;
  border: none;
  background:
    linear-gradient(
      180deg,
      rgba(var(--ion-color-secondary-rgb), 0.3),
      rgba(var(--ion-color-secondary-rgb), 0.2)
    );
  box-shadow: 0 4px 10px rgba(var(--ion-color-dark-rgb), 0.2);
  font-size: 0.78rem;
  color: rgba(var(--ion-color-light-rgb), 0.96);
}

.prepared-button {
  --color: rgba(var(--ion-color-light-rgb), 0.82);
  --padding-start: 4px;
  --padding-end: 4px;
}

.description-html :deep(p) {
  margin: 0 0 1em;
}

.description-html :deep(p:last-child) {
  margin-bottom: 0;
}

.description-html :deep(ul) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.description-html :deep(li) {
  margin-bottom: 0.35em;
}

.description-html :deep(a) {
  color: var(--ion-color-primary);
  text-decoration: underline;
}

.description-html :deep(detail-tooltip) {
  display: inline;
}

.spellbook-theme {
  position: relative;
  border: none;
  border-radius: 16px;
  overflow: hidden;
}

.spellbook-theme::before {
  content: none;
}

.small-buttons ion-button[color="danger"] {
  --background: rgba(var(--ion-color-danger-rgb), 0.78);
}

@media (max-width: 520px) {
  .small-buttons {
    margin-left: 8px;
  }
}

</style>
