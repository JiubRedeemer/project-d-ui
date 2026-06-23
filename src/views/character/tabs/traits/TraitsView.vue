<script setup lang="ts">
import {useCharacterStore} from "@/stores/CharacterStore";
import {addOutline, reorderThreeOutline, trashOutline} from "ionicons/icons";
import {IonButton, IonIcon, toastController} from "@ionic/vue";
import {computed, ref} from "vue";
import CreateTraitModal from "./CreateTraitModal.vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";

const characterStore = useCharacterStore();
const showCreateTraitModal = ref(false);
const route = useRoute();

function openCreateTraitModal() { showCreateTraitModal.value = true; }
function closeCreateTraitModal() { showCreateTraitModal.value = false; }

function getPassiveByWis() {
  const wis = Math.floor((characterStore.character.abilities.filter(a => a.code === "WIS")[0].value + characterStore.character.abilities.filter(a => a.code === "WIS")[0].bonusValue - 10) / 2);
  return 10 + wis;
}
function getPassiveByInt() {
  const int = Math.floor((characterStore.character.abilities.filter(a => a.code === "INT")[0].value + characterStore.character.abilities.filter(a => a.code === "INT")[0].bonusValue - 10) / 2);
  return 10 + int;
}

// ── Order persistence ─────────────────────────────────────────────────────

type Group = 'race' | 'bg' | 'custom';

function orderKey(group: Group) {
  return `traitOrder_${characterStore.character.id}_${group}`;
}
function loadOrder(group: Group): string[] {
  try { return JSON.parse(localStorage.getItem(orderKey(group)) ?? '[]'); } catch { return []; }
}
function saveOrder(group: Group, keys: string[]) {
  localStorage.setItem(orderKey(group), JSON.stringify(keys));
}
function applyOrder<T>(items: T[], getKey: (t: T) => string, saved: string[]): T[] {
  if (!saved.length) return items;
  const map = new Map(items.map(t => [getKey(t), t]));
  const out: T[] = [];
  for (const k of saved) { const t = map.get(k); if (t) { out.push(t); map.delete(k); } }
  for (const t of map.values()) out.push(t);
  return out;
}
function defaultSort<T extends { description?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.description?.length && b.description?.length) return a.description.length - b.description.length;
    if (a.description?.length) return 1;
    if (b.description?.length) return -1;
    return 0;
  });
}

// ── Ordered reactive lists ────────────────────────────────────────────────

const raceTraits = computed(() => {
  const raw = characterStore.character.raceInfo?.traits;
  if (!raw?.length) return [];
  const saved = loadOrder('race');
  return saved.length ? applyOrder(raw, t => t.name, saved) : defaultSort(raw);
});
const bgTraits = computed(() => {
  const raw = characterStore.character.backgroundInfo?.stats?.traits;
  if (!raw?.length) return [];
  const saved = loadOrder('bg');
  return saved.length ? applyOrder(raw, t => t.name, saved) : defaultSort(raw);
});
const customTraits = computed(() => {
  const raw = characterStore.character?.traits;
  if (!raw?.length) return [];
  const saved = loadOrder('custom');
  return saved.length ? applyOrder(raw, t => t.id, saved) : defaultSort(raw);
});

function commitReorder(group: Group, from: number, to: number) {
  if (from === to) return;
  if (group === 'race') {
    const list = [...raceTraits.value];
    list.splice(to, 0, list.splice(from, 1)[0]);
    saveOrder('race', list.map(t => t.name));
    characterStore.character.raceInfo!.traits = list;
  } else if (group === 'bg') {
    const list = [...bgTraits.value];
    list.splice(to, 0, list.splice(from, 1)[0]);
    saveOrder('bg', list.map(t => t.name));
    characterStore.character.backgroundInfo!.stats!.traits = list;
  } else {
    const list = [...customTraits.value];
    list.splice(to, 0, list.splice(from, 1)[0]);
    saveOrder('custom', list.map(t => t.id));
    characterStore.character.traits = list;
  }
}

// ── Drag state ────────────────────────────────────────────────────────────

const dragGroup = ref<Group | null>(null);
const dragFromIndex = ref(-1);
const dragOverIndex = ref(-1);

// ghost DOM node shown under finger/cursor
let ghostEl: HTMLElement | null = null;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let isDragging = false;
let activePointerId = -1;
let ghostOffsetY = 0;

function listForGroup(group: Group) {
  if (group === 'race') return raceTraits.value;
  if (group === 'bg') return bgTraits.value;
  return customTraits.value;
}

function createGhost(card: HTMLElement, clientY: number) {
  const rect = card.getBoundingClientRect();
  ghostOffsetY = clientY - rect.top;

  ghostEl = card.cloneNode(true) as HTMLElement;
  ghostEl.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${clientY - ghostOffsetY}px;
    width: ${rect.width}px;
    z-index: 9999;
    pointer-events: none;
    border-radius: 16px;
    box-shadow: 0 24px 48px rgba(0,0,0,0.55);
    opacity: 0.92;
    transform: scale(1.03);
    transition: transform 0.15s ease;
  `;
  document.body.appendChild(ghostEl);
}

function moveGhost(clientY: number) {
  if (!ghostEl) return;
  ghostEl.style.top = `${clientY - ghostOffsetY}px`;
}

function removeGhost() {
  ghostEl?.remove();
  ghostEl = null;
}

function findCardIndexAtPoint(group: Group, x: number, y: number): number {
  // temporarily hide ghost so elementFromPoint hits the actual card
  if (ghostEl) ghostEl.style.display = 'none';
  const el = document.elementFromPoint(x, y);
  if (ghostEl) ghostEl.style.display = '';

  const card = el?.closest('[data-drag-index]') as HTMLElement | null;
  if (!card) return dragOverIndex.value;
  const cardGroup = card.dataset.dragGroup as Group;
  if (cardGroup !== group) return dragOverIndex.value;
  return Number(card.dataset.dragIndex);
}

function startDrag(group: Group, index: number, card: HTMLElement, clientY: number) {
  isDragging = true;
  dragGroup.value = group;
  dragFromIndex.value = index;
  dragOverIndex.value = index;
  createGhost(card, clientY);
  navigator.vibrate?.(40);
}

function endDrag() {
  if (isDragging && dragGroup.value !== null && dragFromIndex.value !== dragOverIndex.value) {
    commitReorder(dragGroup.value, dragFromIndex.value, dragOverIndex.value);
  }
  isDragging = false;
  dragGroup.value = null;
  dragFromIndex.value = -1;
  dragOverIndex.value = -1;
  activePointerId = -1;
  removeGhost();
}

// ── Pointer event handlers (attached to drag handle) ─────────────────────

function onHandlePointerDown(e: PointerEvent, group: Group, index: number) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;

  const handle = e.currentTarget as HTMLElement;
  const card = handle.closest('[data-drag-index]') as HTMLElement;

  longPressTimer = setTimeout(() => {
    activePointerId = e.pointerId;
    handle.setPointerCapture(e.pointerId);
    startDrag(group, index, card, e.clientY);
  }, e.pointerType === 'touch' ? 350 : 0);
}

function onHandlePointerMove(e: PointerEvent, group: Group) {
  if (!isDragging || e.pointerId !== activePointerId) return;
  e.preventDefault();
  moveGhost(e.clientY);
  const idx = findCardIndexAtPoint(group, e.clientX, e.clientY);
  if (idx !== -1) dragOverIndex.value = idx;
}

function onHandlePointerUp(e: PointerEvent) {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  if (!isDragging || e.pointerId !== activePointerId) return;
  endDrag();
}

function onHandlePointerCancel(e: PointerEvent) {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  if (e.pointerId !== activePointerId) return;
  isDragging = false;
  dragGroup.value = null;
  dragFromIndex.value = -1;
  dragOverIndex.value = -1;
  activePointerId = -1;
  removeGhost();
}

// ── Delete ────────────────────────────────────────────────────────────────

async function deleteTrait(traitId: string) {
  const roomId = String(route.params.roomId);
  const characterId = String(route.params.characterId);
  try {
    await axios.delete(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterId}/traits/${encodeURIComponent(traitId)}`,
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
    );
    await characterStore.updateCharacterInStoreById(roomId, characterId);
    const toast = await toastController.create({ message: "Владение удалено", duration: 1500, position: "top", color: "success" });
    await toast.present();
  } catch (error) {
    console.error("Ошибка при удалении владения:", error);
    const toast = await toastController.create({ message: "Ошибка при удалении владения", duration: 2000, position: "top", color: "danger" });
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

    <template v-if="raceTraits.length">
      <h3 class="section-heading section-heading--race">Владения вида</h3>
      <div class="traits-list">
        <div
            v-for="(trait, index) in raceTraits"
            :key="trait.name"
            class="trait-card trait-card--race"
            :class="{
              'is-dragging': dragGroup === 'race' && dragFromIndex === index,
              'is-drag-over': dragGroup === 'race' && dragOverIndex === index && dragFromIndex !== index,
            }"
            :data-drag-group="'race'"
            :data-drag-index="index"
        >
          <div class="trait-card__header">
            <div class="trait-card__name">{{ trait.name }}</div>
            <div
                class="drag-handle"
                @pointerdown="onHandlePointerDown($event, 'race', index)"
                @pointermove="onHandlePointerMove($event, 'race')"
                @pointerup="onHandlePointerUp($event)"
                @pointercancel="onHandlePointerCancel($event)"
            >
              <ion-icon :icon="reorderThreeOutline"/>
            </div>
          </div>
          <div class="trait-card__desc" v-if="trait.description">{{ trait.description }}</div>
        </div>
      </div>
    </template>

    <template v-if="bgTraits.length">
      <h3 class="section-heading section-heading--bg">Владения предыстории</h3>
      <div class="traits-list">
        <div
            v-for="(trait, index) in bgTraits"
            :key="trait.name"
            class="trait-card trait-card--bg"
            :class="{
              'is-dragging': dragGroup === 'bg' && dragFromIndex === index,
              'is-drag-over': dragGroup === 'bg' && dragOverIndex === index && dragFromIndex !== index,
            }"
            :data-drag-group="'bg'"
            :data-drag-index="index"
        >
          <div class="trait-card__header">
            <div class="trait-card__name">{{ trait.name }}</div>
            <div
                class="drag-handle"
                @pointerdown="onHandlePointerDown($event, 'bg', index)"
                @pointermove="onHandlePointerMove($event, 'bg')"
                @pointerup="onHandlePointerUp($event)"
                @pointercancel="onHandlePointerCancel($event)"
            >
              <ion-icon :icon="reorderThreeOutline"/>
            </div>
          </div>
          <div class="trait-card__desc" v-if="trait.description">{{ trait.description }}</div>
        </div>
      </div>
    </template>

    <template v-if="customTraits.length">
      <h3 class="section-heading section-heading--custom">Пользовательские владения</h3>
      <div class="traits-list">
        <div
            v-for="(trait, index) in customTraits"
            :key="trait.id"
            class="trait-card trait-card--custom"
            :class="{
              'is-dragging': dragGroup === 'custom' && dragFromIndex === index,
              'is-drag-over': dragGroup === 'custom' && dragOverIndex === index && dragFromIndex !== index,
            }"
            :data-drag-group="'custom'"
            :data-drag-index="index"
        >
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
            <div
                class="drag-handle"
                @pointerdown="onHandlePointerDown($event, 'custom', index)"
                @pointermove="onHandlePointerMove($event, 'custom')"
                @pointerup="onHandlePointerUp($event)"
                @pointercancel="onHandlePointerCancel($event)"
            >
              <ion-icon :icon="reorderThreeOutline"/>
            </div>
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

.section-heading:first-child { margin-top: 0; }

.section-heading::before {
  content: "";
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: var(--accent, var(--ion-color-primary));
}

.section-heading--passive,
.section-heading--race { --accent: var(--ion-color-primary); }
.section-heading--bg   { --accent: var(--ion-color-tertiary); }
.section-heading--custom { --accent: var(--ion-color-secondary-tint); }

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
  .traits-list { grid-template-columns: repeat(2, 1fr); }
}

.trait-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  border-left: 3px solid var(--accent, var(--ion-color-primary));
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.92) 100%);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.15s ease;
  user-select: none;
  -webkit-user-select: none;
}

.trait-card:hover {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
}

.trait-card.is-dragging {
  opacity: 0.35;
  box-shadow: none;
}

.trait-card.is-drag-over {
  border-color: rgba(var(--ion-color-light-rgb), 0.35);
  box-shadow: 0 0 0 2px var(--accent, var(--ion-color-primary)), 0 12px 28px rgba(0,0,0,0.4);
}

.trait-card--race   { --accent: var(--ion-color-primary); }
.trait-card--bg     { --accent: var(--ion-color-tertiary); }
.trait-card--custom { --accent: var(--ion-color-secondary-tint); }

/* Drag handle */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  cursor: grab;
  touch-action: none;
  color: rgba(var(--ion-color-light-rgb), 0.35);
  font-size: 20px;
  transition: color 0.15s ease;
}

.drag-handle:active,
.drag-handle:hover {
  color: rgba(var(--ion-color-light-rgb), 0.7);
  cursor: grabbing;
}

/* Card header */
.trait-card__header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.trait-card__name {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.trait-card__desc {
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.55;
  color: rgba(var(--ion-color-light-rgb), 0.74);
  white-space: pre-wrap;
}

.trait-card__delete {
  flex-shrink: 0;
  margin: 0;
  --padding-start: 6px;
  --padding-end: 6px;
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
