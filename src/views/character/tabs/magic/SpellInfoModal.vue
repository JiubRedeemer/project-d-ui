<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonIcon,
  IonModal,
  toastController,
} from "@ionic/vue";
import { closeCircleOutline, createOutline, flashOutline, star, trashOutline } from "ionicons/icons";

import { computed } from "vue";
import { useRoute } from "vue-router";
import { useIonRouter } from "@ionic/vue";
import { deleteSpellBookItem, setSpellInUse, useSpellCell } from "@/api/magicApi";
import type { SpellBookItemDto, SpellDto } from "@/components/models/response/MagicApi";
import { FILE_STORAGE_INTEGRATION_ROUTES, SPELL_IMAGE_PLACEHOLDER } from "@/config/integrationRoutes";
import { useMagicStore } from "@/stores/MagicStore";

const props = defineProps<{
  isOpen: boolean;
  item: SpellBookItemDto | null;
  spellBookId: string | null;
}>();

const emit = defineEmits<{ (e: "closeSpellInfoModal"): void }>();

const magicStore = useMagicStore();
const route = useRoute();
const ionRouter = useIonRouter();

const spell = computed(() => props.item?.spell);
const spellLevel = computed(() => Number(spell.value?.level ?? 0));
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
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
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
    :initial-breakpoint="1"
    :breakpoints="[0, 1]"
  >
    <div class="block" v-if="item && spell">
      <div class="header">
        <div class="name">
          {{ getSpellName(spell) }}
        </div>
        <div class="image-row">
          <div class="image">
            <img
              :src="getSpellImageUrl(spell.imgUrl)"
              class="character-skill-image"
              :alt="getSpellName(spell)"
            />
          </div>
          <ion-button fill="clear" size="small" @click="togglePrepared">
            <ion-icon :icon="star" :class="{ filled: item.inUse }"/>
          </ion-button>
        </div>
      </div>

      <div class="body-block">
        <div class="stats">
          <div class="block-name">Заклинание</div>
          <div class="stats-grid">
            <div class="stat">
              <div class="stat-name">Уровень и школа</div>
              <div class="stat-value">
                {{ spell.level != null ? spell.level + " уровень" : "—" }}{{ spell.school ? ", " + spell.school : "" }}
              </div>
            </div>
            <div class="stat">
              <div class="stat-name">Время каста</div>
              <div class="stat-value">{{ spell.useTime || "—" }}</div>
            </div>
            <div class="stat">
              <div class="stat-name">Дистанция</div>
              <div class="stat-value">{{ spell.distance || "—" }}</div>
            </div>
            <div class="stat">
              <div class="stat-name">Длительность</div>
              <div class="stat-value">{{ spell.duration || "—" }}</div>
            </div>
            <div class="stat stat-full">
              <div class="stat-name">Компоненты</div>
              <div class="stat-value">{{ spell.components || "—" }}</div>
              <div class="stat-value">{{ spell.materialComponents || "" }}</div>
            </div>
          </div>
        </div>

        <div class="description">
          <div class="block-name">Описание</div>
          <div class="description-content">
            <div
              class="block-value description-html"
              v-html="spell.description || '—'"
            />
          </div>
        </div>
      </div>

      <div class="footer">
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

          <div class="small-buttons">
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
}

.name {
  font-size: 1.2rem;
  font-weight: 600;
}

.stats {
  background: var(--ion-color-medium);
  border-radius: 10px;
  padding: 10px;
  margin: 5px 5px 10px;
}

.description {
  background: var(--ion-color-medium);
  border-radius: 10px;
  margin: 5px;
  padding: 10px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.description-content {
  max-height: 150px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.block-name {
  margin-top: 10px;
  margin-bottom: 15px;
  font-weight: 500;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 5%;
  width: 100%;
}

.stat {
  display: flex;
  flex-direction: column;
  max-width: 170px;
}

.stat-full {
  max-width: none;
  grid-column: 1 / -1;
}

.stat-name {
  color: var(--ion-color-light);
  opacity: 60%;
}

.stat-value {
  font-weight: 500;
  color: white;
  overflow: scroll;
  max-height: 100px;
}

.header {
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.image-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.image {
  margin-top: 0;
}

.footer {
  display: flex;
  justify-content: center;
  margin: 10px 0;
}

.small-buttons {
  margin: 0 20px;
}

ion-modal {
  --border-radius: 10px;
  --height: auto;
  --background: var(--ion-color-medium-shade);
}

.character-skill-image {
  border-radius: 10px;
  border: 1px solid var(--ion-color-primary);
  width: 55px;
  height: 55px;
  object-fit: cover;
}

.filled {
  color: var(--ion-color-primary);
}

.block-value {
  display: block;
  line-height: 1.5;
  color: white;
}

.description-html :deep(p) {
  margin: 0 0 0.75em;
}

.description-html :deep(p:last-child) {
  margin-bottom: 0;
}

.description-html :deep(ul) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.description-html :deep(li) {
  margin-bottom: 0.25em;
}

.description-html :deep(a) {
  color: var(--ion-color-primary);
  text-decoration: underline;
}

.description-html :deep(detail-tooltip) {
  display: inline;
}
</style>
