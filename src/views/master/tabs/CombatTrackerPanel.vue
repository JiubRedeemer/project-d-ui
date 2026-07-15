<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { IonIcon } from '@ionic/vue';
import {
  addOutline,
  closeOutline,
  chevronForwardOutline,
  chevronBackOutline,
  playOutline,
  stopOutline,
  trashOutline,
  heartOutline,
  optionsOutline,
  shieldOutline,
  personOutline,
  skullOutline,
  flashOutline,
  openOutline,
} from 'ionicons/icons';
import { useRoute } from 'vue-router';
import { useIonRouter } from '@ionic/vue';
import { useRoomStore } from '@/stores/RoomStore';
import type { CombatStateDto, CombatParticipantDto } from '@/api/combatApi.types';
import type { NpcDto } from '@/api/npcApi.types';
import type { Character } from '@/components/models/response/Character';
import {
  createCombatSession,
  getActiveCombatSession,
  endCombatSession,
  addCombatParticipant,
  removeCombatParticipant,
  startCombat,
  setCombatInitiative,
  nextCombatTurn,
  prevCombatTurn,
  updateParticipantHp,
  updateParticipantStats,
} from '@/api/combatApi';
import { useCombatWebSocket } from '@/composables/useCombatWebSocket';
import { useRoomCharactersWebSocket } from '@/composables/useCharacterWebSocket';
import { getNpcsByRoomIdForRoom } from '@/api/npcApi';
import { loadRoomSpellMap } from '@/api/magicApi';
import type { SpellDto } from '@/components/models/response/MagicApi';
import { getStatesForRoom, saveCharacterState, deleteCharacterState } from '@/api/statesApi';
import type { StateDto } from '@/api/statesApi.types';
import { getCharacterAvatarUrl, CHARACTER_AVATAR_PLACEHOLDER } from '@/utils/characterAvatar';
import { FILE_STORAGE_INTEGRATION_ROUTES } from '@/config/integrationRoutes';

const props = defineProps<{ roomId: string }>();
const emit = defineEmits<{ close: [] }>();

const route = useRoute();
const roomStore = useRoomStore();

const combat = ref<CombatStateDto | null>(null);
const loading = ref(false);
const startingFight = ref(false);
const npcs = ref<NpcDto[]>([]);
const spellById = ref<Map<string, SpellDto>>(new Map());
const showNpcPicker = ref(false);
const showActiveNpcPicker = ref(false);
const npcCopyCount = ref(1);
const pickedNpcId = ref<string | null>(null);
const pickedNpcMaxHp = ref<number | null>(null);
const pickedNpcAc = ref<number | null>(null);
// per-copy stat editing in prepare phase: { [participantId]: { hp, maxHp, ac } }
const editingStats = ref<Record<string, { hp: string; maxHp: string; ac: string }>>({});
const editingHpParticipantId = ref<string | null>(null);
const editingHpValue = ref('');
// NPC HP management during active combat: { [participantId]: { delta: string, mode: 'dmg'|'heal'|'set' } }
const hpManage = ref<Record<string, { delta: string }>>({});
// npcInitiativeInputs: keyed by participantId, holds the typed string value
const npcInitiativeInputs = ref<Record<string, string>>({});

const participants = computed(() => combat.value?.participants ?? []);
const isActive = computed(() => combat.value?.state === 'ACTIVE');
const isPreparing = computed(() => combat.value?.state === 'PREPARING');
const currentTurn = computed(() => participants.value.find(p => p.isCurrentTurn));

// Mutation guard: prevents WS-triggered loadCombat from overwriting newer write results
let pendingWrites = 0;
let needsRefreshAfterWrite = false;

async function loadCombat() {
  try {
    combat.value = await getActiveCombatSession(props.roomId);
  } catch (e) {
    console.error('[CombatTracker] loadCombat error', e);
  }
}

async function onWsEvent() {
  if (pendingWrites > 0) {
    needsRefreshAfterWrite = true;
    return;
  }
  await loadCombat();
}

async function withMutation(fn: () => Promise<CombatStateDto | null | void>): Promise<void> {
  pendingWrites++;
  try {
    const result = await fn();
    if (result != null) combat.value = result as CombatStateDto;
  } finally {
    pendingWrites--;
    if (pendingWrites === 0 && needsRefreshAfterWrite) {
      needsRefreshAfterWrite = false;
      await loadCombat();
    }
  }
}

async function createSession() {
  loading.value = true;
  try {
    await withMutation(() => createCombatSession(props.roomId));
  } finally {
    loading.value = false;
  }
}

async function endSession() {
  if (!combat.value) return;
  await endCombatSession(props.roomId, combat.value.sessionId);
  combat.value = null;
}

async function addCharacter(ch: Character) {
  if (!combat.value) return;
  await withMutation(() => addCombatParticipant(props.roomId, combat.value!.sessionId, {
    participantType: 'CHARACTER',
    referenceId: ch.id,
    displayName: ch.name,
  }));
}

function resolveNpcDisplayName(baseName: string, index: number, totalAdding: number): string {
  const escaped = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Numbers already occupied by existing participants with this base name
  const occupied = new Set<number>();
  for (const p of participants.value) {
    if (p.displayName === baseName) occupied.add(0);
    const m = p.displayName.match(new RegExp(`^${escaped} #(\\d+)$`));
    if (m) occupied.add(Number(m[1]));
  }
  // If no duplicates exist and adding only 1 — keep plain name
  if (occupied.size === 0 && totalAdding === 1) return baseName;
  // Find the (index+1)-th free positive slot, reserving earlier ones for this batch
  let slot = 1;
  let found = 0;
  while (true) {
    if (!occupied.has(slot)) {
      found++;
      if (found === index + 1) return `${baseName} #${slot}`;
      occupied.add(slot); // reserve for earlier copies in this batch
    }
    slot++;
  }
}

async function addNpc() {
  if (!combat.value || !pickedNpcId.value) return;
  const npc = npcs.value.find(n => n.id === pickedNpcId.value);
  const baseName = npc?.name ?? 'NPC';
  const npcId = pickedNpcId.value;
  const copies = npcCopyCount.value;
  const maxHp = pickedNpcMaxHp.value;
  const ac = pickedNpcAc.value;
  pickedNpcId.value = null;
  pickedNpcMaxHp.value = null;
  pickedNpcAc.value = null;
  npcCopyCount.value = 1;
  showNpcPicker.value = false;
  showActiveNpcPicker.value = false;
  for (let i = 0; i < copies; i++) {
    const displayName = resolveNpcDisplayName(baseName, i, copies);
    await withMutation(() => addCombatParticipant(props.roomId, combat.value!.sessionId, {
      participantType: 'NPC',
      referenceId: npcId,
      displayName,
      copyCount: 1,
      maxHp: maxHp,
      currentHp: maxHp,
      armoryClassOverride: ac,
    }));
  }
}

async function removeParticipant(id: string) {
  if (!combat.value) return;
  await withMutation(() => removeCombatParticipant(props.roomId, combat.value!.sessionId, id));
}

async function startFight() {
  if (!combat.value || startingFight.value) return;
  startingFight.value = true;
  try {
    await withMutation(() => startCombat(props.roomId, combat.value!.sessionId));
  } catch (e) {
    console.error('[CombatTracker] startFight error', e);
    await loadCombat();
  } finally {
    startingFight.value = false;
  }
}

async function setInitiativeForParticipant(participantId: string, value: number) {
  if (!combat.value) return;
  try {
    await withMutation(() => setCombatInitiative(props.roomId, combat.value!.sessionId, participantId, value));
  } catch (e) {
    console.error('[CombatTracker] setInitiative error', e);
    await loadCombat();
  }
}

async function doNextTurn() {
  if (!combat.value) return;
  await withMutation(() => nextCombatTurn(props.roomId, combat.value!.sessionId));
}

async function doPrevTurn() {
  if (!combat.value) return;
  await withMutation(() => prevCombatTurn(props.roomId, combat.value!.sessionId));
}

function openHpEdit(p: CombatParticipantDto) {
  editingHpParticipantId.value = p.id;
  editingHpValue.value = String(p.currentHp ?? 0);
}

async function saveHp() {
  if (!combat.value || !editingHpParticipantId.value) return;
  const p = participants.value.find(x => x.id === editingHpParticipantId.value);
  const newHp = parseInt(editingHpValue.value);
  if (isNaN(newHp)) return;
  const pId = editingHpParticipantId.value;
  editingHpParticipantId.value = null;
  await withMutation(() => updateParticipantHp(props.roomId, combat.value!.sessionId, pId, newHp, p?.maxHp ?? undefined));
}

function toggleHpManage(p: CombatParticipantDto) {
  if (hpManage.value[p.id]) {
    delete hpManage.value[p.id];
  } else {
    hpManage.value[p.id] = { delta: '' };
  }
}

async function applyHpDelta(p: CombatParticipantDto, sign: 1 | -1) {
  if (!combat.value) return;
  const delta = parseInt(hpManage.value[p.id]?.delta ?? '');
  if (isNaN(delta) || delta <= 0) return;
  const newHp = Math.max(0, Math.min(p.maxHp ?? Infinity, (p.currentHp ?? 0) + sign * delta));
  hpManage.value[p.id] = { delta: '' };
  await withMutation(() => updateParticipantHp(props.roomId, combat.value!.sessionId, p.id, newHp, p.maxHp ?? undefined));
}

async function setExactHp(p: CombatParticipantDto) {
  if (!combat.value) return;
  const val = parseInt(hpManage.value[p.id]?.delta ?? '');
  if (isNaN(val)) return;
  const newHp = Math.max(0, val);
  hpManage.value[p.id] = { delta: '' };
  await withMutation(() => updateParticipantHp(props.roomId, combat.value!.sessionId, p.id, newHp, p.maxHp ?? undefined));
}

const alreadyAddedCharacterIds = computed(() =>
  participants.value.filter(p => p.participantType === 'CHARACTER').map(p => p.referenceId)
);

function hpPercent(p: CombatParticipantDto): number {
  if (!p.maxHp || p.maxHp === 0) return 100;
  return Math.max(0, Math.min(100, ((p.currentHp ?? 0) / p.maxHp) * 100));
}

function hpBarColor(pct: number): string {
  if (pct > 60) return '#4ade80';
  if (pct > 30) return '#facc15';
  return '#f87171';
}

const NPC_TYPE_LABELS: Record<string, string> = {
  RATIONAL: 'Разумный',
  BEAST: 'Зверь',
  MONSTER: 'Монстр',
  DEITY: 'Божество',
  UNDEAD: 'Нежить',
};
function npcTypeLabel(type: string | null | undefined): string {
  return type ? (NPC_TYPE_LABELS[type] ?? type) : '';
}

function isDying(p: CombatParticipantDto): boolean {
  return (p.currentHp ?? 1) <= 0;
}

// WebSocket
let wsClient: ReturnType<typeof useCombatWebSocket> | null = null;
let charWsClient: ReturnType<typeof useRoomCharactersWebSocket> | null = null;

const ionRouter = useIonRouter();

function goToNpcCard(npcId?: string | null) {
  if (!npcId) return;
  ionRouter.navigate(`/rooms/${props.roomId}/npcs/${npcId}/full`, 'forward', 'push');
}

const SAVE_LABELS: Record<string, string> = {
  STR: 'Сила', DEX: 'Ловкость', CON: 'Телосложение',
  INT: 'Интеллект', WIS: 'Мудрость', CHA: 'Харизма',
};
const DAMAGE_LABELS: Record<string, string> = {
  STABBING: 'Колющий', CHOPPING: 'Рубящий', CRUSHING: 'Дробящий',
  ACID: 'Кислота', COLD: 'Холод', FIRE: 'Огонь', FORCE: 'Силовое',
  LIGHTNING: 'Электричество', NECROTIC: 'Некротический', POISON: 'Яд',
  PSYCHIC: 'Психический', RADIANT: 'Сияющий', THUNDER: 'Гром',
};
function saveLabel(code: string): string { return SAVE_LABELS[code] ?? code; }
function damageLabel(code: string): string { return DAMAGE_LABELS[code] ?? code; }

function spellNameOf(dto?: SpellDto): string {
  const n = dto?.name as Record<string, string> | undefined;
  return n?.rus ?? n?.en ?? n?.eng ?? '';
}

// Заклинания NPC хранятся ссылкой (spellId) — разрешаем детали по каталогу комнаты.
function npcSpellsResolved(npc: NpcDto): Array<{ name: string; level: number; chargesPerDay: number | null }> {
  return (npc.spells ?? [])
    .map((s) => {
      const ref = s.spellId ? spellById.value.get(s.spellId) : undefined;
      return {
        name: ref ? (spellNameOf(ref) || s.name || '—') : (s.name ?? 'Заклинание'),
        level: Number((ref?.level ?? s.level) ?? 0) || 0,
        chargesPerDay: s.chargesPerDay ?? null,
      };
    })
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ru'));
}

onMounted(async () => {
  await loadCombat();
  try {
    const [fetchedNpcs, fetchedStates] = await Promise.all([
      getNpcsByRoomIdForRoom(props.roomId),
      getStatesForRoom(props.roomId),
    ]);
    npcs.value = fetchedNpcs ?? [];
    roomStates.value = fetchedStates ?? [];
    if (npcs.value.some((n) => n.spells?.length)) {
      if (!roomStore.room?.id || roomStore.room.id !== props.roomId) {
        await roomStore.getRoomInfo(props.roomId);
      }
      spellById.value = await loadRoomSpellMap(roomStore.room?.baseRuleType);
    }
  } catch {}
  wsClient = useCombatWebSocket(props.roomId, onWsEvent);
  charWsClient = useRoomCharactersWebSocket(props.roomId, () => onWsEvent());
});

onUnmounted(() => {
  wsClient?.deactivate();
  charWsClient?.deactivate();
});

function openStatEdit(p: CombatParticipantDto) {
  editingStats.value[p.id] = {
    hp: String(p.currentHp ?? p.maxHp ?? ''),
    maxHp: String(p.maxHp ?? ''),
    ac: String(p.armoryClass ?? ''),
  };
}

async function saveStatEdit(participantId: string) {
  if (!combat.value) return;
  const e = editingStats.value[participantId];
  if (!e) return;
  const hp = parseInt(e.hp);
  const maxHp = parseInt(e.maxHp);
  const ac = parseInt(e.ac);
  await withMutation(() => updateParticipantStats(props.roomId, combat.value!.sessionId, {
    participantId,
    currentHp: Number.isFinite(hp) ? hp : undefined,
    maxHp: Number.isFinite(maxHp) ? maxHp : undefined,
    armoryClass: Number.isFinite(ac) ? ac : undefined,
  }));
  delete editingStats.value[participantId];
}

async function submitNpcInitiative(participantId: string) {
  const raw = npcInitiativeInputs.value[participantId];
  const val = parseInt(raw ?? '');
  if (isNaN(val)) return;
  await setInitiativeForParticipant(participantId, Math.max(1, val));
  delete npcInitiativeInputs.value[participantId];
}

function rollForParticipant(p: CombatParticipantDto): number {
  const d20 = Math.floor(Math.random() * 20) + 1;
  const dex = p.abilities?.find(a => a.code === 'DEX')?.value ?? 10;
  const mod = Math.floor((dex - 10) / 2);
  return Math.max(1, d20 + mod);
}

function rerollNpcInitiative(p: CombatParticipantDto) {
  npcInitiativeInputs.value[p.id] = String(rollForParticipant(p));
}

// Auto-roll initiative for NPCs that don't have it yet when combat goes ACTIVE
watch(
  () => participants.value.filter(p => p.participantType === 'NPC' && !p.isReady),
  (notReady) => {
    if (!isActive.value) return;
    for (const p of notReady) {
      if (npcInitiativeInputs.value[p.id] == null) {
        npcInitiativeInputs.value[p.id] = String(rollForParticipant(p));
      }
    }
  },
  { immediate: true }
);

const pickedNpc = computed(() => {
  const npc = npcs.value.find(n => n.id === pickedNpcId.value);
  if (npc) {
    if (pickedNpcMaxHp.value === null && npc.maxHp) pickedNpcMaxHp.value = npc.maxHp;
    if (pickedNpcAc.value === null && npc.armoryClass) pickedNpcAc.value = parseInt(npc.armoryClass) || null;
  }
  return npc;
});

const npcHpRequired = computed(() => {
  const npc = pickedNpc.value;
  if (!npc) return false;
  return !npc.hpDiceCount || !npc.hpDieSize;
});

const canAddNpc = computed(() => {
  if (!pickedNpcId.value) return false;
  if (npcHpRequired.value && !pickedNpcMaxHp.value) return false;
  return true;
});

const expandedAbilities = ref<Record<string, boolean>>({});
function toggleAbilities(id: string) {
  expandedAbilities.value[id] = !expandedAbilities.value[id];
}

// ─── States management ───
const roomStates = ref<StateDto[]>([]);
const expandedStates = ref<Record<string, boolean>>({});
const pendingStateCode = ref<Record<string, string>>({});

function stateLabel(code: string): string {
  return roomStates.value.find(s => s.code === code)?.name ?? code;
}
function stateDesc(code: string): string | null {
  return roomStates.value.find(s => s.code === code)?.description ?? null;
}
function availableStatesToAdd(p: CombatParticipantDto): StateDto[] {
  const active = new Set(p.states ?? []);
  return roomStates.value.filter(s => s.code && !active.has(s.code));
}
function toggleStates(id: string) {
  expandedStates.value[id] = !expandedStates.value[id];
}

async function doAddState(p: CombatParticipantDto) {
  if (p.participantType !== 'CHARACTER' || !p.referenceId) return;
  const code = pendingStateCode.value[p.id];
  if (!code) return;
  pendingStateCode.value[p.id] = '';
  try {
    const saved = await saveCharacterState(props.roomId, p.referenceId, {
      characterId: p.referenceId,
      stateCode: code,
    });
    // Optimistic: patch roomStore so label is available immediately
    const ch = roomStore.characters.find(c => c.id === p.referenceId);
    if (ch) {
      if (!ch.states) ch.states = [];
      ch.states.push(saved);
    }
    // WS will sync the combat state
  } catch (e) {
    console.error('[CombatTracker] addState error', e);
  }
}

async function doRemoveState(p: CombatParticipantDto, code: string) {
  if (p.participantType !== 'CHARACTER' || !p.referenceId) return;
  const ch = roomStore.characters.find(c => c.id === p.referenceId);
  const stateEntry = ch?.states?.find(s => s.stateCode === code);
  if (!stateEntry?.id) return;
  try {
    await deleteCharacterState(props.roomId, p.referenceId, stateEntry.id);
    if (ch) ch.states = ch.states.filter(s => s.id !== stateEntry.id);
  } catch (e) {
    console.error('[CombatTracker] removeState error', e);
  }
}

function participantInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

function participantAvatarUrl(p: CombatParticipantDto): string {
  if (p.participantType === 'CHARACTER' && p.referenceId) {
    const ch = roomStore.characters.find(c => c.id === p.referenceId);
    if (ch) return getCharacterAvatarUrl(ch);
  }
  if (p.participantType === 'NPC' && p.referenceId) {
    const npc = npcs.value.find(n => n.id === p.referenceId);
    if (npc?.imgUrl) {
      return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${npc.imgUrl}`;
    }
  }
  return CHARACTER_AVATAR_PLACEHOLDER;
}
</script>

<template>
  <div class="combat-panel">

    <!-- ══ HEADER ══ -->
    <div class="panel-header">
      <span class="panel-header__sword">⚔️</span>
      <span class="panel-header__title">Боевой трекер</span>
      <div v-if="isActive" class="round-badge">
        <span class="round-badge__label">Раунд</span>
        <span class="round-badge__num">{{ combat?.round }}</span>
      </div>
      <button class="close-btn" @click="emit('close')">
        <ion-icon :icon="closeOutline"/>
      </button>
    </div>

    <!-- ══ NO SESSION ══ -->
    <div v-if="!combat" class="no-session">
      <div class="no-session__icon">⚔️</div>
      <p class="no-session__title">Бой не начат</p>
      <p class="no-session__sub">Нажмите, чтобы начать подготовку к сражению</p>
      <button class="btn btn--primary btn--lg" :disabled="loading" @click="createSession">
        <ion-icon :icon="playOutline"/> Подготовить бой
      </button>
    </div>

    <!-- ══ SESSION EXISTS ══ -->
    <template v-else>

      <!-- ─── PREPARING ─── -->
      <div v-if="isPreparing" class="prepare-section">

        <div class="section-label">Игроки</div>
        <div class="participant-list">
          <div v-for="ch in roomStore.characters" :key="ch.id" class="prep-row">
            <div class="prep-row__avatar">{{ participantInitial(ch.name) }}</div>
            <div class="prep-row__info">
              <span class="prep-row__name">{{ ch.name }}</span>
              <span class="prep-row__meta">{{ ch.clazzInfo?.name }} {{ ch.level?.level ? ch.level.level + ' ур.' : '' }}</span>
            </div>
            <button
              v-if="!alreadyAddedCharacterIds.includes(ch.id)"
              class="btn btn--sm btn--add"
              @click="addCharacter(ch)"
            ><ion-icon :icon="addOutline"/> Добавить</button>
            <span v-else class="added-badge">✓ Добавлен</span>
          </div>
        </div>

        <div class="section-label" style="margin-top:14px">NPC</div>
        <button class="btn btn--secondary btn--sm" @click="showNpcPicker = !showNpcPicker">
          <ion-icon :icon="addOutline"/> Добавить NPC
        </button>

        <div v-if="showNpcPicker" class="npc-picker">
          <select v-model="pickedNpcId" class="npc-picker__select">
            <option value="">— выберите NPC —</option>
            <option v-for="npc in npcs" :key="npc.id" :value="npc.id">{{ npc.name }}</option>
          </select>
          <div v-if="pickedNpc" class="npc-picker__fields">
            <div class="npc-picker__field">
              <label>Копий</label>
              <input type="number" v-model.number="npcCopyCount" min="1" max="10" class="npc-input"/>
            </div>
            <div class="npc-picker__field">
              <label>Макс. ХП <span v-if="npcHpRequired" class="required-mark">*</span></label>
              <input
                type="number"
                v-model.number="pickedNpcMaxHp"
                min="1"
                class="npc-input"
                :class="{ 'npc-input--required': npcHpRequired && !pickedNpcMaxHp }"
                :placeholder="npcHpRequired ? 'обязательно' : 'авто'"
              />
            </div>
            <div class="npc-picker__field">
              <label>КД</label>
              <input type="number" v-model.number="pickedNpcAc" min="1" class="npc-input" placeholder="авто"/>
            </div>
          </div>
          <button class="btn btn--primary btn--sm" :disabled="!canAddNpc" @click="addNpc">
            Добавить
          </button>
        </div>

        <div v-if="combat.participants.length > 0" class="added-participants">
          <div class="section-label" style="margin-top:14px">Участники ({{ combat.participants.length }})</div>
          <div v-for="p in combat.participants" :key="p.id" class="added-row">
            <div class="added-row__avatar" :class="p.participantType === 'NPC' ? 'added-row__avatar--npc' : 'added-row__avatar--char'">
              {{ participantInitial(p.displayName) }}
            </div>
            <div class="added-row__info">
              <span class="added-row__name">{{ p.displayName }}</span>
              <span class="added-row__type">{{ p.participantType === 'NPC' ? 'NPC' : 'Персонаж' }}</span>
            </div>
            <template v-if="editingStats[p.id]">
              <div class="stat-edit-inline">
                <input type="number" class="npc-input stat-input" v-model="editingStats[p.id].hp" placeholder="ХП"/>
                <span class="stat-sep">/</span>
                <input type="number" class="npc-input stat-input" v-model="editingStats[p.id].maxHp" placeholder="макс"/>
                <span class="stat-sep">🛡</span>
                <input type="number" class="npc-input stat-input" v-model="editingStats[p.id].ac" placeholder="КД"/>
                <button class="btn btn--sm btn--primary" @click="saveStatEdit(p.id)">✓</button>
                <button class="btn btn--sm btn--secondary" @click="delete editingStats[p.id]">✕</button>
              </div>
            </template>
            <template v-else>
              <div class="added-row__stats">
                <span v-if="p.maxHp" class="stat-pill">❤ {{ p.currentHp }}/{{ p.maxHp }}</span>
                <span v-if="p.armoryClass" class="stat-pill">🛡 {{ p.armoryClass }}</span>
              </div>
              <button class="icon-btn" title="Изменить статы" @click="openStatEdit(p)">
                <ion-icon :icon="optionsOutline"/>
              </button>
            </template>
            <button class="icon-btn icon-btn--danger" @click="removeParticipant(p.id)">
              <ion-icon :icon="trashOutline"/>
            </button>
          </div>
        </div>

        <div class="prepare-actions">
          <button
            class="btn btn--primary btn--lg"
            :disabled="combat.participants.length === 0 || startingFight"
            @click="startFight"
          >
            <ion-icon :icon="playOutline"/>
            {{ startingFight ? 'Запуск...' : 'Начать бой' }}
          </button>
          <button class="btn btn--danger btn--sm" @click="endSession">
            <ion-icon :icon="stopOutline"/> Отменить
          </button>
        </div>
      </div>

      <!-- ─── ACTIVE ─── -->
      <div v-else-if="isActive" class="active-section">

        <!-- Initiative order strip -->
        <div v-if="combat.allReady" class="init-strip">
          <div
            v-for="p in participants"
            :key="p.id"
            :class="['init-strip__item', {
              'init-strip__item--active': p.isCurrentTurn,
              'init-strip__item--dying': isDying(p),
            }]"
          >
            <div
              class="init-strip__avatar"
              :style="{ '--hp-color': hpBarColor(hpPercent(p)), '--hp-pct': hpPercent(p) + '%' }"
            >
              <img
                class="init-strip__avatar-img"
                :src="participantAvatarUrl(p)"
                :alt="p.displayName"
                @error="($event.target as HTMLImageElement).src = CHARACTER_AVATAR_PLACEHOLDER"
              />
            </div>
            <span class="init-strip__init">{{ p.initiative }}</span>
            <span class="init-strip__name">{{ p.displayName.split(' ')[0] }}</span>
          </div>
        </div>

        <!-- Current turn banner -->
        <div v-if="currentTurn" class="current-turn-banner">
          <div class="current-turn-banner__left">
            <span class="current-turn-banner__label">ХОД</span>
            <span class="current-turn-banner__name">{{ currentTurn.displayName }}</span>
            <span class="current-turn-banner__sub">
              {{ currentTurn.clazzName ? currentTurn.clazzName + (currentTurn.level ? ' · ' + currentTurn.level + ' ур.' : '') : npcTypeLabel(currentTurn.npcType) }}
            </span>
          </div>
          <div class="turn-controls">
            <button class="turn-btn turn-btn--prev" @click="doPrevTurn" title="Предыдущий ход">
              <ion-icon :icon="chevronBackOutline"/>
            </button>
            <button class="turn-btn turn-btn--next" @click="doNextTurn">
              Следующий <ion-icon :icon="chevronForwardOutline"/>
            </button>
          </div>
        </div>

        <!-- Waiting for initiatives -->
        <div v-else-if="!combat.allReady" class="waiting-banner">
          <span class="waiting-banner__icon">⏳</span>
          Ожидание инициативы игроков...
        </div>

        <!-- NPC initiative inputs -->
        <div v-if="!combat.allReady" class="npc-initiative-section">
          <div class="section-label">Инициатива NPC</div>
          <div v-for="p in participants.filter(x => x.participantType === 'NPC' && !x.isReady)" :key="p.id" class="npc-init-row">
            <div class="npc-init-row__avatar">{{ participantInitial(p.displayName) }}</div>
            <span class="npc-init-row__name">{{ p.displayName }}</span>
            <button class="reroll-btn" title="Перебросить" @click="rerollNpcInitiative(p)">🎲</button>
            <input
              type="number"
              class="npc-input npc-init-input"
              v-model="npcInitiativeInputs[p.id]"
              placeholder="1"
              min="1"
              @keyup.enter="submitNpcInitiative(p.id)"
            />
            <button class="btn btn--sm btn--primary" @click="submitNpcInitiative(p.id)">ОК</button>
          </div>
          <div v-for="p in participants.filter(x => x.participantType === 'CHARACTER' && !x.isReady)" :key="'w'+p.id" class="waiting-row">
            <div class="npc-init-row__avatar npc-init-row__avatar--char">{{ participantInitial(p.displayName) }}</div>
            <span>{{ p.displayName }}</span>
            <span class="waiting-pill">Ожидание...</span>
          </div>
        </div>

        <!-- Participant cards -->
        <div class="participant-cards">
          <div
            v-for="p in participants"
            :key="p.id"
            :class="['pcard', {
              'pcard--active': p.isCurrentTurn,
              'pcard--dying': isDying(p),
              'pcard--char': p.participantType === 'CHARACTER',
            }]"
          >
            <!-- Active bar -->
            <div v-if="p.isCurrentTurn" class="pcard__active-bar"/>

            <!-- Top row -->
            <div class="pcard__top">
              <div class="pcard__init-block">
                <span class="pcard__init-num">{{ p.initiative ?? '—' }}</span>
                <span class="pcard__init-label">init</span>
              </div>
              <div class="pcard__main">
                <div class="pcard__name-row">
                  <span class="pcard__name">{{ p.displayName }}</span>
                  <span v-if="p.isCurrentTurn" class="pcard__turn-arrow">▶</span>
                </div>
                <div class="pcard__badges">
                  <span v-if="p.clazzName" class="badge badge--class">{{ p.clazzName }} {{ p.level ? p.level + 'ур.' : '' }}</span>
                  <span v-if="p.npcType" class="badge badge--type">{{ npcTypeLabel(p.npcType) }}</span>
                </div>
              </div>
              <div v-if="p.armoryClass" class="pcard__ac">
                <ion-icon :icon="shieldOutline" class="pcard__ac-icon"/>
                <span class="pcard__ac-val">{{ p.armoryClass }}</span>
              </div>
            </div>

            <!-- HP section -->
            <div v-if="p.maxHp != null" class="pcard__hp">
              <div class="pcard__hp-bar-wrap">
                <div
                  class="pcard__hp-bar"
                  :style="{ width: hpPercent(p) + '%', background: hpBarColor(hpPercent(p)) }"
                />
              </div>
              <div class="pcard__hp-row">
                <ion-icon :icon="heartOutline" class="pcard__hp-icon"/>
                <button class="pcard__hp-text" @click="p.participantType === 'NPC' ? toggleHpManage(p) : openHpEdit(p)">
                  {{ p.currentHp ?? '?' }}<span v-if="p.tempHp && p.tempHp > 0" class="pcard__temp-hp"> +{{ p.tempHp }}</span>
                  <span class="pcard__hp-sep"> / </span>{{ p.maxHp }}
                </button>
                <template v-if="editingHpParticipantId === p.id">
                  <input class="hp-edit-input" type="number" v-model="editingHpValue" @keyup.enter="saveHp" @blur="saveHp"/>
                </template>
                <span v-if="p.maxHp" class="pcard__hp-pct">{{ Math.round(hpPercent(p)) }}%</span>
              </div>
              <!-- NPC HP management -->
              <div v-if="p.participantType === 'NPC' && hpManage[p.id]" class="hp-manage-row">
                <input
                  type="number"
                  class="hp-manage-input"
                  v-model="hpManage[p.id].delta"
                  placeholder="0"
                  min="0"
                  @keyup.enter="applyHpDelta(p, -1)"
                />
                <button class="btn btn--sm btn--danger" @click="applyHpDelta(p, -1)">— Урон</button>
                <button class="btn btn--sm btn--success" @click="applyHpDelta(p, 1)">+ Лечение</button>
                <button class="btn btn--sm btn--secondary" @click="setExactHp(p)">= Точно</button>
              </div>
              <!-- Death saves (characters only) -->
              <div v-if="isDying(p) && p.participantType === 'CHARACTER'" class="dying-row">
                <ion-icon :icon="skullOutline"/>
                <span>{{ p.deathSaveFailures ?? 0 }}/3 провалов</span>
                <span>{{ p.deathSaveSuccesses ?? 0 }}/3 успехов</span>
              </div>
            </div>

            <!-- Abilities toggle + row -->
            <div v-if="p.participantType === 'NPC' || (p.abilities && p.abilities.length > 0)" class="pcard__abilities-wrap">
              <button class="abilities-toggle" @click="toggleAbilities(p.id)">
                {{ expandedAbilities[p.id] ? '▲' : '▼' }} Характеристики
              </button>
              <template v-if="expandedAbilities[p.id]">
                <div v-if="p.abilities && p.abilities.length > 0" class="abilities-row">
                  <div v-for="ab in p.abilities" :key="ab.code" class="ability-chip">
                    <span class="ability-chip__code">{{ ab.code }}</span>
                    <span class="ability-chip__val">{{ ab.value }}</span>
                    <span class="ability-chip__mod">{{ ab.value >= 10 ? '+' : '' }}{{ Math.floor((ab.value - 10) / 2) }}</span>
                  </div>
                </div>

                <template v-if="p.participantType === 'NPC' && npcs.find(n => n.id === p.referenceId)">
                  <template v-for="npcRef in [npcs.find(n => n.id === p.referenceId)!]" :key="'npc-extra-' + p.id">
                    <br/>
                    <button class="npc-open-card-btn" @click="goToNpcCard(p.referenceId)">
                      <ion-icon :icon="openOutline"/> Открыть карточку NPC
                    </button>
                    <div v-if="npcRef.level || npcRef.proficiencyBonus || npcRef.challengeRating || npcRef.speed" class="npc-extra-params">
                      <span v-if="npcRef.level" class="npc-param-chip"><span class="npc-param-chip__label">Ур.</span>{{ npcRef.level }}</span>
                      <span v-if="npcRef.proficiencyBonus" class="npc-param-chip"><span class="npc-param-chip__label">Маст.</span>+{{ npcRef.proficiencyBonus }}</span>
                      <span v-if="npcRef.challengeRating" class="npc-param-chip"><span class="npc-param-chip__label">CR</span>{{ npcRef.challengeRating }}</span>
                      <span v-if="npcRef.speed" class="npc-param-chip"><span class="npc-param-chip__label">Скор.</span>{{ npcRef.speed }}</span>
                    </div>

                    <div v-if="npcRef.skills?.length" class="npc-extra-block">
                      <div class="npc-extra-block__title">Навыки</div>
                      <div class="npc-skill-chips">
                        <span v-for="sk in npcRef.skills" :key="sk.name" class="npc-skill-chip">
                          {{ sk.name }}&nbsp;<b>{{ sk.bonus >= 0 ? '+' : '' }}{{ sk.bonus }}</b>
                        </span>
                      </div>
                    </div>

                    <div v-if="npcRef.features?.length" class="npc-extra-block">
                      <div class="npc-extra-block__title">Умения</div>
                      <div v-for="feat in npcRef.features" :key="feat.name" class="npc-entry-row npc-entry-row--feature">
                        <span class="npc-entry-row__name">{{ feat.name }}.</span>
                        <span class="npc-entry-row__desc">{{ feat.description }}</span>
                      </div>
                    </div>

                    <div v-if="npcRef.actions?.length" class="npc-extra-block">
                      <div class="npc-extra-block__title">Действия</div>
                      <div v-for="act in npcRef.actions" :key="act.name" class="npc-entry-row npc-entry-row--action">
                        <span class="npc-entry-row__name">{{ act.name }}.</span>
                        <span class="npc-entry-row__desc">{{ act.description }}</span>
                      </div>
                    </div>

                    <div v-if="npcRef.savingThrows?.length" class="npc-extra-block">
                      <div class="npc-extra-block__title">Спасброски</div>
                      <div class="npc-skill-chips">
                        <span v-for="sv in npcRef.savingThrows" :key="sv.name" class="npc-skill-chip">
                          {{ saveLabel(sv.name) }}&nbsp;<b>{{ sv.bonus >= 0 ? '+' : '' }}{{ sv.bonus }}</b>
                        </span>
                      </div>
                    </div>

                    <div v-if="npcRef.resistances?.length" class="npc-extra-block">
                      <div class="npc-extra-block__title">Сопротивления</div>
                      <div class="npc-skill-chips">
                        <span v-for="r in npcRef.resistances" :key="r" class="npc-skill-chip">{{ damageLabel(r) }}</span>
                      </div>
                    </div>

                    <div v-if="npcRef.immunities?.length" class="npc-extra-block">
                      <div class="npc-extra-block__title">Иммунитеты</div>
                      <div class="npc-skill-chips">
                        <span v-for="im in npcRef.immunities" :key="im" class="npc-skill-chip">{{ im }}</span>
                      </div>
                    </div>

                    <div v-if="npcRef.senses?.length" class="npc-extra-block">
                      <div class="npc-extra-block__title">Чувства</div>
                      <div class="npc-skill-chips">
                        <span v-for="se in npcRef.senses" :key="se.name" class="npc-skill-chip">{{ se.name }}&nbsp;<b>{{ se.value }}</b></span>
                      </div>
                    </div>

                    <div v-if="npcRef.languages" class="npc-extra-block">
                      <div class="npc-extra-block__title">Языки</div>
                      <div class="npc-extra-block__text">{{ npcRef.languages }}</div>
                    </div>

                    <div v-if="npcRef.spells?.length" class="npc-extra-block">
                      <div class="npc-extra-block__title">Заклинания</div>
                      <div class="npc-skill-chips">
                        <span v-for="(sp, spi) in npcSpellsResolved(npcRef)" :key="spi" class="npc-skill-chip">
                          <span v-if="sp.level > 0" class="npc-spell-lvl">{{ sp.level }}</span>{{ sp.name }}<b v-if="sp.chargesPerDay != null">&nbsp;{{ sp.chargesPerDay }}/д</b>
                        </span>
                      </div>
                    </div>
                  </template>
                </template>
              </template>
            </div>

            <!-- States -->
            <div class="states-section">
              <div class="states-row">
                <span
                  v-for="s in (p.states ?? [])"
                  :key="s"
                  class="state-chip"
                  :title="stateDesc(s) ?? undefined"
                >
                  {{ stateLabel(s) }}
                  <button
                    v-if="p.participantType === 'CHARACTER'"
                    class="state-chip__remove"
                    @click.stop="doRemoveState(p, s)"
                    :aria-label="`Снять ${stateLabel(s)}`"
                  >✕</button>
                </span>
                <button
                  v-if="p.participantType === 'CHARACTER'"
                  class="states-add-btn"
                  :class="{ 'states-add-btn--active': expandedStates[p.id] }"
                  :aria-label="expandedStates[p.id] ? 'Скрыть' : 'Добавить состояние'"
                  @click="toggleStates(p.id)"
                >
                  <ion-icon :icon="flashOutline"/>
                </button>
              </div>
              <div v-if="expandedStates[p.id] && p.participantType === 'CHARACTER'" class="states-picker">
                <select
                  class="states-picker__select"
                  v-model="pendingStateCode[p.id]"
                  @change="doAddState(p)"
                >
                  <option value="">— добавить состояние —</option>
                  <option v-for="s in availableStatesToAdd(p)" :key="s.code" :value="s.code">
                    {{ s.name ?? s.code }}
                  </option>
                </select>
                <p v-if="availableStatesToAdd(p).length === 0" class="states-picker__empty">
                  Все состояния применены
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Add NPC during active combat -->
        <div class="active-add-npc">
          <button class="btn btn--secondary btn--sm" @click="showActiveNpcPicker = !showActiveNpcPicker">
            <ion-icon :icon="addOutline"/>
            {{ showActiveNpcPicker ? 'Свернуть' : 'Добавить NPC' }}
          </button>

          <div v-if="showActiveNpcPicker" class="npc-picker npc-picker--active">
            <select v-model="pickedNpcId" class="npc-picker__select">
              <option value="">— выберите NPC —</option>
              <option v-for="npc in npcs" :key="npc.id" :value="npc.id">{{ npc.name }}</option>
            </select>
            <div v-if="pickedNpc" class="npc-picker__fields">
              <div class="npc-picker__field">
                <label>Копий</label>
                <input type="number" v-model.number="npcCopyCount" min="1" max="10" class="npc-input"/>
              </div>
              <div class="npc-picker__field">
                <label>Макс. ХП <span v-if="npcHpRequired" class="required-mark">*</span></label>
                <input
                  type="number"
                  v-model.number="pickedNpcMaxHp"
                  min="1"
                  class="npc-input"
                  :class="{ 'npc-input--required': npcHpRequired && !pickedNpcMaxHp }"
                  :placeholder="npcHpRequired ? 'обязательно' : 'авто'"
                />
              </div>
              <div class="npc-picker__field">
                <label>КД</label>
                <input type="number" v-model.number="pickedNpcAc" min="1" class="npc-input" placeholder="авто"/>
              </div>
            </div>
            <button class="btn btn--primary btn--sm" :disabled="!canAddNpc" @click="addNpc">
              <ion-icon :icon="addOutline"/> Добавить в бой
            </button>
          </div>
        </div>

        <button class="btn btn--danger btn--sm end-btn" @click="endSession">
          <ion-icon :icon="stopOutline"/> Завершить бой
        </button>
      </div>

    </template>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════
   BASE
═══════════════════════════════════════ */
.combat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0c0e16;
  color: var(--ion-color-light);
  overflow: hidden;
  font-family: inherit;
}

/* ═══════════════════════════════════════
   HEADER
═══════════════════════════════════════ */
.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}
.panel-header__sword { font-size: 1.1rem; }
.panel-header__title {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ion-color-light);
}
.round-badge {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.15);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.35);
}
.round-badge__label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ion-color-primary);
  opacity: 0.8;
}
.round-badge__num {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--ion-color-primary);
}
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--ion-color-secondary);
  font-size: 20px;
  cursor: pointer;
  transition: background 0.12s;
}
.close-btn:hover { background: rgba(255,255,255,0.06); color: var(--ion-color-light); }

/* ═══════════════════════════════════════
   NO SESSION
═══════════════════════════════════════ */
.no-session {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 24px;
  text-align: center;
}
.no-session__icon { font-size: 3.5rem; line-height: 1; filter: drop-shadow(0 0 20px rgba(var(--ion-color-primary-rgb),0.3)); }
.no-session__title { font-size: 1.1rem; font-weight: 700; margin: 0; }
.no-session__sub { font-size: 0.82rem; color: var(--ion-color-secondary); margin: 0; max-width: 220px; }

/* ═══════════════════════════════════════
   SHARED LAYOUT
═══════════════════════════════════════ */
.prepare-section,
.active-section {
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.active-section { gap: 10px; }

.section-label {
  font-size: 0.64rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ion-color-primary);
  opacity: 0.7;
}

/* ═══════════════════════════════════════
   PREPARE — participant rows
═══════════════════════════════════════ */
.participant-list { display: flex; flex-direction: column; gap: 5px; }

.prep-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  transition: background 0.12s;
}
.prep-row:hover { background: rgba(255,255,255,0.05); }
.prep-row__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(var(--ion-color-primary-rgb), 0.2);
  color: var(--ion-color-primary);
  font-size: 0.82rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.prep-row__info { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.prep-row__name { font-size: 0.88rem; font-weight: 600; }
.prep-row__meta { font-size: 0.72rem; color: var(--ion-color-secondary); }

.added-badge {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ion-color-success);
}

/* Added participants list */
.added-participants { display: flex; flex-direction: column; gap: 5px; }

.added-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: rgba(var(--ion-color-primary-rgb), 0.05);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.15);
  border-radius: 10px;
  flex-wrap: wrap;
}
.added-row__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.added-row__avatar--char { background: rgba(var(--ion-color-primary-rgb),0.2); color: var(--ion-color-primary); }
.added-row__avatar--npc  { background: rgba(var(--ion-color-warning-rgb),0.15); color: var(--ion-color-warning); }
.added-row__info { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.added-row__name { font-size: 0.84rem; font-weight: 600; }
.added-row__type { font-size: 0.68rem; color: var(--ion-color-secondary); }
.added-row__stats { display: flex; gap: 4px; align-items: center; }
.stat-pill {
  font-size: 0.68rem;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(255,255,255,0.07);
  color: var(--ion-color-secondary);
}
.stat-edit-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  width: 100%;
  margin-top: 4px;
}
.stat-sep { color: var(--ion-color-secondary); font-size: 0.8rem; }
.stat-input { width: 54px !important; padding: 4px 6px !important; font-size: 0.78rem !important; }

/* NPC picker */
.npc-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.09);
}
.npc-picker__select,
.npc-input {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: var(--ion-color-light);
  padding: 8px 10px;
  font-size: 0.85rem;
  width: 100%;
  box-sizing: border-box;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color 0.12s;
}
.npc-picker__select:focus,
.npc-input:focus { outline: none; border-color: rgba(var(--ion-color-primary-rgb), 0.5); }
.npc-picker__select option { background: #1a1d28; color: var(--ion-color-light); }
.required-mark { color: var(--ion-color-danger); }
.npc-input--required {
  border-color: rgba(var(--ion-color-danger-rgb), 0.5) !important;
  background: rgba(var(--ion-color-danger-rgb), 0.05) !important;
}
.npc-input--required::placeholder { color: var(--ion-color-danger); opacity: 0.7; }
.npc-picker__fields { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.npc-picker__field { display: flex; flex-direction: column; gap: 4px; }
.npc-picker__field label { font-size: 0.68rem; color: var(--ion-color-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }

/* Prepare actions */
.prepare-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: auto;
  padding-top: 8px;
}

/* ═══════════════════════════════════════
   ACTIVE — INITIATIVE STRIP
═══════════════════════════════════════ */
.init-strip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 10px 10px 10px;
  flex-shrink: 0;
  scrollbar-width: none;
}
.init-strip::-webkit-scrollbar { display: none; }

.init-strip__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  cursor: default;
  transition: transform 0.15s;
}
.init-strip__item--active .init-strip__avatar {
  box-shadow: 0 0 0 2px var(--ion-color-primary), 0 0 12px rgba(var(--ion-color-primary-rgb), 0.5);
  transform: scale(1.12);
}
.init-strip__item--dying .init-strip__avatar {
  box-shadow: 0 0 0 2px #f87171;
  opacity: 0.7;
}
.init-strip__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: conic-gradient(var(--hp-color, #4ade80) var(--hp-pct, 100%), rgba(255,255,255,0.08) 0);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: box-shadow 0.2s, transform 0.2s;
}
.init-strip__avatar-img {
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  width: calc(100% - 6px);
  height: calc(100% - 6px);
  object-fit: cover;
  background: #161926;
}
.init-strip__init {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--ion-color-primary);
}
.init-strip__name {
  font-size: 0.6rem;
  color: var(--ion-color-secondary);
  max-width: 44px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

/* ═══════════════════════════════════════
   ACTIVE — CURRENT TURN BANNER
═══════════════════════════════════════ */
.current-turn-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg,
    rgba(var(--ion-color-primary-rgb), 0.2) 0%,
    rgba(var(--ion-color-primary-rgb), 0.06) 100%
  );
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
  border-radius: 14px;
  flex-shrink: 0;
  box-shadow: 0 4px 20px rgba(var(--ion-color-primary-rgb), 0.08);
}
.current-turn-banner__left {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}
.current-turn-banner__label {
  font-size: 0.58rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ion-color-primary);
}
.current-turn-banner__name {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.current-turn-banner__sub {
  font-size: 0.72rem;
  color: var(--ion-color-secondary);
}
.turn-controls { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }

.turn-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  border: none;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.12s, transform 0.1s;
}
.turn-btn:active { transform: scale(0.95); }
.turn-btn--prev {
  background: rgba(255,255,255,0.07);
  color: var(--ion-color-light);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 8px 10px;
}
.turn-btn--prev:hover { background: rgba(255,255,255,0.12); }
.turn-btn--next {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.turn-btn--next:hover { filter: brightness(1.1); }

.waiting-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  font-size: 0.85rem;
  color: var(--ion-color-secondary);
}
.waiting-banner__icon { font-size: 1rem; }

/* ═══════════════════════════════════════
   ACTIVE — NPC INITIATIVE
═══════════════════════════════════════ */
.npc-initiative-section { display: flex; flex-direction: column; gap: 6px; }

.npc-init-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
}
.npc-init-row__avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(var(--ion-color-warning-rgb), 0.15);
  color: var(--ion-color-warning);
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.npc-init-row__avatar--char { background: rgba(var(--ion-color-primary-rgb),0.15); color: var(--ion-color-primary); }
.npc-init-row__name { flex: 1; font-size: 0.84rem; font-weight: 600; }
.reroll-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0 2px;
  transition: transform 0.15s;
}
.reroll-btn:hover { transform: rotate(30deg) scale(1.2); }
.npc-init-input { width: 70px !important; }

.waiting-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  opacity: 0.55;
  font-size: 0.82rem;
}
.waiting-pill {
  font-size: 0.68rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.07);
  color: var(--ion-color-secondary);
}

/* ═══════════════════════════════════════
   ACTIVE — PARTICIPANT CARDS
═══════════════════════════════════════ */
.participant-cards { display: flex; flex-direction: column; gap: 8px; }

.pcard {
  position: relative;
  padding: 11px 13px 11px 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  overflow: hidden;
}
.pcard--active {
  background: rgba(var(--ion-color-primary-rgb), 0.08);
  border-color: rgba(var(--ion-color-primary-rgb), 0.35);
  box-shadow: 0 0 0 1px rgba(var(--ion-color-primary-rgb), 0.12),
              0 4px 24px rgba(var(--ion-color-primary-rgb), 0.1);
}
.pcard--dying {
  border-color: rgba(248, 113, 113, 0.35);
  background: rgba(180, 30, 30, 0.07);
}

/* Left glow bar for active turn */
.pcard__active-bar {
  position: absolute;
  left: 0;
  top: 10%;
  bottom: 10%;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--ion-color-primary);
  box-shadow: 0 0 8px rgba(var(--ion-color-primary-rgb), 0.6);
}

/* Top row */
.pcard__top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pcard__init-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 34px;
  flex-shrink: 0;
}
.pcard__init-num {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--ion-color-primary);
  line-height: 1;
}
.pcard__init-label {
  font-size: 0.52rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ion-color-secondary);
  opacity: 0.7;
}
.pcard__main { flex: 1; min-width: 0; }
.pcard__name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pcard__name {
  font-size: 0.92rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pcard__turn-arrow {
  font-size: 0.65rem;
  color: var(--ion-color-primary);
  animation: arrow-pulse 1s ease-in-out infinite;
}
@keyframes arrow-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.pcard__badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 3px;
}

.badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 999px;
  white-space: nowrap;
}
.badge--class {
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  color: var(--ion-color-primary);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
}
.badge--type {
  background: rgba(var(--ion-color-warning-rgb), 0.1);
  color: var(--ion-color-warning);
  border: 1px solid rgba(var(--ion-color-warning-rgb), 0.2);
}

.pcard__ac {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  flex-shrink: 0;
}
.pcard__ac-icon { color: #93c5fd; font-size: 16px; }
.pcard__ac-val { font-size: 0.88rem; font-weight: 800; color: #93c5fd; line-height: 1; }

/* HP */
.pcard__hp { margin-top: 9px; }
.pcard__hp-bar-wrap {
  width: 100%;
  height: 6px;
  background: rgba(255,255,255,0.08);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 5px;
}
.pcard__hp-bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease, background 0.4s ease;
  position: relative;
}
.pcard__hp-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(255,255,255,0.2), transparent);
  border-radius: 999px;
}

.pcard__hp-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pcard__hp-icon { color: #f87171; font-size: 13px; flex-shrink: 0; }
.pcard__hp-text {
  background: transparent;
  border: none;
  color: var(--ion-color-light);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0;
  flex: 1;
  text-align: left;
  transition: color 0.12s;
}
.pcard__hp-text:hover { color: var(--ion-color-primary); }
.pcard__temp-hp { color: #60a5fa; }
.pcard__hp-sep { color: var(--ion-color-secondary); margin: 0 1px; }
.pcard__hp-pct {
  font-size: 0.68rem;
  color: var(--ion-color-secondary);
  font-weight: 600;
  flex-shrink: 0;
}

.hp-edit-input {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(var(--ion-color-primary-rgb),0.4);
  border-radius: 7px;
  color: var(--ion-color-light);
  padding: 3px 8px;
  font-size: 0.85rem;
  width: 80px;
}

.hp-manage-row {
  display: flex;
  gap: 5px;
  align-items: center;
  margin-top: 7px;
  flex-wrap: wrap;
}
.hp-manage-input {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(var(--ion-color-primary-rgb),0.3);
  border-radius: 7px;
  color: var(--ion-color-light);
  padding: 5px 8px;
  font-size: 0.82rem;
  width: 62px;
}

.dying-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
  font-size: 0.74rem;
  color: #f87171;
}

/* Abilities */
.pcard__abilities-wrap { margin-top: 8px; }
.abilities-toggle {
  background: transparent;
  border: none;
  color: var(--ion-color-secondary);
  font-size: 0.68rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  letter-spacing: 0.03em;
  transition: color 0.12s;
}
.abilities-toggle:hover { color: var(--ion-color-light); }

.abilities-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.ability-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 7px;
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  min-width: 38px;
  transition: background 0.12s;
}
.ability-chip:hover { background: rgba(255,255,255,0.07); }
.ability-chip__code { font-size: 0.52rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ion-color-primary); opacity: 0.8; }
.ability-chip__val  { font-size: 0.85rem; font-weight: 700; color: var(--ion-color-light); line-height: 1.15; }
.ability-chip__mod  { font-size: 0.58rem; color: var(--ion-color-secondary); }

/* NPC extra info (inside abilities spoiler) */
.npc-extra-params {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.npc-param-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(var(--ion-color-secondary-rgb), 0.12);
  border: 1px solid rgba(var(--ion-color-secondary-rgb), 0.25);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ion-color-secondary);
}
.npc-param-chip__label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.6;
  margin-right: 1px;
}
.npc-extra-block {
  margin-top: 8px;
}
.npc-extra-block__title {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(var(--ion-color-light-rgb), 0.4);
  margin-bottom: 5px;
}
.npc-skill-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.npc-skill-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.22);
  font-size: 0.72rem;
  color: rgba(var(--ion-color-light-rgb), 0.85);
}
.npc-skill-chip b {
  color: var(--ion-color-primary);
  font-weight: 700;
}
.npc-spell-lvl {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border-radius: 5px;
  font-size: 0.6rem;
  font-weight: 800;
  color: var(--ion-color-primary-contrast);
  background: var(--ion-color-primary);
}
.npc-extra-block__text {
  font-size: 0.74rem;
  line-height: 1.45;
  color: rgba(var(--ion-color-light-rgb), 0.78);
}
.npc-open-card-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
  margin-top: 10px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
  transition: background 0.14s ease;
}
.npc-open-card-btn:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.2);
}
.npc-open-card-btn ion-icon {
  font-size: 0.95rem;
}
.npc-entry-row {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 5px 8px;
  border-radius: 8px;
  margin-bottom: 4px;
  background: rgba(var(--ion-color-light-rgb), 0.03);
  border-left: 2px solid transparent;
  font-size: 0.75rem;
  line-height: 1.5;
}
.npc-entry-row--feature { border-left-color: var(--ion-color-secondary); }
.npc-entry-row--action  { border-left-color: var(--ion-color-primary); }
.npc-entry-row__name {
  font-weight: 700;
  color: var(--ion-color-light);
  white-space: nowrap;
}
.npc-entry-row__desc {
  color: rgba(var(--ion-color-light-rgb), 0.68);
}

/* States */
.states-section { margin-top: 6px; }
.states-row { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
.state-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.66rem;
  font-weight: 600;
  padding: 2px 6px 2px 8px;
  border-radius: 999px;
  background: rgba(var(--ion-color-warning-rgb), 0.12);
  color: var(--ion-color-warning);
  border: 1px solid rgba(var(--ion-color-warning-rgb), 0.25);
}
.state-chip__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: none;
  background: rgba(var(--ion-color-danger-rgb), 0.25);
  color: var(--ion-color-danger);
  font-size: 9px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.12s;
}
.state-chip__remove:hover {
  background: rgba(var(--ion-color-danger-rgb), 0.5);
}
.states-add-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px dashed rgba(var(--ion-color-primary-rgb), 0.45);
  background: transparent;
  color: rgba(var(--ion-color-primary-rgb), 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.states-add-btn--active,
.states-add-btn:active {
  background: rgba(var(--ion-color-primary-rgb), 0.15);
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary);
}
.states-picker {
  margin-top: 6px;
}
.states-picker__select {
  width: 100%;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(var(--ion-color-medium-rgb), 0.6);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
  color: var(--ion-color-light);
  font-size: 12px;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}
.states-picker__select option { background: #1a1d28; color: var(--ion-color-light); }
.states-picker__empty {
  font-size: 11px;
  color: rgba(var(--ion-color-light-rgb), 0.35);
  margin: 4px 0 0;
  font-style: italic;
}

.active-add-npc {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.02);
  border: 1px dashed rgba(var(--ion-color-primary-rgb), 0.2);
  border-radius: 12px;
  flex-shrink: 0;
}

.npc-picker--active {
  margin-top: 0;
  padding: 0;
  background: transparent;
  border: none;
}

.end-btn { margin-top: auto; align-self: flex-start; flex-shrink: 0; }

/* ═══════════════════════════════════════
   BUTTONS
═══════════════════════════════════════ */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 16px;
  border-radius: 9px;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: filter 0.12s, transform 0.1s;
  white-space: nowrap;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn:not(:disabled):hover { filter: brightness(1.1); }
.btn:not(:disabled):active { transform: scale(0.97); }
.btn--primary  { background: var(--ion-color-primary); color: var(--ion-color-primary-contrast); }
.btn--secondary{ background: rgba(255,255,255,0.07); color: var(--ion-color-light); border: 1px solid rgba(255,255,255,0.1); }
.btn--danger   { background: rgba(var(--ion-color-danger-rgb),0.14); color: var(--ion-color-danger); border: 1px solid rgba(var(--ion-color-danger-rgb),0.28); }
.btn--success  { background: rgba(var(--ion-color-success-rgb),0.14); color: var(--ion-color-success); border: 1px solid rgba(var(--ion-color-success-rgb),0.28); }
.btn--sm  { padding: 5px 10px; font-size: 0.77rem; border-radius: 7px; }
.btn--lg  { padding: 12px 22px; font-size: 0.95rem; }
.btn--add { background: rgba(var(--ion-color-success-rgb),0.1); color: var(--ion-color-success); border: 1px solid rgba(var(--ion-color-success-rgb),0.25); }

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: transparent;
  color: var(--ion-color-secondary);
  cursor: pointer;
  font-size: 15px;
  transition: background 0.12s, color 0.12s;
  flex-shrink: 0;
}
.icon-btn:hover { background: rgba(255,255,255,0.07); color: var(--ion-color-light); }
.icon-btn--danger:hover { background: rgba(var(--ion-color-danger-rgb),0.1); color: var(--ion-color-danger); border-color: rgba(var(--ion-color-danger-rgb),0.2); }
</style>
