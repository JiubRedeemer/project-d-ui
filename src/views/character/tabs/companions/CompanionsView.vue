<script setup lang="ts">
import {
  IonButton,
  IonIcon,
  IonSpinner,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue'
import {
  addOutline,
  pawOutline,
  sparklesOutline,
  trashOutline,
  createOutline,
  chevronDownOutline,
  chevronUpOutline,
} from 'ionicons/icons'
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCompanionsRefresh } from '@/composables/useCompanionsRefresh'
import {
  getCompanionsByCharacterId,
  deleteCompanion,
  updateCompanionCurrentHp,
} from '@/api/companionApi'
import { FILE_STORAGE_INTEGRATION_ROUTES } from '@/config/integrationRoutes'
import type { CompanionDto } from '@/api/companionApi.types'

const route = useRoute()
const router = useIonRouter()
const companions = ref<CompanionDto[]>([])
const loading = ref(false)
const expanded = ref<Record<string, boolean>>({})
const hpManage = ref<Record<string, string>>({})

async function load() {
  const roomId = route.params.roomId as string
  const characterId = route.params.characterId as string
  loading.value = true
  try {
    companions.value = await getCompanionsByCharacterId(roomId, characterId) ?? []
  } finally {
    loading.value = false
  }
}

const { isDirty, clearDirty } = useCompanionsRefresh()

onMounted(load)
onIonViewWillEnter(load)

watch(isDirty, (dirty) => {
  if (dirty) {
    clearDirty()
    load()
  }
})

const SECTIONS = [
  { type: 'PET'     as const, icon: pawOutline,      iconClass: 'section__icon--pet',      title: 'Питомцы',            empty: 'Нет питомцев' },
  { type: 'SUMMONED'as const, icon: sparklesOutline, iconClass: 'section__icon--summoned', title: 'Призванные',          empty: 'Нет призванных существ' },
]

function sectionItems(type: 'PET' | 'SUMMONED') {
  return companions.value.filter(c => c.companionType === type)
}

function toggleExpand(id: string) {
  expanded.value[id] = !expanded.value[id]
}

function toggleHpManage(id: string) {
  if (hpManage.value[id] !== undefined) {
    delete hpManage.value[id]
  } else {
    hpManage.value[id] = ''
  }
}

async function applyHpDelta(c: CompanionDto, sign: 1 | -1) {
  const delta = parseInt(hpManage.value[c.id] ?? '')
  if (isNaN(delta) || delta <= 0) return
  const newHp = Math.max(0, Math.min(c.maxHp ?? 0, (c.currentHp ?? 0) + sign * delta))
  hpManage.value[c.id] = ''
  const roomId = route.params.roomId as string
  const characterId = route.params.characterId as string
  await updateCompanionCurrentHp(roomId, characterId, c.id, newHp)
  c.currentHp = newHp
}


function goCreate(type: 'PET' | 'SUMMONED') {
  router.push({
    name: 'CreateCompanion',
    params: { roomId: route.params.roomId, characterId: route.params.characterId },
    query: { type },
  })
}

function goEdit(c: CompanionDto) {
  router.push({
    name: 'CreateCompanion',
    params: { roomId: route.params.roomId, characterId: route.params.characterId },
    query: { id: c.id, type: c.companionType },
  })
}

async function onDelete(c: CompanionDto) {
  const roomId = route.params.roomId as string
  const characterId = route.params.characterId as string
  await deleteCompanion(roomId, characterId, c.id)
  companions.value = companions.value.filter(x => x.id !== c.id)
}



function hpPercent(c: CompanionDto) {
  if (!c.maxHp || c.maxHp === 0) return 0
  return Math.max(0, Math.min(100, Math.round(((c.currentHp ?? 0) / c.maxHp) * 100)))
}

function hpBarColor(pct: number): string {
  if (pct > 60) return 'var(--ion-color-success, #2ecc71)'
  if (pct > 30) return '#f39c12'
  return 'var(--ion-color-danger, #e74c3c)'
}

function getImageUrl(imgUrl: string | undefined | null): string | null {
  if (!imgUrl?.trim()) return null
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
}

function abilityMod(score: number | undefined | null): string {
  if (score == null) return '—'
  const mod = Math.floor((score - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

const ABILITY_KEYS = [
  { label: 'СИЛ', code: 'STR' },
  { label: 'ЛОВ', code: 'DEX' },
  { label: 'ТЕЛ', code: 'CON' },
  { label: 'ИНТ', code: 'INT' },
  { label: 'МУД', code: 'WIS' },
  { label: 'ХАР', code: 'CHA' },
]

function hasDetails(c: CompanionDto) {
  return (
    !!c.challengeRating ||
    !!c.proficiencyBonus ||
    (c.skills && c.skills.length > 0) ||
    (c.features && c.features.length > 0)
  )
}
</script>

<template>
  <div class="companions-view">
    <div v-if="loading" class="spinner-wrap">
      <ion-spinner name="crescent"/>
    </div>

    <template v-else>
      <div v-for="section in SECTIONS" :key="section.type" class="section">
        <div class="section__header">
          <ion-icon :icon="section.icon" class="section__icon" :class="section.iconClass"/>
          <span class="section__title">{{ section.title }}</span>
          <ion-button fill="clear" size="small" @click="goCreate(section.type)">
            <ion-icon :icon="addOutline" slot="icon-only"/>
          </ion-button>
        </div>
        <p v-if="sectionItems(section.type).length === 0" class="section__empty">{{ section.empty }}</p>

        <div v-for="c in sectionItems(section.type)" :key="c.id" class="card">
          <div class="card__hero">
            <div class="card__avatar">
              <img v-if="getImageUrl(c.imgUrl)" :src="getImageUrl(c.imgUrl)!" :alt="c.name" class="card__avatar-img"/>
              <ion-icon v-else :icon="section.icon" class="card__avatar-placeholder" :class="section.iconClass"/>
            </div>

            <div class="card__main">
              <div class="card__name-row">
                <span class="card__name">{{ c.name }}</span>
                <div class="card__actions">
                  <ion-button fill="clear" size="small" @click="goEdit(c)">
                    <ion-icon :icon="createOutline" slot="icon-only"/>
                  </ion-button>
                  <ion-button fill="clear" size="small" color="danger" @click="onDelete(c)">
                    <ion-icon :icon="trashOutline" slot="icon-only"/>
                  </ion-button>
                </div>
              </div>

              <div class="card__hp">
                <div class="card__hp-bar-wrap" @click="toggleHpManage(c.id)">
                  <div class="card__hp-bar" :style="{ width: hpPercent(c) + '%', background: hpBarColor(hpPercent(c)) }"/>
                </div>
                <button class="card__hp-text" @click="toggleHpManage(c.id)">
                  {{ c.currentHp ?? 0 }} / {{ c.maxHp ?? 0 }}
                </button>
              </div>

              <div v-if="hpManage[c.id] !== undefined" class="hp-manage-row">
                <input type="number" class="hp-manage-input" v-model="hpManage[c.id]"
                  placeholder="0" min="0" @keyup.enter="applyHpDelta(c, -1)"/>
                <button class="btn btn--danger" @click="applyHpDelta(c, -1)">— Урон</button>
                <button class="btn btn--success" @click="applyHpDelta(c, 1)">+ Лечение</button>
              </div>
            </div>
          </div>

          <div class="card__stats">
            <div v-if="c.armoryClass" class="card__stat">
              <span class="card__stat-label">КД</span>
              <span class="card__stat-pill">{{ c.armoryClass }}</span>
            </div>
            <div v-if="c.speed" class="card__stat">
              <span class="card__stat-label">Скор.</span>
              <span class="card__stat-pill">{{ c.speed }}</span>
            </div>
            <div v-if="c.level" class="card__stat">
              <span class="card__stat-label">Ур.</span>
              <span class="card__stat-pill">{{ c.level }}</span>
            </div>
          </div>

          <!-- Compact abilities -->
          <div v-if="c.abilities && c.abilities.length > 0" class="card__abilities-compact">
            <div v-for="ab in ABILITY_KEYS" :key="ab.code" class="card__ab">
              <span class="card__ab-code">{{ ab.label }}</span>
              <span class="card__ab-val">{{ c.abilities!.find(a => a.code === ab.code)?.value ?? '—' }}</span>
              <span class="card__ab-mod">{{ abilityMod(c.abilities!.find(a => a.code === ab.code)?.value) }}</span>
            </div>
          </div>

          <!-- Actions always visible -->
          <div v-if="c.actions && c.actions.length > 0" class="card__actions-list">
            <div v-for="a in c.actions" :key="a.name" class="card__action-entry">
              <span class="card__action-name">{{ a.name }}</span>
              <span v-if="a.description" class="card__action-desc">{{ a.description }}</span>
            </div>
          </div>
          <p v-else-if="c.description" class="card__desc">{{ c.description }}</p>

          <button v-if="hasDetails(c)" class="card__expand-btn" @click="toggleExpand(c.id)">
            <ion-icon :icon="expanded[c.id] ? chevronUpOutline : chevronDownOutline"/>
            {{ expanded[c.id] ? 'Скрыть детали' : 'Подробнее' }}
          </button>

          <div v-if="expanded[c.id]" class="card__details">
            <div v-if="c.challengeRating || c.proficiencyBonus" class="detail-section">
              <div class="detail-section__title">Параметры</div>
              <div class="inline-stats">
                <div v-if="c.challengeRating" class="card__stat">
                  <span class="card__stat-label">CR</span>
                  <span class="card__stat-pill">{{ c.challengeRating }}</span>
                </div>
                <div v-if="c.proficiencyBonus" class="card__stat">
                  <span class="card__stat-label">Маст.</span>
                  <span class="card__stat-pill">+{{ c.proficiencyBonus }}</span>
                </div>
              </div>
            </div>

            <div v-if="c.skills && c.skills.length > 0" class="detail-section">
              <div class="detail-section__title">Навыки</div>
              <div class="skill-chips">
                <div v-for="sk in c.skills" :key="sk.name" class="skill-chip">
                  <span class="skill-chip__name">{{ sk.name }}</span>
                  <span class="skill-chip__bonus">{{ (sk.bonus ?? 0) >= 0 ? '+' : '' }}{{ sk.bonus ?? 0 }}</span>
                </div>
              </div>
            </div>

            <div v-if="c.features && c.features.length > 0" class="detail-section">
              <div class="detail-section__title">Умения</div>
              <div class="entry-list">
                <div v-for="f in c.features" :key="f.name" class="entry-card entry-card--feature">
                  <div class="entry-card__name">{{ f.name }}</div>
                  <div v-if="f.description" class="entry-card__desc">{{ f.description }}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.companions-view {
  padding-bottom: 80px;
}

.spinner-wrap {
  display: flex;
  justify-content: center;
  padding: 40px;
}

/* ── Section ── */
.section {
  margin-bottom: 28px;
}

.section__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 10px;
}

.section__icon {
  font-size: 18px;
}

.section__icon--pet { color: #e67e22; }
.section__icon--summoned { color: #9b59b6; }

.section__title {
  flex: 1;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.section__empty {
  font-size: 13px;
  color: var(--ion-color-secondary);
  padding: 6px 2px;
  margin: 0;
}

/* ── Card ── */
.card {
  background: var(--ion-color-medium);
  border-radius: 16px;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.1);
  margin-bottom: 10px;
  padding: 12px 14px;
}

/* Hero row: avatar + main */
.card__hero {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.card__avatar {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card__avatar-placeholder {
  font-size: 28px;
}

.card__avatar-placeholder.section__icon--pet      { color: #e67e22; }
.card__avatar-placeholder.section__icon--summoned { color: #9b59b6; }

.card__main {
  flex: 1;
  min-width: 0;
}

.card__name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 6px;
}

.card__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card__actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 0;
}

/* HP bar */
.card__hp {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.card__hp-bar-wrap {
  flex: 1;
  height: 7px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
}

.card__hp-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease, background 0.3s ease;
}

.card__hp-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--ion-color-secondary);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: underline dotted rgba(var(--ion-color-secondary-rgb), 0.5);
  text-underline-offset: 2px;
}

/* HP manage row */
.hp-manage-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.hp-manage-input {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
  border-radius: 8px;
  color: var(--ion-color-light);
  padding: 5px 8px;
  font-size: 0.82rem;
  width: 62px;
  font-variant-numeric: tabular-nums;
}

.hp-manage-input:focus {
  outline: none;
  border-color: rgba(var(--ion-color-primary-rgb), 0.6);
}

.btn {
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.btn:active { opacity: 0.75; }

.btn--danger {
  background: rgba(var(--ion-color-danger-rgb), 0.14);
  color: var(--ion-color-danger);
  border-color: rgba(var(--ion-color-danger-rgb), 0.28);
}

.btn--success {
  background: rgba(var(--ion-color-success-rgb), 0.14);
  color: var(--ion-color-success);
  border-color: rgba(var(--ion-color-success-rgb), 0.28);
}


/* Stats row */
.card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.card__stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card__stat-label {
  font-size: 11px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  font-weight: 600;
}

.card__stat-pill {
  font-size: 12px;
  font-weight: 700;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.14);
  padding: 2px 8px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}

/* Compact abilities row */
.card__abilities-compact {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  margin-top: 8px;
}

.card__ab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 5px 2px;
  background: rgba(var(--ion-color-primary-rgb), 0.06);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.14);
  border-radius: 8px;
}

.card__ab-code {
  font-size: 0.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ion-color-primary);
}

.card__ab-val {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--ion-color-light);
  line-height: 1.1;
}

.card__ab-mod {
  font-size: 0.55rem;
  color: var(--ion-color-secondary);
  font-weight: 600;
}

/* Inline stats inside spoiler */
.inline-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Inline actions */
.card__actions-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.card__action-entry {
  padding: 6px 10px;
  border-radius: 8px;
  border-left: 3px solid var(--ion-color-primary);
  background: rgba(var(--ion-color-light-rgb), 0.04);
}

.card__action-name {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.card__action-desc {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(var(--ion-color-light-rgb), 0.62);
  white-space: pre-wrap;
}

/* Description */
.card__desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(var(--ion-color-light-rgb), 0.6);
  white-space: pre-wrap;
}

/* Expand button */
.card__expand-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 6px 10px;
  width: 100%;
  justify-content: center;
  background: rgba(var(--ion-color-primary-rgb), 0.07);
  border: 1px dashed rgba(var(--ion-color-primary-rgb), 0.25);
  border-radius: 10px;
  color: var(--ion-color-primary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.15s;
}

.card__expand-btn:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.14);
}

/* Details panel */
.card__details {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Detail section inside expanded */
.detail-section__title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.4);
  margin-bottom: 8px;
}

/* Abilities grid */
.abilities-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 5px;
}

.ability-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 7px 4px;
  background: rgba(var(--ion-color-primary-rgb), 0.07);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.18);
  border-radius: 10px;
}

.ability-cell__code {
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ion-color-primary);
}

.ability-cell__val {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ion-color-light);
  line-height: 1.2;
}

.ability-cell__mod {
  font-size: 0.6rem;
  color: var(--ion-color-secondary);
  font-weight: 600;
}

/* Skill chips */
.skill-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.skill-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.25);
}

.skill-chip__name {
  font-size: 12px;
  font-weight: 500;
  color: var(--ion-color-light);
}

.skill-chip__bonus {
  font-size: 12px;
  font-weight: 700;
  color: var(--ion-color-primary);
  font-variant-numeric: tabular-nums;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.18);
}

/* Entry cards */
.entry-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.entry-card {
  padding: 8px 10px;
  border-radius: 10px;
  border-left: 3px solid transparent;
  background: rgba(var(--ion-color-light-rgb), 0.04);
}

.entry-card--feature { border-left-color: var(--ion-color-secondary); }
.entry-card--action  { border-left-color: var(--ion-color-primary); }

.entry-card__name {
  font-size: 13px;
  font-weight: 700;
  color: var(--ion-color-light);
  margin-bottom: 3px;
}

.entry-card__desc {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(var(--ion-color-light-rgb), 0.68);
  white-space: pre-wrap;
}
</style>
