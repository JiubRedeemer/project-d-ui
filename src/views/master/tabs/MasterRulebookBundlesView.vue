<script setup lang="ts">
import { IonIcon, IonSpinner, IonToggle, toastController } from "@ionic/vue";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { bookOutline, chevronDownOutline, chevronForwardOutline, peopleOutline, documentTextOutline } from "ionicons/icons";
import type { RulebookBundleCategory, RulebookBundleContentDto, RulebookBundleDto } from "@/api/rulebookBundleApi.types";
import {
  disableRulebookBundleForRoom,
  disableRulebookContentForRoom,
  enableRulebookBundleForRoom,
  enableRulebookContentForRoom,
  getRulebookBundleContentForRoom,
  getRulebookBundlesForRoom,
} from "@/api/rulebookBundleApi";
import { useGuidebookStore } from "@/stores/GuidebookStore";

const props = defineProps<{ category: RulebookBundleCategory }>();
const guidebookStore = useGuidebookStore();

const route = useRoute();
const roomId = computed(() => String(route.params.roomId));

const bundles = ref<RulebookBundleDto[]>([]);
const isLoading = ref(false);
const togglingIds = ref<Set<string>>(new Set());

// Раскрытие набора и его элементы
const expandedId = ref<string | null>(null);
const contentByBundle = ref<Record<string, RulebookBundleContentDto[]>>({});
const contentLoading = ref<Set<string>>(new Set());
const contentToggling = ref<Set<string>>(new Set());

const CATEGORY_META: Record<RulebookBundleCategory, { label: string; icon: string }> = {
  RACE: { label: "Расы", icon: peopleOutline },
  CLAZZ: { label: "Классы", icon: bookOutline },
  BACKGROUND: { label: "Предыстории", icon: documentTextOutline },
};

/** Бандлы выбранной категории (расы/классы/предыстории), по одному на издание. */
const categoryBundles = computed(() =>
  bundles.value
    .filter((b) => b.category === props.category)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
);

const enabledCount = computed(() => categoryBundles.value.filter((b) => b.enabled).length);

const SYSTEM_EDITIONS: Record<string, string> = {
  "2014": "D&D 2014",
  "2024": "D&D 2024",
  "SRD_2024": "SRD 5.2.1",
  "ORASCA": "Ораска",
};

/** Заголовок строки: для системных изданий — их название, для кастомных наборов — имя набора. */
function editionTitle(b: RulebookBundleDto): string {
  const code = b.editionCode ?? "";
  return SYSTEM_EDITIONS[code] ?? b.name?.trim() ?? code ?? "Другое";
}

/** Подпись под заголовком: имя набора для системных изданий (не дублируем для кастомных). */
function editionSubtitle(b: RulebookBundleDto): string | null {
  const code = b.editionCode ?? "";
  if (SYSTEM_EDITIONS[code]) return b.name?.trim() || null;
  return null;
}

async function toast(message: string) {
  const t = await toastController.create({ message, duration: 1800, position: "bottom" });
  await t.present();
}

async function load() {
  isLoading.value = true;
  try {
    bundles.value = await getRulebookBundlesForRoom(roomId.value);
  } catch (e) {
    console.error("Не удалось загрузить наборы правил", e);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => void load());

async function toggle(bundle: RulebookBundleDto) {
  if (!bundle.id || togglingIds.value.has(bundle.id)) return;
  const next = !bundle.enabled;
  togglingIds.value.add(bundle.id);
  try {
    if (next) await enableRulebookBundleForRoom(roomId.value, bundle.id);
    else await disableRulebookBundleForRoom(roomId.value, bundle.id);
    bundle.enabled = next;
    guidebookStore.invalidate();
    // при смене «весь набор» обновляем состояние элементов, если раскрыт
    if (expandedId.value === bundle.id) await loadContent(bundle.id);
  } catch (e) {
    console.error("Не удалось переключить набор", e);
    await toast("Не удалось переключить набор");
  } finally {
    togglingIds.value.delete(bundle.id);
  }
}

async function toggleExpand(bundle: RulebookBundleDto) {
  if (!bundle.id) return;
  if (expandedId.value === bundle.id) {
    expandedId.value = null;
    return;
  }
  expandedId.value = bundle.id;
  if (!contentByBundle.value[bundle.id]) await loadContent(bundle.id);
}

async function loadContent(bundleId: string) {
  contentLoading.value.add(bundleId);
  try {
    contentByBundle.value[bundleId] = await getRulebookBundleContentForRoom(roomId.value, bundleId);
  } catch (e) {
    console.error("Не удалось загрузить элементы набора", e);
  } finally {
    contentLoading.value.delete(bundleId);
  }
}

async function toggleItem(bundle: RulebookBundleDto, item: RulebookBundleContentDto) {
  if (bundle.enabled) return; // весь набор включён — элементы управляются целиком
  if (contentToggling.value.has(item.id)) return;
  const next = !item.enabled;
  contentToggling.value.add(item.id);
  try {
    if (next) await enableRulebookContentForRoom(roomId.value, item.id);
    else await disableRulebookContentForRoom(roomId.value, item.id);
    item.enabled = next;
    guidebookStore.invalidate();
  } catch (e) {
    console.error("Не удалось переключить элемент", e);
    await toast("Не удалось переключить элемент");
  } finally {
    contentToggling.value.delete(item.id);
  }
}
</script>

<template>
  <div class="rb-bundles">
    <div class="sectionHeader">
      <ion-icon :icon="CATEGORY_META[props.category].icon" />
      <span>{{ CATEGORY_META[props.category].label }}</span>
      <span v-if="enabledCount" class="rb-count">{{ enabledCount }}</span>
    </div>
    <p class="rb-hint">Соберите любой набор: можно смешивать издания — например, расы из 2024, а классы из 2014.</p>

    <div v-if="isLoading" class="rb-loading"><ion-spinner name="crescent" /></div>

    <div v-else-if="!categoryBundles.length" class="rb-empty">Нет доступных наборов этой категории.</div>

    <div v-else class="rb-cat-list">
      <div v-for="bundle in categoryBundles" :key="bundle.id" class="rb-group" :class="{ 'rb-group--on': bundle.enabled }">
        <div class="rb-cat">
          <button type="button" class="rb-expand" @click="toggleExpand(bundle)" aria-label="Показать элементы">
            <ion-icon :icon="expandedId === bundle.id ? chevronDownOutline : chevronForwardOutline" />
          </button>
          <div class="rb-cat__info" @click="toggleExpand(bundle)">
            <span class="rb-cat__label">{{ editionTitle(bundle) }}</span>
            <span v-if="editionSubtitle(bundle)" class="rb-cat__sub">{{ editionSubtitle(bundle) }}</span>
          </div>
          <ion-spinner v-if="bundle.id && togglingIds.has(bundle.id)" name="crescent" class="rb-cat__spin" />
          <ion-toggle
            v-else
            :checked="bundle.enabled"
            @ionChange="toggle(bundle)"
            aria-label="Включить весь набор"
          />
        </div>

        <div v-if="expandedId === bundle.id" class="rb-items">
          <div v-if="bundle.id && contentLoading.has(bundle.id)" class="rb-loading"><ion-spinner name="crescent" /></div>
          <template v-else>
            <div v-if="bundle.enabled" class="rb-items__note">Включён весь набор — доступны все элементы.</div>
            <div
              v-for="item in (bundle.id ? contentByBundle[bundle.id] ?? [] : [])"
              :key="item.id"
              class="rb-item"
              :class="{ 'rb-item--on': item.enabled }"
            >
              <span class="rb-item__name">{{ item.name }}</span>
              <ion-spinner v-if="contentToggling.has(item.id)" name="crescent" class="rb-cat__spin" />
              <ion-toggle
                v-else
                :checked="item.enabled"
                :disabled="bundle.enabled"
                @ionChange="toggleItem(bundle, item)"
                aria-label="Включить элемент"
              />
            </div>
            <div v-if="bundle.id && !(contentByBundle[bundle.id] ?? []).length" class="rb-items__note">В наборе нет элементов.</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rb-bundles {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 2px 28px;
}

.sectionHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.72);
}

.sectionHeader ion-icon {
  font-size: 18px;
  color: var(--ion-color-primary);
}

.rb-hint {
  margin: 0;
  font-size: 13px;
  color: rgba(var(--ion-color-light-rgb), 0.6);
}

.rb-count {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.16);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.32);
}

.rb-loading {
  display: flex;
  justify-content: center;
  padding: 28px;
}

.rb-empty {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: rgba(var(--ion-color-light-rgb), 0.6);
}

.rb-cat-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rb-group {
  border-radius: 14px;
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.92) 100%);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  transition: border-color 0.2s ease;
  overflow: hidden;
}

.rb-group--on {
  border-color: rgba(var(--ion-color-primary-rgb), 0.5);
}

.rb-cat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
}

.rb-expand {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: rgba(var(--ion-color-light-rgb), 0.6);
  cursor: pointer;
}

.rb-expand ion-icon {
  font-size: 16px;
}

.rb-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 12px 10px 40px;
}

.rb-items__note {
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  padding: 4px 0;
}

.rb-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 10px;
  background: rgba(var(--ion-color-dark-rgb), 0.35);
}

.rb-item--on {
  background: rgba(var(--ion-color-primary-rgb), 0.1);
}

.rb-item__name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--ion-color-light);
}

.rb-item ion-toggle {
  --handle-width: 16px;
  min-height: 22px;
}

.rb-cat__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
}

.rb-cat__label {
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.rb-cat__sub {
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.55);
}

.rb-cat__spin {
  width: 20px;
  height: 20px;
}
</style>
