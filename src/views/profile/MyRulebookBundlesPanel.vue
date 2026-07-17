<script setup lang="ts">
import {
  IonButton,
  IonIcon,
  IonInput,
  IonSpinner,
  IonTextarea,
  IonToggle,
  onIonViewWillEnter,
  toastController,
  useIonRouter,
} from "@ionic/vue";
import { computed, onMounted, ref, watch } from "vue";
import {
  addOutline,
  bookOutline,
  chevronBackOutline,
  closeOutline,
  constructOutline,
  createOutline,
  cubeOutline,
  documentTextOutline,
  lockClosedOutline,
  peopleOutline,
  trashOutline,
} from "ionicons/icons";
import type { RulebookBundleCategory, RulebookBundleDto } from "@/api/rulebookBundleApi.types";
import {
  createRulebookBundle,
  deleteBundleBackground,
  deleteBundleClass,
  deleteBundleRace,
  deleteRulebookBundle,
  getBundleBackgrounds,
  getBundleClasses,
  getBundleRaces,
  getOwnRulebookBundles,
  updateRulebookBundle,
} from "@/api/rulebookBundleApi";

const props = defineProps<{ category: RulebookBundleCategory }>();
const ionRouter = useIonRouter();

const CATEGORY_LABEL: Record<RulebookBundleCategory, string> = {
  RACE: "рас",
  CLAZZ: "классов",
  BACKGROUND: "предысторий",
  BLUEPRINT: "чертежей",
};

const CATEGORY_ICON: Record<RulebookBundleCategory, string> = {
  RACE: peopleOutline,
  CLAZZ: bookOutline,
  BACKGROUND: documentTextOutline,
  BLUEPRINT: constructOutline,
};
const categoryIcon = computed(() => CATEGORY_ICON[props.category]);

const bundles = ref<RulebookBundleDto[]>([]);
const isLoading = ref(false);

// Форма набора
const showForm = ref(false);
const editingId = ref<string | null>(null);
const formName = ref("");
const formDescription = ref("");
const formEdition = ref("");
const formIsPublic = ref(false);
const isSaving = ref(false);

// Открытый набор → его контент
const openBundle = ref<RulebookBundleDto | null>(null);
const contentItems = ref<Array<{ id?: string; name: string }>>([]);
const contentLoading = ref(false);

async function toast(message: string) {
  const t = await toastController.create({ message, duration: 1800, position: "top" });
  await t.present();
}

async function load() {
  isLoading.value = true;
  try {
    const all = await getOwnRulebookBundles();
    bundles.value = all.filter((b) => b.category === props.category);
  } catch (e) {
    console.error("Не удалось загрузить наборы правил", e);
  } finally {
    isLoading.value = false;
  }
}

onMounted(load);
watch(() => props.category, () => {
  closeForm();
  openBundle.value = null;
  void load();
});

// Возврат со страницы редактора контента — обновляем список набора/наборов.
onIonViewWillEnter(() => {
  if (openBundle.value?.id) void loadContent();
  else void load();
});

// ── CRUD набора ──
function openCreateForm() {
  editingId.value = null;
  formName.value = "";
  formDescription.value = "";
  formEdition.value = "";
  formIsPublic.value = false;
  showForm.value = true;
}

function openEditForm(bundle: RulebookBundleDto) {
  editingId.value = bundle.id ?? null;
  formName.value = bundle.name ?? "";
  formDescription.value = bundle.description ?? "";
  formEdition.value = bundle.editionCode ?? "";
  formIsPublic.value = Boolean(bundle.isPublic);
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingId.value = null;
}

async function submitForm() {
  if (!formName.value.trim()) return;
  isSaving.value = true;
  try {
    const payload: Partial<RulebookBundleDto> = {
      name: formName.value.trim(),
      description: formDescription.value.trim() || null,
      editionCode: formEdition.value.trim() || "CUSTOM",
      category: props.category,
      isPublic: formIsPublic.value,
    };
    if (editingId.value) {
      await updateRulebookBundle(editingId.value, payload);
    } else {
      await createRulebookBundle(payload);
    }
    closeForm();
    await load();
  } catch (e) {
    console.error("Не удалось сохранить набор", e);
    await toast("Не удалось сохранить набор");
  } finally {
    isSaving.value = false;
  }
}

async function removeBundle(bundle: RulebookBundleDto) {
  if (!bundle.id) return;
  if (!confirm(`Удалить набор «${bundle.name}» вместе со всем содержимым?`)) return;
  try {
    await deleteRulebookBundle(bundle.id);
    bundles.value = bundles.value.filter((b) => b.id !== bundle.id);
  } catch (e) {
    console.error("Не удалось удалить набор", e);
    await toast("Не удалось удалить набор");
  }
}

// ── Контент набора ──
async function open(bundle: RulebookBundleDto) {
  openBundle.value = bundle;
  await loadContent();
}

async function loadContent() {
  if (!openBundle.value?.id) return;
  contentLoading.value = true;
  try {
    const id = openBundle.value.id;
    if (props.category === "RACE") contentItems.value = await getBundleRaces(id);
    else if (props.category === "CLAZZ") contentItems.value = await getBundleClasses(id);
    else contentItems.value = await getBundleBackgrounds(id);
  } catch (e) {
    console.error("Не удалось загрузить содержимое", e);
  } finally {
    contentLoading.value = false;
  }
}

function editorPath(contentId?: string): string {
  const base = `/my-bundles/rulebook/${props.category}/${openBundle.value!.id}`;
  return contentId ? `${base}/edit/${contentId}` : `${base}/new`;
}

function addContent() {
  ionRouter.push(editorPath());
}

function editContent(item: { id?: string }) {
  if (item.id) ionRouter.push(editorPath(item.id));
}

async function removeContent(item: { id?: string }) {
  if (!item.id) return;
  try {
    if (props.category === "RACE") await deleteBundleRace(item.id);
    else if (props.category === "CLAZZ") await deleteBundleClass(item.id);
    else await deleteBundleBackground(item.id);
    contentItems.value = contentItems.value.filter((c) => c.id !== item.id);
  } catch (e) {
    console.error("Не удалось удалить элемент", e);
    await toast("Не удалось удалить элемент");
  }
}

const heading = computed(() => `Мои наборы ${CATEGORY_LABEL[props.category]}`);

// Возврат к списку наборов, когда открыт контент — обновляем список на всякий случай
function backToList() {
  openBundle.value = null;
  void load();
}
</script>

<template>
  <div class="bundles-page">
    <!-- Список наборов -->
    <template v-if="!openBundle">
      <!-- Hero -->
      <div class="bundles-hero">
        <div class="bundles-hero__icon">
          <ion-icon :icon="categoryIcon" />
        </div>
        <div class="bundles-hero__text">
          <h2 class="bundles-hero__title">{{ heading }}</h2>
          <p class="bundles-hero__subtitle">Всего <b>{{ bundles.length }}</b></p>
        </div>
        <ion-button
            class="hero-create-btn"
            size="small"
            shape="round"
            @click="showForm ? closeForm() : openCreateForm()"
        >
          <ion-icon slot="start" :icon="showForm ? closeOutline : addOutline" />
          {{ showForm ? "Отменить" : "Создать" }}
        </ion-button>
      </div>

      <!-- Форма -->
      <Transition name="form-slide">
        <div v-if="showForm" class="bundle-form">
          <div class="bundle-form__fields">
            <ion-input v-model="formName" placeholder="Название набора" class="bundle-form__input" />
            <ion-textarea v-model="formDescription" placeholder="Описание" :rows="2" class="bundle-form__input" />
            <ion-input v-model="formEdition" placeholder="Код издания (напр. MY_HOMEBREW)" class="bundle-form__input" />
          </div>
          <div class="bundle-form__row">
            <span class="bundle-form__row-label">Публичный набор</span>
            <ion-toggle v-model="formIsPublic" />
          </div>
          <ion-button
              class="bundle-form__save"
              expand="block"
              shape="round"
              :disabled="!formName.trim() || isSaving"
              @click="submitForm"
          >
            <ion-spinner v-if="isSaving" name="crescent" />
            <span v-else>{{ editingId ? "Сохранить изменения" : "Создать набор" }}</span>
          </ion-button>
        </div>
      </Transition>

      <div v-if="isLoading" class="bundles-list">
        <div v-for="n in 3" :key="n" class="bundle-card bundle-card--skeleton">
          <div class="bundle-card__art skeleton-block" />
          <div class="bundle-card__body">
            <div class="skeleton-line" style="width: 55%" />
            <div class="skeleton-line skeleton-line--thin" style="width: 80%" />
          </div>
        </div>
      </div>

      <div v-else-if="!bundles.length && !showForm" class="bundles-empty">
        <ion-icon :icon="categoryIcon" class="bundles-empty__icon" />
        <span>У вас пока нет своих наборов {{ CATEGORY_LABEL[props.category] }}</span>
        <ion-button size="small" fill="outline" shape="round" @click="openCreateForm">
          <ion-icon slot="start" :icon="addOutline" />
          Создать первый
        </ion-button>
      </div>

      <div v-else class="bundles-list">
        <div v-for="bundle in bundles" :key="bundle.id" class="bundle-card" @click="open(bundle)">
          <div class="bundle-card__art-wrap">
            <div class="bundle-card__art bundle-card__art--placeholder">
              <ion-icon :icon="categoryIcon" />
            </div>
          </div>
          <div class="bundle-card__body">
            <div class="bundle-card__name">{{ bundle.name }}</div>
            <div v-if="bundle.description" class="bundle-card__description">{{ bundle.description }}</div>
            <div class="bundle-card__meta">
              <span v-if="bundle.editionCode && bundle.editionCode !== 'CUSTOM'" class="bundle-badge">{{ bundle.editionCode }}</span>
              <span v-if="bundle.isPublic" class="bundle-badge bundle-badge--public">Публичный</span>
              <span v-else class="bundle-badge">
                <ion-icon :icon="lockClosedOutline" />
                Приватный
              </span>
            </div>
          </div>
          <div class="bundle-card__actions" @click.stop>
            <ion-button size="small" fill="clear" @click="openEditForm(bundle)">
              <ion-icon slot="icon-only" :icon="createOutline" />
            </ion-button>
            <ion-button size="small" fill="clear" color="danger" @click="removeBundle(bundle)">
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-button>
          </div>
        </div>
      </div>
    </template>

    <!-- Содержимое набора -->
    <template v-else>
      <div class="bundle-items">
        <div class="bundle-items__header">
          <div class="bundle-items__title-wrap">
            <button type="button" class="bundle-items__back" @click="backToList">
              <ion-icon :icon="chevronBackOutline" />
              Наборы
            </button>
            <h3 class="bundle-items__title">{{ openBundle.name }}</h3>
          </div>
          <ion-button size="small" shape="round" @click="addContent">
            <ion-icon slot="start" :icon="addOutline" />
            Добавить
          </ion-button>
        </div>

        <div v-if="contentLoading" class="bundles-empty bundles-empty--sm">
          <ion-spinner name="crescent" />
        </div>
        <div v-else-if="!contentItems.length" class="bundles-empty bundles-empty--sm">
          <ion-icon :icon="categoryIcon" class="bundles-empty__icon" />
          <span>В наборе пока нет элементов</span>
        </div>
        <div v-else class="bundles-list">
          <div v-for="item in contentItems" :key="item.id" class="bundle-card" @click="editContent(item)">
            <div class="bundle-card__art-wrap">
              <div class="bundle-card__art bundle-card__art--placeholder">
                <ion-icon :icon="cubeOutline" />
              </div>
            </div>
            <div class="bundle-card__body">
              <div class="bundle-card__name">{{ item.name }}</div>
            </div>
            <div class="bundle-card__actions" @click.stop>
              <ion-button size="small" fill="clear" @click="editContent(item)">
                <ion-icon slot="icon-only" :icon="createOutline" />
              </ion-button>
              <ion-button size="small" fill="clear" color="danger" @click="removeContent(item)">
                <ion-icon slot="icon-only" :icon="trashOutline" />
              </ion-button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.bundles-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 820px;
  margin: 0 auto;
  width: 100%;
  padding-bottom: 24px;
}

/* Hero */
.bundles-hero {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(var(--ion-color-primary-rgb), 0.22) 0%, rgba(var(--ion-color-medium-rgb), 0.85) 55%, rgba(var(--ion-color-dark-rgb), 0.9) 100%);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.25);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.bundles-hero__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  flex-shrink: 0;
  background: rgba(var(--ion-color-primary-rgb), 0.25);
  color: var(--ion-color-primary);
  font-size: 24px;
  box-shadow: inset 0 0 0 1px rgba(var(--ion-color-primary-rgb), 0.35);
}

.bundles-hero__text {
  flex: 1;
  min-width: 0;
}

.bundles-hero__title {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  color: var(--ion-color-light);
}

.bundles-hero__subtitle {
  margin: 3px 0 0;
  font-size: 12.5px;
  color: rgba(var(--ion-color-light-rgb), 0.6);
}

.bundles-hero__subtitle b {
  color: var(--ion-color-primary);
}

.hero-create-btn {
  flex-shrink: 0;
  --box-shadow: 0 6px 16px rgba(var(--ion-color-primary-rgb), 0.3);
  font-weight: 700;
}

/* Форма */
.bundle-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.88) 100%);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  overflow: hidden;
}

.bundle-form__fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bundle-form__input {
  --background: rgba(var(--ion-color-dark-rgb), 0.4);
  --padding-start: 12px;
  --padding-end: 12px;
  --border-radius: 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.07);
}

.bundle-form__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 14px;
  color: var(--ion-color-light);
  padding: 4px 2px;
}

.bundle-form__save {
  margin-top: 4px;
  --box-shadow: 0 6px 16px rgba(var(--ion-color-primary-rgb), 0.28);
  font-weight: 700;
}

/* Пустое состояние */
.bundles-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 16px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  font-size: 14px;
  text-align: center;
}

.bundles-empty--sm {
  padding: 24px 16px;
}

.bundles-empty__icon {
  font-size: 42px;
  opacity: 0.5;
}

/* Карточки */
.bundles-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bundle-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.88) 100%);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.07);
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.bundle-card:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--ion-color-primary-rgb), 0.35);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.3);
}

.bundle-card__art-wrap {
  position: relative;
  flex-shrink: 0;
}

.bundle-card__art {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  object-fit: cover;
  display: block;
  background: rgba(var(--ion-color-dark-rgb), 0.5);
  box-shadow: inset 0 0 0 1px rgba(var(--ion-color-light-rgb), 0.08);
}

.bundle-card__art--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: rgba(var(--ion-color-primary-rgb), 0.6);
}

.bundle-card__body {
  flex: 1;
  min-width: 0;
}

.bundle-card__name {
  font-size: 15.5px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.bundle-card__description {
  margin-top: 3px;
  font-size: 12.5px;
  line-height: 1.35;
  color: rgba(var(--ion-color-light-rgb), 0.55);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bundle-card__meta {
  margin-top: 7px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.bundle-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(var(--ion-color-light-rgb), 0.08);
  color: rgba(var(--ion-color-light-rgb), 0.65);
}

.bundle-badge ion-icon {
  font-size: 12px;
}

.bundle-badge--public {
  background: rgba(var(--ion-color-primary-rgb), 0.14);
  color: var(--ion-color-primary);
  box-shadow: inset 0 0 0 1px rgba(var(--ion-color-primary-rgb), 0.22);
}

.bundle-card__actions {
  display: flex;
  flex-shrink: 0;
}

/* Содержимое набора */
.bundle-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bundle-items__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
}

.bundle-items__title-wrap {
  min-width: 0;
}

.bundle-items__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font-size: 12.5px;
  color: rgba(var(--ion-color-light-rgb), 0.6);
}

.bundle-items__back ion-icon {
  font-size: 16px;
}

.bundle-items__title {
  margin: 4px 0 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--ion-color-light);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Скелетоны / анимация формы */
.skeleton-block,
.skeleton-line {
  background: linear-gradient(90deg, rgba(var(--ion-color-light-rgb), 0.06), rgba(var(--ion-color-light-rgb), 0.12), rgba(var(--ion-color-light-rgb), 0.06));
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 8px;
}

.bundle-card--skeleton {
  cursor: default;
}

.bundle-card--skeleton .bundle-card__art {
  width: 64px;
  height: 64px;
}

.skeleton-line {
  height: 12px;
  margin-bottom: 8px;
}

.skeleton-line--thin {
  height: 9px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.form-slide-enter-active,
.form-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.form-slide-enter-from,
.form-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
