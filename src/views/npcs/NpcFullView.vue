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
  onIonViewWillEnter,
} from "@ionic/vue";
import {addOutline, createOutline, pawOutline} from "ionicons/icons";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {
  deleteCharacterNpcRelationByIdForRoom,
  deleteNpcNpcRelation,
  getNpcByIdForRoom,
  getNpcNpcRelationsByNpcId,
  getNpcsByRoomIdForRoom,
  getRelationsByNpcId,
  saveCharacterNpcRelationForRoom,
  saveNpcNpcRelation,
} from "@/api/npcApi";
import type {
  CharacterNpcRelationDto,
  NpcDto,
  NpcNpcRelationDto,
  NpcTypeEnum,
  RelationTypeEnum,
  SaveCharacterNpcRelationRequest,
  SaveNpcNpcRelationRequest,
} from "@/api/npcApi.types";
import {marked} from "marked";
import {extractDominantColorFromUrl} from "@/utils/imageAmbient";
import {getRoomCharacters} from "@/api/masterApi";
import type {Character} from "@/components/models/response/Character";

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
const relations = ref<CharacterNpcRelationDto[]>([]);
const npcNpcRelations = ref<NpcNpcRelationDto[]>([]);
const characters = ref<Character[]>([]);
const roomNpcs = ref<NpcDto[]>([]);

// ——— Add relation modal state ———
const showAddRelation = ref(false);
const addRelationType = ref<"character" | "npc">("character");
const newRelationTargetId = ref<string>("");
const newRelationType = ref<RelationTypeEnum>("OTHER");
const newRelationNote = ref<string>("");
const savingRelation = ref(false);

const RELATION_LABELS: Record<RelationTypeEnum, string> = {
  FRIEND: "Друг",
  ENEMY: "Враг",
  RULER: "Правитель",
  PET: "Питомец",
  OTHER: "Другое",
};

const RELATION_COLORS: Record<RelationTypeEnum, { bg: string; border: string; text: string }> = {
  FRIEND:  { bg: "rgba(45, 213, 91, 0.12)",  border: "rgba(45, 213, 91, 0.4)",  text: "rgb(45, 213, 91)" },
  ENEMY:   { bg: "rgba(235, 68, 90, 0.12)",  border: "rgba(235, 68, 90, 0.4)",  text: "rgb(235, 68, 90)" },
  RULER:   { bg: "rgba(255, 196, 9, 0.12)",  border: "rgba(255, 196, 9, 0.4)",  text: "rgb(255, 196, 9)" },
  PET:     { bg: "rgba(85, 191, 255, 0.12)", border: "rgba(85, 191, 255, 0.4)", text: "rgb(85, 191, 255)" },
  OTHER:   { bg: "rgba(208, 188, 254, 0.12)", border: "rgba(208, 188, 254, 0.4)", text: "rgb(208, 188, 254)" },
};

const characterMap = computed(() => {
  const m = new Map<string, string>();
  for (const c of characters.value) {
    if (c.id) m.set(c.id, c.name ?? c.id);
  }
  return m;
});

const enrichedRelations = computed(() =>
  relations.value
    .filter((r) => r.relationType)
    .map((r) => ({
      id: r.id,
      kind: "character" as const,
      subjectName: r.characterId ? (characterMap.value.get(r.characterId) ?? "Персонаж") : "Персонаж",
      relationType: r.relationType!,
      label: RELATION_LABELS[r.relationType!] ?? r.relationType,
      colors: RELATION_COLORS[r.relationType!],
      note: r.note ?? null,
    }))
);

const npcMap = computed(() => {
  const m = new Map<string, string>();
  for (const n of roomNpcs.value) m.set(n.id, n.name);
  return m;
});

const enrichedNpcRelations = computed(() =>
  npcNpcRelations.value
    .filter((r) => r.relationType)
    .map((r) => {
      const currentId = npc.value?.id;
      const otherId = r.fromNpcId === currentId ? r.toNpcId : r.fromNpcId;
      return {
        id: r.id,
        kind: "npc" as const,
        subjectName: npcMap.value.get(otherId) ?? "NPC",
        relationType: r.relationType!,
        label: RELATION_LABELS[r.relationType!] ?? r.relationType,
        colors: RELATION_COLORS[r.relationType!],
        note: r.note ?? null,
      };
    })
);

const allRelations = computed(() => [...enrichedRelations.value, ...enrichedNpcRelations.value]);

const RELATION_TYPE_OPTIONS: RelationTypeEnum[] = ["FRIEND", "ENEMY", "RULER", "PET", "OTHER"];

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

const characterIdFromQuery = computed(() => route.query.characterId as string | undefined);

const goCreateCompanion = () => {
  const roomId = route.params.roomId as string;
  const characterId = characterIdFromQuery.value;
  const id = npc.value?.id;
  if (!characterId || !id) return;
  ionRouter.push({
    name: 'CreateCompanion',
    params: { roomId, characterId },
    query: { type: 'PET', sourceNpcId: id },
  });
};

async function loadRelations() {
  const roomId = route.params.roomId as string;
  const npcId = route.params.npcId as string;
  [relations.value, npcNpcRelations.value] = await Promise.all([
    getRelationsByNpcId(roomId, npcId),
    getNpcNpcRelationsByNpcId(roomId, npcId),
  ]);
}

async function loadNpc() {
  const roomId = route.params.roomId as string;
  const npcId = route.params.npcId as string;
  try {
    [npc.value, characters.value, roomNpcs.value] = await Promise.all([
      getNpcByIdForRoom(roomId, npcId),
      getRoomCharacters(roomId),
      getNpcsByRoomIdForRoom(roomId, { forceAll: true }),
    ]);
    await loadRelations();
  } catch (e) {
    console.error("Failed to load NPC for full view:", e);
  }
}

onMounted(loadNpc);
onIonViewWillEnter(loadNpc);

async function deleteRelation(rel: { id: string; kind: "character" | "npc" }) {
  const roomId = route.params.roomId as string;
  const npcId = route.params.npcId as string;
  try {
    if (rel.kind === "character") {
      const r = relations.value.find((x) => x.id === rel.id);
      if (r?.characterId) {
        await deleteCharacterNpcRelationByIdForRoom(roomId, r.characterId, rel.id);
      }
    } else {
      await deleteNpcNpcRelation(roomId, rel.id);
    }
    await loadRelations();
  } catch (e) {
    console.error("Failed to delete relation:", e);
  }
}

function openAddRelation() {
  newRelationTargetId.value = "";
  newRelationType.value = "OTHER";
  newRelationNote.value = "";
  addRelationType.value = "character";
  showAddRelation.value = true;
}

async function submitAddRelation() {
  const roomId = route.params.roomId as string;
  const npcId = route.params.npcId as string;
  if (!newRelationTargetId.value || savingRelation.value) return;
  savingRelation.value = true;
  try {
    if (addRelationType.value === "character") {
      const body: SaveCharacterNpcRelationRequest = {
        characterId: newRelationTargetId.value,
        npcId,
        relationType: newRelationType.value,
        note: newRelationNote.value || null,
      };
      await saveCharacterNpcRelationForRoom(roomId, newRelationTargetId.value, body);
    } else {
      const body: SaveNpcNpcRelationRequest = {
        fromNpcId: npcId,
        toNpcId: newRelationTargetId.value,
        relationType: newRelationType.value,
        note: newRelationNote.value || null,
      };
      await saveNpcNpcRelation(roomId, body);
    }
    showAddRelation.value = false;
    await loadRelations();
  } catch (e) {
    console.error("Failed to save relation:", e);
  } finally {
    savingRelation.value = false;
  }
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

        <div class="relations-panel">
          <div class="relations-panel__header">
            <div class="relations-panel__title">Связи</div>
          </div>
          <div v-if="allRelations.length" class="relations-panel__list">
            <div
                v-for="rel in allRelations"
                :key="rel.id"
                class="relation-entry"
            >
              <div
                  class="relation-chip"
                  :style="{
                    background: rel.colors.bg,
                    borderColor: rel.colors.border,
                    color: rel.colors.text,
                  }"
              >
                <span class="relation-chip__kind">{{ rel.kind === 'npc' ? 'NPC' : 'П' }}</span>
                <span class="relation-chip__sep">·</span>
                <span class="relation-chip__name">{{ rel.subjectName }}</span>
                <span class="relation-chip__sep">·</span>
                <span class="relation-chip__type">{{ rel.label }}</span>
                <button class="relation-chip__delete" @click.stop="deleteRelation(rel)" aria-label="Удалить">×</button>
              </div>
              <div v-if="rel.note" class="relation-note">{{ rel.note }}</div>
            </div>
          </div>
          <div v-else class="relations-panel__empty">Нет связей</div>
          <button class="relations-panel__add-btn" @click="openAddRelation">
            <ion-icon :icon="addOutline"/>
            Добавить связь
          </button>
        </div>

        <!-- Add relation modal -->
        <Teleport to="body">
        <div v-if="showAddRelation" class="add-relation-overlay" @click.self="showAddRelation = false">
          <div class="add-relation-modal">
            <div class="add-relation-modal__scroll">
              <div class="add-relation-modal__title">Добавить связь</div>

              <div class="add-relation-field">
                <label class="add-relation-field__label">Тип участника</label>
                <div class="add-relation-toggle">
                  <button :class="['toggle-btn', { active: addRelationType === 'character' }]" @click="addRelationType = 'character'">Персонаж</button>
                  <button :class="['toggle-btn', { active: addRelationType === 'npc' }]" @click="addRelationType = 'npc'">NPC</button>
                </div>
              </div>

              <div class="add-relation-field">
                <label class="add-relation-field__label">{{ addRelationType === 'character' ? 'Персонаж' : 'NPC' }}</label>
                <select v-model="newRelationTargetId" class="add-relation-select">
                  <option value="" disabled>Выберите...</option>
                  <template v-if="addRelationType === 'character'">
                    <option v-for="c in characters" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </template>
                  <template v-else>
                    <option v-for="n in roomNpcs.filter(n => n.id !== npc?.id)" :key="n.id" :value="n.id">{{ n.name }}</option>
                  </template>
                </select>
              </div>

              <div class="add-relation-field">
                <label class="add-relation-field__label">Отношение</label>
                <select v-model="newRelationType" class="add-relation-select">
                  <option v-for="t in RELATION_TYPE_OPTIONS" :key="t" :value="t">{{ RELATION_LABELS[t] }}</option>
                </select>
              </div>

              <div class="add-relation-field">
                <label class="add-relation-field__label">Заметка (необязательно)</label>
                <textarea v-model="newRelationNote" class="add-relation-textarea" placeholder="Описание отношения..." rows="2"/>
              </div>
            </div>

            <div class="add-relation-modal__actions">
              <button class="add-relation-modal__cancel" @click="showAddRelation = false">Отмена</button>
              <button class="add-relation-modal__save" :disabled="!newRelationTargetId || savingRelation" @click="submitAddRelation">
                {{ savingRelation ? '...' : 'Сохранить' }}
              </button>
            </div>
          </div>
        </div>
        </Teleport>

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
              <div v-if="npc.maxHp || npc.hpDiceCount" class="detail-row">
                <span class="detail-row__label">ХП</span>
                <span class="detail-row__value detail-row__value--pill">
                  <template v-if="npc.hpDiceCount && npc.hpDieSize">
                    {{ npc.hpDiceCount }}d{{ npc.hpDieSize }}<template v-if="npc.hpDiceBonus && npc.hpDiceBonus !== 0">{{ npc.hpDiceBonus > 0 ? '+' : '' }}{{ npc.hpDiceBonus }}</template><template v-if="npc.maxHp"> ({{ npc.maxHp }})</template>
                  </template>
                  <template v-else>{{ npc.maxHp }}</template>
                </span>
              </div>
            </div>
          </section>

          <section v-if="npc.abilities && npc.abilities.length > 0" class="panel">
            <h2 class="panel__title">Характеристики</h2>
            <div class="npc-abilities-grid">
              <div v-for="ab in npc.abilities" :key="ab.code" class="npc-ability-cell">
                <span class="npc-ability-cell__code">{{ ab.code }}</span>
                <span class="npc-ability-cell__val">{{ ab.value }}</span>
                <span class="npc-ability-cell__mod">{{ ab.value >= 10 ? '+' : '' }}{{ Math.floor((ab.value - 10) / 2) }}</span>
              </div>
            </div>
          </section>

          <section v-if="npc.level || npc.proficiencyBonus || npc.challengeRating" class="panel">
            <h2 class="panel__title">Боевые параметры</h2>
            <div class="detail-grid">
              <div v-if="npc.level" class="detail-row">
                <span class="detail-row__label">Уровень</span>
                <span class="detail-row__value detail-row__value--pill">{{ npc.level }}</span>
              </div>
              <div v-if="npc.proficiencyBonus" class="detail-row">
                <span class="detail-row__label">Бонус мастерства</span>
                <span class="detail-row__value detail-row__value--pill">+{{ npc.proficiencyBonus }}</span>
              </div>
              <div v-if="npc.challengeRating" class="detail-row">
                <span class="detail-row__label">Опасность (CR)</span>
                <span class="detail-row__value detail-row__value--pill">{{ npc.challengeRating }}</span>
              </div>
            </div>
          </section>

          <section v-if="npc.skills && npc.skills.length > 0" class="panel">
            <h2 class="panel__title">Навыки</h2>
            <div class="skill-chips">
              <div v-for="skill in npc.skills" :key="skill.name" class="skill-chip">
                <span class="skill-chip__name">{{ skill.name }}</span>
                <span class="skill-chip__bonus">{{ skill.bonus >= 0 ? '+' : '' }}{{ skill.bonus }}</span>
              </div>
            </div>
          </section>

          <section v-if="npc.features && npc.features.length > 0" class="panel">
            <h2 class="panel__title">Умения</h2>
            <div class="entry-list">
              <div v-for="feat in npc.features" :key="feat.name" class="entry-card entry-card--feature">
                <div class="entry-card__name">{{ feat.name }}</div>
                <div class="entry-card__desc">{{ feat.description }}</div>
              </div>
            </div>
          </section>

          <section v-if="npc.actions && npc.actions.length > 0" class="panel">
            <h2 class="panel__title">Действия</h2>
            <div class="entry-list">
              <div v-for="action in npc.actions" :key="action.name" class="entry-card entry-card--action">
                <div class="entry-card__name">{{ action.name }}</div>
                <div class="entry-card__desc">{{ action.description }}</div>
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
          v-if="characterIdFromQuery"
          class="item-footer__btn"
          expand="block"
          fill="outline"
          shape="round"
          color="secondary"
          style="margin-bottom: 8px"
          @click="goCreateCompanion"
      >
        <ion-icon slot="start" :icon="pawOutline"/>
        Создать спутника
      </ion-button>
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

.relations-panel {
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--ion-color-medium);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.1);
}

.relations-panel__header {
  margin-bottom: 10px;
}

.relations-panel__title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.relations-panel__add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin-top: 10px;
  padding: 9px;
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border: 1px dashed rgba(var(--ion-color-primary-rgb), 0.35);
  border-radius: 10px;
  color: var(--ion-color-primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s, border-color 0.15s;
}

.relations-panel__add-btn:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.18);
  border-color: rgba(var(--ion-color-primary-rgb), 0.6);
}

.relations-panel__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relations-panel__empty {
  font-size: 13px;
  color: rgba(var(--ion-color-light-rgb), 0.3);
  text-align: center;
  padding: 6px 0;
}

.relation-entry {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.relation-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  max-width: 100%;
}

.relation-chip__kind {
  font-size: 10px;
  font-weight: 800;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.relation-chip__name {
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.relation-chip__sep {
  opacity: 0.55;
  font-size: 10px;
  flex-shrink: 0;
}

.relation-chip__type {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.relation-chip__delete {
  margin-left: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.55;
  font-size: 14px;
  line-height: 1;
  padding: 0 0 0 2px;
  flex-shrink: 0;
}

.relation-chip__delete:hover {
  opacity: 1;
}

.relation-note {
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.55);
  padding-left: 14px;
  line-height: 1.4;
}

/* ——— Add relation modal ——— */
/* modal styles moved to global style block below */

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

.npc-abilities-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.npc-ability-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 8px 4px;
  background: rgba(var(--ion-color-primary-rgb), 0.07);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.18);
  border-radius: 10px;
}

.npc-ability-cell__code {
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ion-color-primary);
}

.npc-ability-cell__val {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ion-color-light);
  line-height: 1.2;
}

.npc-ability-cell__mod {
  font-size: 0.65rem;
  color: var(--ion-color-secondary);
  font-weight: 600;
}

/* Skills chips */
.skill-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.25);
}

.skill-chip__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ion-color-light);
}

.skill-chip__bonus {
  font-size: 13px;
  font-weight: 700;
  color: var(--ion-color-primary);
  font-variant-numeric: tabular-nums;
  min-width: 24px;
  text-align: center;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.18);
}

/* Features / Actions entry cards */
.entry-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.entry-card {
  padding: 10px 12px;
  border-radius: 12px;
  border-left: 3px solid transparent;
  background: rgba(var(--ion-color-light-rgb), 0.04);
}

.entry-card--feature {
  border-left-color: var(--ion-color-secondary);
}

.entry-card--action {
  border-left-color: var(--ion-color-primary);
}

.entry-card__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--ion-color-light);
  margin-bottom: 4px;
}

.entry-card__desc {
  font-size: 13px;
  line-height: 1.55;
  color: rgba(var(--ion-color-light-rgb), 0.72);
  white-space: pre-wrap;
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

<style>
.add-relation-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.add-relation-modal {
  background: #1e1e2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.add-relation-modal__title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.add-relation-modal__scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20px 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.add-relation-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.add-relation-field__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.45);
}

.add-relation-toggle {
  display: flex;
  gap: 8px;
}

.toggle-btn {
  flex: 1;
  padding: 9px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #2a2a3e;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-btn.active {
  background: rgba(99, 102, 241, 0.25);
  border-color: rgba(99, 102, 241, 0.55);
  color: #a5b4fc;
}

.add-relation-select {
  background: #2a2a3e;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 10px 12px;
  color: #ffffff;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  -webkit-appearance: none;
  appearance: none;
}

.add-relation-select option {
  background: #2a2a3e;
  color: #ffffff;
}

.add-relation-textarea {
  background: #2a2a3e;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 10px 12px;
  color: #ffffff;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  resize: none;
  font-family: inherit;
}

.add-relation-textarea::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.add-relation-modal__actions {
  display: flex;
  gap: 10px;
  padding: 12px 18px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: #1e1e2e;
  flex-shrink: 0;
}

.add-relation-modal__cancel {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #2a2a3e;
  color: rgba(255, 255, 255, 0.6);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.add-relation-modal__save {
  flex: 2;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: #6366f1;
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.add-relation-modal__save:disabled {
  opacity: 0.35;
  cursor: default;
}
</style>
