<script setup lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonToolbar,
} from '@ionic/vue'
import { addOutline, trashOutline, cameraOutline, pawOutline, sparklesOutline, flameOutline } from 'ionicons/icons'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { getCompanionById, saveCompanion } from '@/api/companionApi'
import { useCompanionsRefresh } from '@/composables/useCompanionsRefresh'
import type { CompanionDto, SaveCompanionRequest } from '@/api/companionApi.types'
import { getNpcByIdForRoom } from '@/api/npcApi'
import { FILE_STORAGE_INTEGRATION_ROUTES } from '@/config/integrationRoutes'

const DND_SKILLS = [
  'Атлетика', 'Акробатика', 'Ловкость рук', 'Скрытность',
  'История', 'Магия', 'Природа', 'Расследование', 'Религия',
  'Восприятие', 'Выживание', 'Медицина', 'Проницательность',
  'Уход за животными', 'Выступление', 'Запугивание', 'Обман', 'Убеждение',
]

const route = useRoute()
const router = useRouter()
const { markDirty } = useCompanionsRefresh()
const saving = ref(false)
const loading = ref(false)
const isEdit = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const previewImage = ref<string | null>(null)
const errorMaxHp = ref(false)
const errorName = ref(false)
const summonCount = ref(1)
const allowedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff', 'image/svg+xml']

function getImageUrl(imgUrl: string | null | undefined): string | null {
  if (!imgUrl?.trim()) return null
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
}

function triggerFileInput() { fileInput.value?.click() }

async function uploadToStorage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('userFilename', `companion-${Date.now()}`)
  const res = await axios.put(
    `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data
}

async function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  if (!file) return
  if (!allowedFormats.includes(file.type)) {
    alert('Формат не поддерживается. Разрешены: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG.')
    return
  }
  const reader = new FileReader()
  reader.onload = () => { previewImage.value = reader.result as string }
  reader.readAsDataURL(file)
  companion.value.imgUrl = await uploadToStorage(file)
}

const companion = ref<SaveCompanionRequest>({
  companionType: (route.query.type as 'PET' | 'SUMMONED') ?? 'PET',
  name: '',
  description: '',
  maxHp: undefined,
  hpDiceCount: undefined,
  hpDieSize: undefined,
  hpDiceBonus: undefined,
  armoryClass: undefined,
  speed: undefined,
  level: undefined,
  proficiencyBonus: undefined,
  challengeRating: undefined,
  skills: [],
  actions: [],
  features: [],
  strScore: undefined,
  dexScore: undefined,
  conScore: undefined,
  intScore: undefined,
  wisScore: undefined,
  chaScore: undefined,
})

onMounted(async () => {
  const roomId = route.params.roomId as string
  const characterId = route.params.characterId as string
  const id = route.query.id as string | undefined
  const sourceNpcId = route.query.sourceNpcId as string | undefined
  loading.value = true
  try {
    if (id) {
      isEdit.value = true
      const data: CompanionDto = await getCompanionById(roomId, characterId, id)
      companion.value = {
        id: data.id,
        characterId: data.characterId,
        companionType: data.companionType,
        name: data.name,
        description: data.description,
        maxHp: data.maxHp,
        hpDiceCount: data.hpDiceCount,
        hpDieSize: data.hpDieSize,
        hpDiceBonus: data.hpDiceBonus,
        armoryClass: data.armoryClass,
        speed: data.speed,
        level: data.level,
        proficiencyBonus: data.proficiencyBonus,
        challengeRating: data.challengeRating,
        skills: data.skills ? [...data.skills] : [],
        actions: data.actions ? [...data.actions] : [],
        features: data.features ? [...data.features] : [],
        strScore: data.abilities?.find(a => a.code === 'STR')?.value,
        dexScore: data.abilities?.find(a => a.code === 'DEX')?.value,
        conScore: data.abilities?.find(a => a.code === 'CON')?.value,
        intScore: data.abilities?.find(a => a.code === 'INT')?.value,
        wisScore: data.abilities?.find(a => a.code === 'WIS')?.value,
        chaScore: data.abilities?.find(a => a.code === 'CHA')?.value,
        imgUrl: data.imgUrl,
        sourceNpcId: data.sourceNpcId,
      }
      if (data.imgUrl) previewImage.value = getImageUrl(data.imgUrl)
    } else if (sourceNpcId) {
      try {
        const npc = await getNpcByIdForRoom(roomId, sourceNpcId)
        companion.value = {
          companionType: (route.query.type as 'PET' | 'SUMMONED' | 'FORM') ?? 'PET',
          name: npc.name ?? '',
          description: npc.description ?? '',
          maxHp: npc.maxHp ?? undefined,
          hpDiceCount: npc.hpDiceCount ?? undefined,
          hpDieSize: npc.hpDieSize ?? undefined,
          hpDiceBonus: npc.hpDiceBonus ?? undefined,
          armoryClass: npc.armoryClass ?? undefined,
          speed: npc.speed ?? undefined,
          level: npc.level ?? undefined,
          proficiencyBonus: npc.proficiencyBonus ?? undefined,
          challengeRating: npc.challengeRating ?? undefined,
          skills: npc.skills ? npc.skills.map(s => ({ name: s.name ?? '', bonus: s.bonus ?? 0 })) : [],
          actions: npc.actions ? npc.actions.map(a => ({ name: a.name ?? '', description: a.description ?? '' })) : [],
          features: npc.features ? npc.features.map(f => ({ name: f.name ?? '', description: f.description ?? '' })) : [],
          strScore: npc.abilities?.find(a => a.code === 'STR')?.value,
          dexScore: npc.abilities?.find(a => a.code === 'DEX')?.value,
          conScore: npc.abilities?.find(a => a.code === 'CON')?.value,
          intScore: npc.abilities?.find(a => a.code === 'INT')?.value,
          wisScore: npc.abilities?.find(a => a.code === 'WIS')?.value,
          chaScore: npc.abilities?.find(a => a.code === 'CHA')?.value,
          imgUrl: npc.imgUrl ?? undefined,
          sourceNpcId: npc.id,
        }
        if (npc.imgUrl) previewImage.value = getImageUrl(npc.imgUrl)
      } catch {}
    }
  } finally {
    loading.value = false
  }
})

function numVal(v: string): number | undefined {
  const n = parseFloat(v)
  return isNaN(n) ? undefined : n
}

function addSkill()   { companion.value.skills   = [...(companion.value.skills   ?? []), { name: '', bonus: 0 }] }
function addAction()  { companion.value.actions  = [...(companion.value.actions  ?? []), { name: '', description: '' }] }
function addFeature() { companion.value.features = [...(companion.value.features ?? []), { name: '', description: '' }] }
function removeSkill(i: number)   { companion.value.skills   = companion.value.skills?.filter((_, idx) => idx !== i) }
function removeAction(i: number)  { companion.value.actions  = companion.value.actions?.filter((_, idx) => idx !== i) }
function removeFeature(i: number) { companion.value.features = companion.value.features?.filter((_, idx) => idx !== i) }

async function submit() {
  errorName.value = !companion.value.name?.trim()
  errorMaxHp.value = !companion.value.maxHp || companion.value.maxHp <= 0
  if (errorName.value || errorMaxHp.value) return
  saving.value = true
  try {
    const roomId = route.params.roomId as string
    const characterId = route.params.characterId as string
    const count = companion.value.companionType === 'SUMMONED' && !isEdit.value
      ? Math.max(1, Math.min(50, summonCount.value || 1))
      : 1
    if (count === 1) {
      await saveCompanion(roomId, characterId, companion.value)
    } else {
      const baseName = companion.value.name?.trim() ?? ''
      await Promise.all(
        Array.from({ length: count }, (_, i) =>
          saveCompanion(roomId, characterId, {
            ...companion.value,
            name: `${baseName} #${i + 1}`,
          })
        )
      )
    }
    markDirty()
    router.back()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ion-page class="page-root">
    <ion-header>
      <ion-toolbar color="dark" class="toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/"/>
        </ion-buttons>
        <span class="toolbar__title">
          {{ isEdit
            ? (companion.companionType === 'FORM' ? 'Редактировать форму' : 'Редактировать спутника')
            : (companion.companionType === 'FORM' ? 'Новая форма' : 'Новый спутник') }}
        </span>
      </ion-toolbar>
    </ion-header>

    <ion-content color="dark" class="content">
      <div v-if="loading" class="loading-wrap">
        <ion-spinner name="crescent"/>
      </div>

      <div v-else class="form">

        <!-- ── Hero: avatar + name + type ── -->
        <div class="hero">
          <button type="button" class="avatar-btn" @click="triggerFileInput">
            <img v-if="previewImage" :src="previewImage" class="avatar-btn__img" alt=""/>
            <div v-else class="avatar-btn__placeholder">
              <ion-icon :icon="cameraOutline" class="avatar-btn__placeholder-icon"/>
              <span class="avatar-btn__placeholder-text">Фото</span>
            </div>
            <input ref="fileInput" type="file" accept="image/*" class="hidden-input" @change="handleFileUpload"/>
          </button>

          <div class="hero__right">
            <div class="field-group">
              <label class="field-label">Имя <span class="required">*</span></label>
              <input
                class="field-input"
                :class="{ 'field-input--error': errorName }"
                type="text"
                placeholder="Имя спутника"
                :value="companion.name"
                @input="(e) => { companion.name = (e.target as HTMLInputElement).value; errorName = false }"
              />
            </div>

            <div v-if="companion.companionType !== 'FORM'" class="field-group" style="margin-top: 10px">
              <label class="field-label">Тип</label>
              <div class="type-toggle">
                <button
                  type="button"
                  class="type-toggle__btn"
                  :class="{ 'type-toggle__btn--active': companion.companionType === 'PET' }"
                  @click="companion.companionType = 'PET'"
                >
                  <ion-icon :icon="pawOutline"/>
                  Питомец
                </button>
                <button
                  type="button"
                  class="type-toggle__btn"
                  :class="{ 'type-toggle__btn--active': companion.companionType === 'SUMMONED' }"
                  @click="companion.companionType = 'SUMMONED'"
                >
                  <ion-icon :icon="sparklesOutline"/>
                  Призванный
                </button>
              </div>
            </div>
            <div v-else class="field-group" style="margin-top: 10px">
              <div class="form-type-badge">
                <ion-icon :icon="flameOutline"/>
                Форма превращения
              </div>
            </div>

            <!-- Количество — только для SUMMONED при создании -->
            <div v-if="companion.companionType === 'SUMMONED' && !isEdit" class="field-group summon-count-row" style="margin-top: 10px">
              <label class="field-label">Количество</label>
              <div class="count-control">
                <button type="button" class="count-btn" @click="summonCount = Math.max(1, summonCount - 1)">−</button>
                <input
                  class="count-input"
                  type="number"
                  min="1"
                  max="50"
                  :value="summonCount"
                  @input="(e) => summonCount = Math.max(1, Math.min(50, parseInt((e.target as HTMLInputElement).value) || 1))"
                />
                <button type="button" class="count-btn" @click="summonCount = Math.min(50, summonCount + 1)">+</button>
              </div>
              <span v-if="summonCount > 1" class="count-hint">
                Создаст {{ summonCount }} копий: «{{ companion.name || 'Имя' }} #1» … «{{ companion.name || 'Имя' }} #{{ summonCount }}»
              </span>
            </div>
          </div>
        </div>

        <!-- ── Description ── -->
        <div class="panel">
          <div class="panel__title">Описание</div>
          <textarea
            class="field-textarea"
            placeholder="Краткое описание..."
            rows="3"
            :value="companion.description"
            @input="(e) => companion.description = (e.target as HTMLTextAreaElement).value"
          />
        </div>

        <!-- ── Combat stats ── -->
        <div class="panel">
          <div class="panel__title">Боевые характеристики</div>

          <!-- HP row: big maxHp + dice -->
          <div class="hp-row">
            <div class="hp-main">
              <label class="field-label">Макс. ХП <span class="required">*</span></label>
              <input
                class="field-input field-input--center"
                :class="{ 'field-input--error': errorMaxHp }"
                type="number"
                placeholder="—"
                :value="companion.maxHp ?? ''"
                @input="(e) => { companion.maxHp = numVal((e.target as HTMLInputElement).value); errorMaxHp = false }"
              />
            </div>
            <div class="hp-dice">
              <label class="field-label">Кости ХП</label>
              <div class="dice-row">
                <input class="field-input field-input--center dice-input" type="number" placeholder="—"
                  :value="companion.hpDiceCount ?? ''"
                  @input="(e) => companion.hpDiceCount = numVal((e.target as HTMLInputElement).value)"/>
                <span class="dice-sep">d</span>
                <input class="field-input field-input--center dice-input" type="number" placeholder="—"
                  :value="companion.hpDieSize ?? ''"
                  @input="(e) => companion.hpDieSize = numVal((e.target as HTMLInputElement).value)"/>
                <span class="dice-sep">+</span>
                <input class="field-input field-input--center dice-input" type="number" placeholder="—"
                  :value="companion.hpDiceBonus ?? ''"
                  @input="(e) => companion.hpDiceBonus = numVal((e.target as HTMLInputElement).value)"/>
              </div>
            </div>
          </div>

          <!-- Stats grid -->
          <div class="stats-grid">
            <div class="stat-cell">
              <label class="stat-cell__label">КД</label>
              <input class="field-input field-input--center" type="text" placeholder="—"
                :value="companion.armoryClass ?? ''"
                @input="(e) => companion.armoryClass = (e.target as HTMLInputElement).value || undefined"/>
            </div>
            <div class="stat-cell">
              <label class="stat-cell__label">Скорость</label>
              <input class="field-input field-input--center" type="text" placeholder="—"
                :value="companion.speed ?? ''"
                @input="(e) => companion.speed = (e.target as HTMLInputElement).value || undefined"/>
            </div>
            <div class="stat-cell">
              <label class="stat-cell__label">Уровень</label>
              <input class="field-input field-input--center" type="number" placeholder="—"
                :value="companion.level ?? ''"
                @input="(e) => companion.level = numVal((e.target as HTMLInputElement).value)"/>
            </div>
            <div class="stat-cell">
              <label class="stat-cell__label">Маст.</label>
              <input class="field-input field-input--center" type="number" placeholder="—"
                :value="companion.proficiencyBonus ?? ''"
                @input="(e) => companion.proficiencyBonus = numVal((e.target as HTMLInputElement).value)"/>
            </div>
            <div class="stat-cell">
              <label class="stat-cell__label">Опасность</label>
              <input class="field-input field-input--center" type="text" placeholder="—"
                :value="companion.challengeRating ?? ''"
                @input="(e) => companion.challengeRating = (e.target as HTMLInputElement).value || undefined"/>
            </div>
          </div>
        </div>

        <!-- ── Abilities ── -->
        <div class="panel">
          <div class="panel__title">Характеристики</div>
          <div class="abilities-grid">
            <div v-for="ab in [
              { label: 'СИЛ', field: 'strScore' }, { label: 'ЛОВ', field: 'dexScore' },
              { label: 'ТЕЛ', field: 'conScore' }, { label: 'ИНТ', field: 'intScore' },
              { label: 'МУД', field: 'wisScore' }, { label: 'ХАР', field: 'chaScore' },
            ]" :key="ab.field" class="ability-cell">
              <label class="ability-cell__label">{{ ab.label }}</label>
              <input
                class="ability-cell__input"
                type="number"
                placeholder="—"
                :value="(companion as any)[ab.field] ?? ''"
                @input="(e) => (companion as any)[ab.field] = numVal((e.target as HTMLInputElement).value)"
              />
              <span class="ability-cell__mod">
                {{ (companion as any)[ab.field] != null
                  ? ((Math.floor(((companion as any)[ab.field] - 10) / 2) >= 0 ? '+' : '') + Math.floor(((companion as any)[ab.field] - 10) / 2))
                  : '—' }}
              </span>
            </div>
          </div>
        </div>

        <!-- ── Skills ── -->
        <div class="panel">
          <div class="panel__header">
            <span class="panel__title">Навыки</span>
            <button type="button" class="add-btn" @click="addSkill">
              <ion-icon :icon="addOutline"/>
              Добавить
            </button>
          </div>
          <div v-if="!companion.skills?.length" class="panel__empty">Нет навыков</div>
          <div v-for="(skill, i) in companion.skills" :key="i" class="list-row">
            <select
              class="field-select"
              :value="skill.name"
              @change="(e) => skill.name = (e.target as HTMLSelectElement).value"
            >
              <option value="" disabled>Навык</option>
              <option
                v-for="s in DND_SKILLS.filter(s => s === skill.name || !companion.skills?.some(sk => sk.name === s))"
                :key="s" :value="s"
              >{{ s }}</option>
            </select>
            <input class="field-input field-input--center bonus-input" type="number" placeholder="±0"
              :value="skill.bonus ?? 0"
              @input="(e) => skill.bonus = parseInt((e.target as HTMLInputElement).value) || 0"/>
            <button type="button" class="icon-btn icon-btn--danger" @click="removeSkill(i)">
              <ion-icon :icon="trashOutline"/>
            </button>
          </div>
        </div>

        <!-- ── Features ── -->
        <div class="panel">
          <div class="panel__header">
            <span class="panel__title">Умения</span>
            <button type="button" class="add-btn" @click="addFeature">
              <ion-icon :icon="addOutline"/>
              Добавить
            </button>
          </div>
          <div v-if="!companion.features?.length" class="panel__empty">Нет умений</div>
          <div v-for="(feat, i) in companion.features" :key="i" class="entry-card entry-card--feature">
            <div class="entry-card__header">
              <input class="field-input entry-name-input" type="text" placeholder="Название"
                :value="feat.name"
                @input="(e) => feat.name = (e.target as HTMLInputElement).value"/>
              <button type="button" class="icon-btn icon-btn--danger" @click="removeFeature(i)">
                <ion-icon :icon="trashOutline"/>
              </button>
            </div>
            <textarea class="field-textarea" placeholder="Описание..." rows="2"
              :value="feat.description"
              @input="(e) => feat.description = (e.target as HTMLTextAreaElement).value"/>
          </div>
        </div>

        <!-- ── Actions ── -->
        <div class="panel">
          <div class="panel__header">
            <span class="panel__title">Действия</span>
            <button type="button" class="add-btn" @click="addAction">
              <ion-icon :icon="addOutline"/>
              Добавить
            </button>
          </div>
          <div v-if="!companion.actions?.length" class="panel__empty">Нет действий</div>
          <div v-for="(action, i) in companion.actions" :key="i" class="entry-card entry-card--action">
            <div class="entry-card__header">
              <input class="field-input entry-name-input" type="text" placeholder="Название"
                :value="action.name"
                @input="(e) => action.name = (e.target as HTMLInputElement).value"/>
              <button type="button" class="icon-btn icon-btn--danger" @click="removeAction(i)">
                <ion-icon :icon="trashOutline"/>
              </button>
            </div>
            <textarea class="field-textarea" placeholder="Описание..." rows="2"
              :value="action.description"
              @input="(e) => action.description = (e.target as HTMLTextAreaElement).value"/>
          </div>
        </div>

      </div>
    </ion-content>

    <!-- ── Fixed save footer ── -->
    <div class="footer">
      <button type="button" class="save-btn" :disabled="saving" @click="submit">
        <ion-spinner v-if="saving" name="crescent" class="save-btn__spinner"/>
        <span v-else-if="isEdit">Сохранить изменения</span>
        <span v-else-if="companion.companionType === 'SUMMONED' && summonCount > 1">
          Призвать {{ summonCount }} существ
        </span>
        <span v-else>Создать спутника</span>
      </button>
    </div>
  </ion-page>
</template>

<style scoped>
.page-root {
  --footer-height: 72px;
}

.toolbar {
  --min-height: 44px;
}

.toolbar__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.content {
  --background: var(--ion-color-dark);
  --padding-bottom: calc(var(--footer-height) + env(safe-area-inset-bottom, 0px) + 16px);
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 48px;
}

/* ── Form wrapper ── */
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px;
  max-width: 720px;
  margin: 0 auto;
}

/* ── Hero ── */
.hero {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.avatar-btn {
  flex-shrink: 0;
  width: 110px;
  height: 110px;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: border-color 0.15s;
}

.avatar-btn:active {
  border-color: var(--ion-color-primary);
}

.avatar-btn__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-btn__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  color: rgba(var(--ion-color-primary-rgb), 0.6);
}

.avatar-btn__placeholder-icon {
  font-size: 28px;
}

.avatar-btn__placeholder-text {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hidden-input { display: none; }

.hero__right {
  flex: 1;
  min-width: 0;
}

/* ── Type toggle ── */
.type-toggle {
  display: flex;
  gap: 6px;
}

.type-toggle__btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 6px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(var(--ion-color-light-rgb), 0.5);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.type-toggle__btn ion-icon {
  font-size: 14px;
}

.type-toggle__btn--active {
  background: rgba(var(--ion-color-primary-rgb), 0.18);
  border-color: rgba(var(--ion-color-primary-rgb), 0.5);
  color: var(--ion-color-primary);
}

/* ── Panels ── */
.panel {
  background: var(--ion-color-medium);
  border-radius: 16px;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.08);
  padding: 14px;
}

.panel__title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.4);
  margin-bottom: 12px;
}

.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.panel__header .panel__title {
  margin-bottom: 0;
}

.panel__empty {
  font-size: 13px;
  color: rgba(var(--ion-color-light-rgb), 0.3);
  text-align: center;
  padding: 6px 0;
}

/* ── Field label ── */
.field-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.45);
  margin-bottom: 5px;
}

.required {
  color: var(--ion-color-danger);
}

/* ── Inputs ── */
.field-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 9px 12px;
  color: var(--ion-color-light);
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.15s;
}

.field-input::placeholder {
  color: rgba(var(--ion-color-light-rgb), 0.25);
}

.field-input:focus {
  outline: none;
  border-color: rgba(var(--ion-color-primary-rgb), 0.55);
  background: rgba(255, 255, 255, 0.08);
}

.field-input--center {
  text-align: center;
  padding: 9px 6px;
}

.field-input--error {
  border-color: rgba(var(--ion-color-danger-rgb), 0.7) !important;
  background: rgba(var(--ion-color-danger-rgb), 0.07) !important;
}

.field-textarea {
  display: block;
  width: 100%;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 9px 12px;
  color: var(--ion-color-light);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  transition: border-color 0.15s;
}

.field-textarea::placeholder {
  color: rgba(var(--ion-color-light-rgb), 0.25);
}

.field-textarea:focus {
  outline: none;
  border-color: rgba(var(--ion-color-primary-rgb), 0.55);
  background: rgba(255, 255, 255, 0.08);
}

.field-select {
  display: block;
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 9px 10px;
  color: var(--ion-color-light);
  font-size: 13px;
  font-family: inherit;
  -webkit-appearance: none;
  appearance: none;
}

.field-select:focus {
  outline: none;
  border-color: rgba(var(--ion-color-primary-rgb), 0.55);
}

.field-select option {
  background: #1e1e2e;
  color: var(--ion-color-light);
}

/* ── HP row ── */
.hp-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.hp-main {
  width: 90px;
  flex-shrink: 0;
}

.hp-main .field-input {
  font-size: 22px;
  font-weight: 700;
  padding: 10px 6px;
  color: var(--ion-color-primary);
}

.hp-dice {
  flex: 1;
  min-width: 0;
}

.dice-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dice-input {
  flex: 1;
  min-width: 0;
  font-size: 13px;
}

.dice-sep {
  font-size: 14px;
  font-weight: 700;
  color: rgba(var(--ion-color-light-rgb), 0.35);
  flex-shrink: 0;
}

/* ── Stats grid ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-cell__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.4);
  text-align: center;
}

/* ── Abilities ── */
.abilities-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.ability-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: rgba(var(--ion-color-primary-rgb), 0.06);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.15);
  border-radius: 10px;
  padding: 8px 4px;
}

.ability-cell__label {
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ion-color-primary);
}

.ability-cell__input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(var(--ion-color-primary-rgb), 0.25);
  border-radius: 0;
  padding: 2px 0;
  color: var(--ion-color-light);
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
  font-family: inherit;
}

.ability-cell__input:focus {
  outline: none;
  border-bottom-color: var(--ion-color-primary);
}

.ability-cell__mod {
  font-size: 0.6rem;
  color: var(--ion-color-secondary);
  font-weight: 600;
}

/* ── List rows (skills) ── */
.list-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.list-row:last-child {
  border-bottom: none;
}

.bonus-input {
  width: 58px;
  flex-shrink: 0;
  font-size: 13px;
}

/* ── Entry cards (features/actions) ── */
.entry-card {
  padding: 10px;
  border-radius: 12px;
  border-left: 3px solid transparent;
  background: rgba(var(--ion-color-light-rgb), 0.04);
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.entry-card:last-child {
  margin-bottom: 0;
}

.entry-card--feature { border-left-color: var(--ion-color-secondary); }
.entry-card--action  { border-left-color: var(--ion-color-primary); }

.entry-card__header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.entry-name-input {
  flex: 1;
  font-weight: 600;
}

/* ── Add button ── */
.add-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px dashed rgba(var(--ion-color-primary-rgb), 0.35);
  background: rgba(var(--ion-color-primary-rgb), 0.07);
  color: var(--ion-color-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.add-btn:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.14);
}

.add-btn ion-icon {
  font-size: 14px;
}

/* ── Icon button ── */
.icon-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.15s;
}

.icon-btn--danger {
  color: var(--ion-color-danger);
  border-color: rgba(var(--ion-color-danger-rgb), 0.2);
}

.icon-btn--danger:hover {
  background: rgba(var(--ion-color-danger-rgb), 0.1);
}

/* ── Footer ── */
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  background: rgba(var(--ion-color-dark-rgb), 0.94);
  border-top: 1px solid rgba(var(--ion-color-primary-rgb), 0.1);
  backdrop-filter: blur(12px);
}

.save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: none;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
  font-family: inherit;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.save-btn__spinner {
  width: 20px;
  height: 20px;
}

/* ── Summon count ── */
.count-control {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.35);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
}

.count-btn {
  width: 36px;
  height: 36px;
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border: none;
  color: var(--ion-color-primary);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}

.count-btn:active {
  background: rgba(var(--ion-color-primary-rgb), 0.2);
}

.count-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  color: var(--ion-color-light);
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  font-family: inherit;
  font-variant-numeric: tabular-nums;
  padding: 6px 0;
}

.count-input:focus {
  outline: none;
}

.count-hint {
  display: block;
  margin-top: 5px;
  font-size: 11px;
  color: rgba(var(--ion-color-light-rgb), 0.45);
  line-height: 1.4;
}

@media (min-width: 1024px) {
  .form {
    max-width: 720px;
  }

  .footer {
    max-width: 720px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 16px 16px 0 0;
  }
}

.form-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  background: rgba(var(--ion-color-secondary-rgb), 0.12);
  border: 1px solid rgba(var(--ion-color-secondary-rgb), 0.35);
  color: var(--ion-color-secondary);
  font-size: 13px;
  font-weight: 700;
}
</style>
