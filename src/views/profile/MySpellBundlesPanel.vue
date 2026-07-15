<script setup lang="ts">
import { IonButton, IonIcon, IonInput, IonTextarea, IonToggle, toastController } from "@ionic/vue";
import { computed, onMounted, ref } from "vue";
import {
  add,
  addOutline,
  checkmarkCircle,
  closeOutline,
  cloudUploadOutline,
  createOutline,
  cubeOutline,
  diamondOutline,
  flameOutline,
  lockClosedOutline,
  searchOutline,
  trashOutline,
} from "ionicons/icons";
import type { SpellBundle, SpellDto } from "@/components/models/response/MagicApi";
import {
  createSpellBundle,
  deleteSpellBundle,
  deleteSpellBundleSpell,
  getMyCreatedSpells,
  getOwnSpellBundles,
  getSpellBundleSpells,
  importSpellBundleSpells,
  saveSpellBundleSpell,
  updateSpellBundle,
} from "@/api/spellBundleApi";

const bundles = ref<SpellBundle[]>([]);
const isLoading = ref(false);

// Форма бандла
const showForm = ref(false);
const editingBundleId = ref<string | null>(null);
const formName = ref("");
const formDescription = ref("");
const formIsPublic = ref(false);
const formPrice = ref<number | undefined>(undefined);
const isSaving = ref(false);

// Заклинания выбранного бандла
const selectedBundle = ref<SpellBundle | null>(null);
const bundleSpells = ref<SpellDto[]>([]);
const spellsLoading = ref(false);

// Импорт своих заклинаний
const showImportModal = ref(false);
const importSearch = ref("");
const importCandidates = ref<SpellDto[]>([]);
const importSelectedIds = ref<Set<string>>(new Set());
const importLoading = ref(false);
const isImporting = ref(false);

// Редактор заклинания
const showSpellForm = ref(false);
const editingSpell = ref<SpellDto | null>(null);
const spellNameRu = ref("");
const spellNameEn = ref("");
const spellLevel = ref("");
const spellClass = ref("");
const spellSchool = ref("");
const spellDescription = ref("");
const isSpellSaving = ref(false);

const publicCount = computed(() => bundles.value.filter(b => b.isPublic).length);
const spellName = (s: SpellDto) => s.name?.rus ?? s.name?.eng ?? Object.values(s.name ?? {})[0] ?? "—";

async function loadBundles() {
  isLoading.value = true;
  try {
    bundles.value = await getOwnSpellBundles();
  } catch (e) {
    console.error("Не удалось загрузить наборы заклинаний", e);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => void loadBundles());

function openCreateForm() {
  editingBundleId.value = null;
  formName.value = "";
  formDescription.value = "";
  formIsPublic.value = false;
  formPrice.value = undefined;
  showForm.value = true;
}

function openEditForm(bundle: SpellBundle) {
  editingBundleId.value = bundle.id;
  formName.value = bundle.name;
  formDescription.value = bundle.description ?? "";
  formIsPublic.value = bundle.isPublic ?? false;
  formPrice.value = bundle.priceCrystals || undefined;
  showForm.value = true;
}

async function submitForm() {
  if (!formName.value.trim() || isSaving.value) return;
  isSaving.value = true;
  const payload: Partial<SpellBundle> = {
    name: formName.value.trim(),
    description: formDescription.value.trim(),
    isPublic: formIsPublic.value,
    priceCrystals: formIsPublic.value ? (formPrice.value ?? 0) : 0,
  };
  try {
    if (editingBundleId.value) {
      const updated = await updateSpellBundle(editingBundleId.value, payload);
      const idx = bundles.value.findIndex(b => b.id === editingBundleId.value);
      if (idx >= 0) bundles.value[idx] = updated;
    } else {
      bundles.value.push(await createSpellBundle(payload));
    }
    showForm.value = false;
  } catch (e) {
    console.error("Не удалось сохранить набор", e);
  } finally {
    isSaving.value = false;
  }
}

async function removeBundle(bundle: SpellBundle) {
  if (!confirm(`Удалить набор «${bundle.name}»? Это затронет все комнаты, где он подключён.`)) return;
  try {
    await deleteSpellBundle(bundle.id);
    bundles.value = bundles.value.filter(b => b.id !== bundle.id);
    if (selectedBundle.value?.id === bundle.id) selectedBundle.value = null;
  } catch (e) {
    console.error("Не удалось удалить набор", e);
  }
}

async function openBundleSpells(bundle: SpellBundle) {
  selectedBundle.value = bundle;
  spellsLoading.value = true;
  try {
    bundleSpells.value = await getSpellBundleSpells(bundle.id);
  } catch (e) {
    console.error("Не удалось загрузить заклинания набора", e);
  } finally {
    spellsLoading.value = false;
  }
}

async function removeSpell(spell: SpellDto) {
  if (!spell.id || !confirm(`Удалить заклинание «${spellName(spell)}» из набора?`)) return;
  try {
    await deleteSpellBundleSpell(spell.id);
    bundleSpells.value = bundleSpells.value.filter(s => s.id !== spell.id);
  } catch (e) {
    console.error("Не удалось удалить заклинание", e);
  }
}

function openSpellForm(spell?: SpellDto) {
  editingSpell.value = spell ?? null;
  spellNameRu.value = spell?.name?.rus ?? "";
  spellNameEn.value = spell?.name?.eng ?? "";
  spellLevel.value = spell?.level ?? "";
  spellClass.value = spell?.spellClass ?? "";
  spellSchool.value = spell?.school ?? "";
  spellDescription.value = spell?.description ?? "";
  showSpellForm.value = true;
}

async function submitSpellForm() {
  if (!selectedBundle.value || !spellNameRu.value.trim() || isSpellSaving.value) return;
  isSpellSaving.value = true;
  const name: Record<string, string> = { rus: spellNameRu.value.trim() };
  if (spellNameEn.value.trim()) name.eng = spellNameEn.value.trim();
  const payload: SpellDto = {
    ...(editingSpell.value ?? {}),
    name,
    level: spellLevel.value.trim() || "0",
    spellClass: spellClass.value.trim() || undefined,
    school: spellSchool.value.trim() || "—",
    description: spellDescription.value.trim() || undefined,
    customization: true,
  };
  try {
    await saveSpellBundleSpell(selectedBundle.value.id, payload);
    showSpellForm.value = false;
    await openBundleSpells(selectedBundle.value);
  } catch (e) {
    console.error("Не удалось сохранить заклинание", e);
  } finally {
    isSpellSaving.value = false;
  }
}

async function openImportModal() {
  showImportModal.value = true;
  importSelectedIds.value = new Set();
  await loadImportCandidates();
}

async function loadImportCandidates() {
  importLoading.value = true;
  try {
    importCandidates.value = await getMyCreatedSpells(importSearch.value);
  } catch (e) {
    console.error("Не удалось загрузить заклинания для импорта", e);
  } finally {
    importLoading.value = false;
  }
}

function toggleImportSelection(spellId: string) {
  const next = new Set(importSelectedIds.value);
  if (next.has(spellId)) next.delete(spellId); else next.add(spellId);
  importSelectedIds.value = next;
}

async function submitImport() {
  if (!selectedBundle.value || importSelectedIds.value.size === 0 || isImporting.value) return;
  isImporting.value = true;
  try {
    await importSpellBundleSpells(selectedBundle.value.id, [...importSelectedIds.value]);
    showImportModal.value = false;
    await openBundleSpells(selectedBundle.value);
    const toast = await toastController.create({ message: "Заклинания импортированы", duration: 1200, position: "top" });
    await toast.present();
  } catch (e) {
    console.error("Не удалось импортировать заклинания", e);
  } finally {
    isImporting.value = false;
  }
}

const formPriceDisplay = computed({
  get: () => formPrice.value,
  set: (v: number | undefined) => { formPrice.value = v != null && v < 0 ? 0 : v; },
});
</script>

<template>
  <div class="bundles-page">
    <div class="bundles-hero">
      <div class="bundles-hero__icon"><ion-icon :icon="flameOutline" /></div>
      <div class="bundles-hero__text">
        <h2 class="bundles-hero__title">Мои наборы заклинаний</h2>
        <p class="bundles-hero__subtitle">Всего <b>{{ bundles.length }}</b><template v-if="publicCount"> · публичных <b>{{ publicCount }}</b></template></p>
      </div>
      <ion-button class="hero-create-btn" size="small" shape="round" @click="showForm ? showForm = false : openCreateForm()">
        <ion-icon slot="start" :icon="showForm ? closeOutline : addOutline" />{{ showForm ? "Отменить" : "Создать" }}
      </ion-button>
    </div>

    <Transition name="form-slide">
      <div v-if="showForm" class="bundle-form">
        <ion-input v-model="formName" type="text" placeholder="Название набора" class="bundle-form__input" />
        <ion-textarea v-model="formDescription" placeholder="Описание" :rows="2" class="bundle-form__input" />
        <div class="bundle-form__row">
          <span class="bundle-form__row-label">Публичный набор</span>
          <ion-toggle v-model="formIsPublic" />
        </div>
        <div v-if="formIsPublic" class="bundle-form__row">
          <span class="bundle-form__row-label"><ion-icon :icon="diamondOutline" />Цена <span class="bundle-form__hint">(0 — бесплатно)</span></span>
          <ion-input v-model="formPriceDisplay" type="number" inputmode="numeric" :min="0" placeholder="0" class="bundle-form__price" />
        </div>
        <ion-button class="bundle-form__save" expand="block" shape="round" :disabled="!formName.trim() || isSaving" @click="submitForm">
          {{ editingBundleId ? "Сохранить изменения" : "Создать набор" }}
        </ion-button>
      </div>
    </Transition>

    <div v-if="isLoading" class="bundles-list">
      <div v-for="n in 3" :key="n" class="bundle-card bundle-card--skeleton">
        <div class="bundle-card__body"><div class="skeleton-line" style="width: 55%" /><div class="skeleton-line skeleton-line--thin" style="width: 80%" /></div>
      </div>
    </div>

    <div v-else-if="!bundles.length && !showForm" class="bundles-empty">
      <ion-icon :icon="cubeOutline" class="bundles-empty__icon" /><span>У вас пока нет наборов заклинаний</span>
      <ion-button size="small" fill="outline" shape="round" @click="openCreateForm"><ion-icon slot="start" :icon="addOutline" />Создать первый</ion-button>
    </div>

    <div v-else class="bundles-list">
      <div v-for="bundle in bundles" :key="bundle.id" :class="['bundle-card', { 'bundle-card--selected': selectedBundle?.id === bundle.id }]" @click="openBundleSpells(bundle)">
        <div class="bundle-card__art bundle-card__art--placeholder"><ion-icon :icon="flameOutline" /></div>
        <div class="bundle-card__body">
          <div class="bundle-card__name">{{ bundle.name }}</div>
          <div v-if="bundle.description" class="bundle-card__description">{{ bundle.description }}</div>
          <div class="bundle-card__meta">
            <span v-if="bundle.isPublic && (bundle.priceCrystals ?? 0) > 0" class="bundle-badge bundle-badge--price"><ion-icon :icon="diamondOutline" />{{ bundle.priceCrystals }}</span>
            <span v-else-if="bundle.isPublic" class="bundle-badge bundle-badge--public">Публичный · бесплатно</span>
            <span v-else class="bundle-badge"><ion-icon :icon="lockClosedOutline" />Приватный</span>
          </div>
        </div>
        <div class="bundle-card__actions" @click.stop>
          <ion-button size="small" fill="clear" @click="openEditForm(bundle)"><ion-icon slot="icon-only" :icon="createOutline" /></ion-button>
          <ion-button size="small" fill="clear" color="danger" @click="removeBundle(bundle)"><ion-icon slot="icon-only" :icon="trashOutline" /></ion-button>
        </div>
      </div>
    </div>

    <div v-if="selectedBundle" class="bundle-items">
      <div class="bundle-items__header">
        <div>
          <span class="bundle-items__eyebrow">Состав набора</span>
          <h3 class="bundle-items__title">{{ selectedBundle.name }}</h3>
        </div>
        <div class="bundle-items__actions">
          <ion-button size="small" fill="outline" shape="round" @click="openSpellForm()"><ion-icon slot="start" :icon="add" />Создать</ion-button>
          <ion-button size="small" shape="round" class="import-btn" @click="openImportModal"><ion-icon slot="start" :icon="cloudUploadOutline" />Импорт</ion-button>
        </div>
      </div>

      <div v-if="spellsLoading" class="items-list">
        <div v-for="n in 3" :key="n" class="item-row item-row--skeleton"><div class="item-row__body"><div class="skeleton-line" style="width: 50%" /></div></div>
      </div>
      <div v-else-if="!bundleSpells.length" class="bundles-empty bundles-empty--sm">
        <ion-icon :icon="cubeOutline" class="bundles-empty__icon" /><span>Набор пуст — создайте или импортируйте заклинания</span>
      </div>
      <div v-else class="items-list">
        <div v-for="spell in bundleSpells" :key="spell.id" class="item-row">
          <div class="item-row__body">
            <div class="item-row__name">{{ spellName(spell) }}</div>
            <div class="item-row__meta">Ур. {{ spell.level }}<span v-if="spell.school"> · {{ spell.school }}</span></div>
          </div>
          <ion-button size="small" fill="clear" @click="openSpellForm(spell)"><ion-icon slot="icon-only" :icon="createOutline" /></ion-button>
          <ion-button size="small" fill="clear" color="danger" @click="removeSpell(spell)"><ion-icon slot="icon-only" :icon="trashOutline" /></ion-button>
        </div>
      </div>
    </div>

    <!-- Модалка редактора заклинания -->
    <Teleport to="body">
      <Transition name="import">
        <div v-if="showSpellForm" class="import-overlay" @click.self="showSpellForm = false">
          <div class="import-modal">
            <div class="import-modal__header">
              <div class="import-modal__title-wrap"><ion-icon :icon="flameOutline" /><span>{{ editingSpell ? "Редактировать заклинание" : "Новое заклинание" }}</span></div>
              <button class="import-modal__close" @click="showSpellForm = false"><ion-icon :icon="closeOutline" /></button>
            </div>
            <div class="import-modal__body spell-form-body">
              <ion-input v-model="spellNameRu" type="text" placeholder="Название (рус)" class="bundle-form__input" />
              <ion-input v-model="spellNameEn" type="text" placeholder="Name (eng)" class="bundle-form__input" />
              <ion-input v-model="spellLevel" type="text" placeholder="Уровень (0–9)" class="bundle-form__input" />
              <ion-input v-model="spellClass" type="text" placeholder="Классы (напр. WIZARD, BARD)" class="bundle-form__input" />
              <ion-input v-model="spellSchool" type="text" placeholder="Школа" class="bundle-form__input" />
              <ion-textarea v-model="spellDescription" placeholder="Описание" :rows="4" class="bundle-form__input" />
            </div>
            <div class="import-modal__footer">
              <ion-button expand="block" shape="round" :disabled="!spellNameRu.trim() || isSpellSaving" @click="submitSpellForm">
                <ion-icon slot="start" :icon="checkmarkCircle" />Сохранить
              </ion-button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Модалка импорта -->
    <Teleport to="body">
      <Transition name="import">
        <div v-if="showImportModal" class="import-overlay" @click.self="showImportModal = false">
          <div class="import-modal">
            <div class="import-modal__header">
              <div class="import-modal__title-wrap"><ion-icon :icon="cloudUploadOutline" /><span>Импорт моих заклинаний</span></div>
              <button class="import-modal__close" @click="showImportModal = false"><ion-icon :icon="closeOutline" /></button>
            </div>
            <div class="import-modal__search">
              <ion-icon :icon="searchOutline" class="import-modal__search-icon" />
              <ion-input v-model="importSearch" type="text" placeholder="Поиск по названию..." class="import-modal__search-input" @keydown.enter="loadImportCandidates" @ionBlur="loadImportCandidates" />
            </div>
            <div class="import-modal__body">
              <div v-if="importLoading" class="items-list">
                <div v-for="n in 4" :key="n" class="item-row item-row--skeleton"><div class="item-row__body"><div class="skeleton-line" style="width: 50%" /></div></div>
              </div>
              <div v-else-if="!importCandidates.length" class="bundles-empty bundles-empty--sm"><ion-icon :icon="cubeOutline" class="bundles-empty__icon" /><span>Заклинаний не найдено</span></div>
              <div v-for="spell in importCandidates" :key="spell.id" :class="['import-item', { 'import-item--selected': spell.id && importSelectedIds.has(spell.id) }]" @click="spell.id && toggleImportSelection(spell.id)">
                <div class="item-row__body">
                  <div class="item-row__name">{{ spellName(spell) }}</div>
                  <div class="item-row__meta">Ур. {{ spell.level }}</div>
                </div>
                <span class="import-item__check"><ion-icon v-if="spell.id && importSelectedIds.has(spell.id)" :icon="checkmarkCircle" /></span>
              </div>
            </div>
            <div class="import-modal__footer">
              <ion-button expand="block" shape="round" :disabled="importSelectedIds.size === 0 || isImporting" @click="submitImport">
                <ion-icon slot="start" :icon="checkmarkCircle" />Импортировать{{ importSelectedIds.size ? ` (${importSelectedIds.size})` : "" }}
              </ion-button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.bundles-page { display: flex; flex-direction: column; gap: 14px; max-width: 820px; margin: 0 auto; width: 100%; }
.bundles-hero { margin-top: 10px; display: flex; align-items: center; gap: 14px; padding: 18px; border-radius: 18px;
  background: linear-gradient(135deg, rgba(var(--ion-color-primary-rgb), 0.22) 0%, rgba(var(--ion-color-medium-rgb), 0.85) 55%, rgba(var(--ion-color-dark-rgb), 0.9) 100%);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.25); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); }
.bundles-hero__icon { display: flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
  background: rgba(var(--ion-color-primary-rgb), 0.25); color: var(--ion-color-primary); font-size: 24px; box-shadow: inset 0 0 0 1px rgba(var(--ion-color-primary-rgb), 0.35); }
.bundles-hero__text { flex: 1; min-width: 0; }
.bundles-hero__title { margin: 0; font-size: 19px; font-weight: 800; color: var(--ion-color-light); }
.bundles-hero__subtitle { margin: 3px 0 0; font-size: 12.5px; color: rgba(var(--ion-color-light-rgb), 0.6); }
.bundles-hero__subtitle b { color: var(--ion-color-primary); }
.hero-create-btn { flex-shrink: 0; font-weight: 700; }
.bundle-form { display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.88) 100%); border: 1px solid rgba(var(--ion-color-light-rgb), 0.08); }
.bundle-form__input { --background: rgba(var(--ion-color-dark-rgb), 0.4); --padding-start: 12px; --padding-end: 12px; border-radius: 12px; border: 1px solid rgba(var(--ion-color-light-rgb), 0.07); }
.bundle-form__row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 14px; color: var(--ion-color-light); padding: 4px 2px; }
.bundle-form__row-label { display: inline-flex; align-items: center; gap: 6px; }
.bundle-form__row-label ion-icon { font-size: 16px; color: #f0c04a; }
.bundle-form__hint { font-size: 11.5px; color: rgba(var(--ion-color-light-rgb), 0.45); }
.bundle-form__price { max-width: 120px; --background: rgba(var(--ion-color-dark-rgb), 0.4); border-radius: 12px; border: 1px solid rgba(var(--ion-color-light-rgb), 0.07); text-align: right; }
.bundle-form__save { margin-top: 4px; font-weight: 700; }
.bundles-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 16px; color: rgba(var(--ion-color-light-rgb), 0.5); font-size: 14px; text-align: center; }
.bundles-empty--sm { padding: 24px 16px; }
.bundles-empty__icon { font-size: 42px; opacity: 0.5; }
.bundles-list { display: flex; flex-direction: column; gap: 10px; }
.bundle-card { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.88) 100%); border: 1px solid rgba(var(--ion-color-light-rgb), 0.07); cursor: pointer; transition: transform 0.16s ease, border-color 0.2s ease; }
.bundle-card:hover { transform: translateY(-2px); border-color: rgba(var(--ion-color-primary-rgb), 0.35); }
.bundle-card--selected { border-color: rgba(var(--ion-color-primary-rgb), 0.55); box-shadow: 0 0 0 1px rgba(var(--ion-color-primary-rgb), 0.25); }
.bundle-card__art { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bundle-card__art--placeholder { background: rgba(var(--ion-color-dark-rgb), 0.5); font-size: 26px; color: rgba(var(--ion-color-primary-rgb), 0.6); }
.bundle-card__body { flex: 1; min-width: 0; }
.bundle-card__name { font-size: 15.5px; font-weight: 700; color: var(--ion-color-light); }
.bundle-card__description { margin-top: 3px; font-size: 12.5px; line-height: 1.35; color: rgba(var(--ion-color-light-rgb), 0.55); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.bundle-card__meta { margin-top: 7px; display: flex; gap: 6px; flex-wrap: wrap; }
.bundle-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; background: rgba(var(--ion-color-light-rgb), 0.08); color: rgba(var(--ion-color-light-rgb), 0.65); }
.bundle-badge ion-icon { font-size: 12px; }
.bundle-badge--public { background: rgba(var(--ion-color-primary-rgb), 0.14); color: var(--ion-color-primary); }
.bundle-badge--price { background: linear-gradient(120deg, rgba(240, 190, 60, 0.25), rgba(240, 160, 40, 0.12)); color: #f0c04a; }
.bundle-card__actions { display: flex; flex-shrink: 0; }
.bundle-items { padding: 16px; border-radius: 18px; background: linear-gradient(160deg, rgba(var(--ion-color-medium-rgb), 0.6) 0%, rgba(var(--ion-color-dark-rgb), 0.78) 100%); border: 1px solid rgba(var(--ion-color-primary-rgb), 0.18); display: flex; flex-direction: column; gap: 12px; }
.bundle-items__header { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.bundle-items__eyebrow { font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ion-color-primary); }
.bundle-items__title { margin: 2px 0 0; font-size: 17px; font-weight: 800; color: var(--ion-color-light); }
.bundle-items__actions { display: flex; gap: 6px; }
.import-btn { font-weight: 600; }
.items-list { display: flex; flex-direction: column; gap: 7px; }
.item-row { display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 14px; background: rgba(var(--ion-color-dark-rgb), 0.4); border: 1px solid rgba(var(--ion-color-light-rgb), 0.05); }
.item-row__body { flex: 1; min-width: 0; }
.item-row__name { font-size: 14px; font-weight: 650; color: var(--ion-color-light); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-row__meta { margin-top: 1px; font-size: 11.5px; color: rgba(var(--ion-color-light-rgb), 0.5); }
@keyframes shimmer { 0% { opacity: 0.45; } 50% { opacity: 0.9; } 100% { opacity: 0.45; } }
.bundle-card--skeleton, .item-row--skeleton { pointer-events: none; }
.skeleton-line { height: 13px; border-radius: 6px; background: rgba(var(--ion-color-light-rgb), 0.08); animation: shimmer 1.4s ease-in-out infinite; margin-bottom: 8px; }
.skeleton-line--thin { height: 9px; }
.form-slide-enter-active, .form-slide-leave-active { transition: opacity 0.2s ease, transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1); }
.form-slide-enter-from, .form-slide-leave-to { opacity: 0; transform: translateY(-10px); }
.import-overlay { position: fixed; inset: 0; z-index: 9000; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; }
.import-modal { width: 100%; max-width: 680px; max-height: 82vh; background: linear-gradient(170deg, #23223a 0%, #171628 100%); border-radius: 22px 22px 0 0; border-top: 1px solid rgba(255, 255, 255, 0.12); display: flex; flex-direction: column; overflow: hidden; }
.import-enter-active, .import-leave-active { transition: opacity 0.22s ease; }
.import-enter-from, .import-leave-to { opacity: 0; }
.import-modal__header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; font-size: 16px; font-weight: 700; color: #fff; border-bottom: 1px solid rgba(255, 255, 255, 0.07); }
.import-modal__title-wrap { display: inline-flex; align-items: center; gap: 9px; }
.import-modal__title-wrap ion-icon { font-size: 20px; color: var(--ion-color-primary); }
.import-modal__close { background: rgba(255, 255, 255, 0.07); border: none; border-radius: 10px; color: rgba(255, 255, 255, 0.6); font-size: 19px; cursor: pointer; display: flex; padding: 5px; }
.import-modal__search { position: relative; display: flex; align-items: center; padding: 12px 20px 8px; }
.import-modal__search-icon { position: absolute; left: 32px; z-index: 2; font-size: 17px; color: rgba(255, 255, 255, 0.4); pointer-events: none; }
.import-modal__search-input { --background: rgba(255, 255, 255, 0.06); --padding-start: 40px; --padding-end: 12px; border-radius: 12px; }
.import-modal__body { flex: 1; overflow-y: auto; padding: 6px 20px; display: flex; flex-direction: column; gap: 6px; }
.spell-form-body { padding-top: 14px; gap: 10px; }
.import-item { display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 14px; background: rgba(255, 255, 255, 0.045); border: 1px solid rgba(255, 255, 255, 0.05); cursor: pointer; }
.import-item--selected { border-color: var(--ion-color-primary); background: rgba(var(--ion-color-primary-rgb), 0.12); }
.import-item__check { width: 24px; display: flex; align-items: center; justify-content: center; color: var(--ion-color-primary); font-size: 20px; flex-shrink: 0; }
.import-modal__footer { padding: 12px 20px calc(14px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid rgba(255, 255, 255, 0.07); }
</style>
