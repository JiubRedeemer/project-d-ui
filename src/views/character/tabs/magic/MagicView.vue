<script setup lang="ts">
import {IonButton, IonIcon, onIonViewDidEnter, toastController, useIonRouter} from "@ionic/vue";
import {add, addOutline, flashOutline, removeOutline} from "ionicons/icons";
import {useRoute} from "vue-router";
import {computed, onMounted, ref} from "vue";
import {createSpellCellForBook, deleteSpellCell, updateSpellCell, useSpellCell} from "@/api/magicApi";
import type {ChargesRefillEnum, SpellBookItemDto, SpellCellDto, SpellDto} from "@/components/models/response/MagicApi";
import SpellInfoModal from "@/views/character/tabs/magic/SpellInfoModal.vue";
import {FILE_STORAGE_INTEGRATION_ROUTES, SPELL_IMAGE_PLACEHOLDER,} from "@/config/integrationRoutes";
import {useMagicStore} from "@/stores/MagicStore";

const route = useRoute();
const ionRouter = useIonRouter();
const magicStore = useMagicStore();

const spellBook = computed(() => magicStore.spellBook);
const loading = ref(true);
const error = ref<string | null>(null);

const spellBookId = computed(() => spellBook.value?.id ?? null);
const roomId = computed(() => String(route.params.roomId));
const characterId = computed(() => String(route.params.characterId));

const preparedSpells = computed(() => {
    const items = spellBook.value?.spells ?? [];
    return items.filter((item) => item.inUse === true);
});

const spellCellLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const classSpellCellLevel = -1;

const spellCellsByLevel = computed<Record<string, SpellCellDto>>(() => {
    const cells = spellBook.value?.spellCells;
    if (!cells) return {};
    if (Array.isArray(cells)) {
        return cells.reduce<Record<string, SpellCellDto>>((acc, cell) => {
            if (cell.level != null) acc[String(cell.level)] = cell;
            return acc;
        }, {});
    }
    return cells;
});

const visibleSpellCellLevels = computed(() =>
    spellCellLevels.filter((level) => getCellMaxCount(level) > 0)
);

const DEFAULT_REFILL_REST_TYPE: ChargesRefillEnum = "LONG_REST";

const spellsByLevel = computed(() => {
    const items = spellBook.value?.spells ?? [];
    const byLevel = new Map<string, SpellBookItemDto[]>();
    for (const item of items) {
        const level = item.spell?.level ?? "0";
        if (!byLevel.has(level)) {
            byLevel.set(level, []);
        }
        byLevel.get(level)!.push(item);
    }
  return Array.from(byLevel.entries()).sort(
        ([a], [b]) => parseInt(a, 10) - parseInt(b, 10)
    );
});

function getSpellName(spell: SpellDto | undefined): string {
    if (!spell?.name) return "—";
    return (spell.name as Record<string, string>).rus ?? (spell.name as Record<string, string>).en ?? "—";
}

function getDetailsLine1(spell: SpellDto | undefined): string {
    if (!spell) return "";
    const parts: string[] = [];
    if (spell.level != null) parts.push(`Уровень ${spell.level}`);
    if (spell.school) parts.push(`школа ${spell.school}`);
    if (spell.damageType) parts.push(spell.damageType);
    if (spell.healType) parts.push(spell.healType);
    if (spell.ritual) parts.push("ритуал");
    if (spell.customization) parts.push("доп.тип");
    return parts.join(", ") || "";
}

function getDetailsLine2(spell: SpellDto | undefined): string {
    if (!spell) return "";
    const parts: string[] = [];
    if (spell.useTime) parts.push(spell.useTime);
    if (spell.distance) parts.push(spell.distance);
    return parts.join(", ") || "";
}

function getSpellImageUrl(imgUrl: string | undefined): string {
    if (!imgUrl) return SPELL_IMAGE_PLACEHOLDER;
    if (imgUrl.startsWith("http")) return imgUrl;
    return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
}

function getCellForLevel(level: number): SpellCellDto | undefined {
    return spellCellsByLevel.value[String(level)];
}

function getCellMaxCount(level: number): number {
    return getCellForLevel(level)?.maxCount ?? 0;
}

function getCellCurrentCount(level: number): number {
    return getCellForLevel(level)?.currentCount ?? 0;
}

function getCellLabel(level: number): string {
    if (level === classSpellCellLevel) return "Классовые";
    return `${level} уровень`;
}

async function addNewSpellCellLevel() {
    const book = magicStore.spellBook;
    if (!book?.id) return;
    const cells = book.spellCells ?? {};
    const nextLevel = spellCellLevels.find((lvl) => cells[String(lvl)] == null);
    if (!nextLevel) {
        const toast = await toastController.create({
            message: "Все уровни ячеек уже созданы",
            duration: 1500,
            position: "top",
        });
        await toast.present();
        return;
    }
    try {
        const created = await createSpellCellForBook(book.id, {
            level: nextLevel,
            maxCount: 1,
            currentCount: 1,
            refillRestType: DEFAULT_REFILL_REST_TYPE,
        });
        magicStore.setSpellBook({
            ...book,
            spellCells: {
                ...cells,
                [String(created.level ?? nextLevel)]: created,
            },
        });
    } catch (e) {
        console.error("Failed to create spell cell:", e);
        const toast = await toastController.create({
            message: "Ошибка при создании ячейки",
            duration: 1500,
            position: "top",
            color: "danger",
        });
        await toast.present();
    }
}

async function incrementSpellCell(level: number) {
    const cell = getCellForLevel(level);
    if (!cell?.id) {
        if (level !== classSpellCellLevel) return;
        const book = magicStore.spellBook;
        if (!book?.id) return;
        try {
            const created = await createSpellCellForBook(book.id, {
                level,
                maxCount: 1,
                currentCount: 1,
                refillRestType: DEFAULT_REFILL_REST_TYPE,
            });
            magicStore.setSpellBook({
                ...book,
                spellCells: {
                    ...(book.spellCells ?? {}),
                    [String(level)]: created,
                },
            });
        } catch (e) {
            console.error("Failed to create class spell cell:", e);
        }
        return;
    }
    const nextMax = (cell.maxCount ?? 0) + 1;
    const nextCurrent = (cell.currentCount ?? 0) + 1;
    try {
        const updated = await updateSpellCell(cell.id, {
            ...cell,
            maxCount: nextMax,
            currentCount: nextCurrent,
            refillRestType: cell.refillRestType ?? DEFAULT_REFILL_REST_TYPE,
        });
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
        console.error("Failed to increment spell cell:", e);
    }
}

async function refillOneSpellCell(level: number) {
    const cell = getCellForLevel(level);
    if (!cell?.id) return;
    const currentMax = cell.maxCount ?? 0;
    const currentCurrent = cell.currentCount ?? 0;
    if (currentMax <= 0 || currentCurrent >= currentMax) return;
    try {
        const updated = await updateSpellCell(cell.id, {
            ...cell,
            currentCount: currentCurrent + 1,
            refillRestType: cell.refillRestType ?? DEFAULT_REFILL_REST_TYPE,
        });
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
        console.error("Failed to refill spell cell:", e);
    }
}

async function decrementSpellCell(level: number) {
    const cell = getCellForLevel(level);
    if (!cell?.id) return;
    const currentMax = cell.maxCount ?? 0;
    const currentCurrent = cell.currentCount ?? 0;
    try {
        if (currentMax <= 1) {
            await deleteSpellCell(cell.id);
            if (magicStore.spellBook) {
                const nextCells = { ...(magicStore.spellBook.spellCells ?? {}) };
                delete nextCells[String(level)];
                magicStore.setSpellBook({
                    ...magicStore.spellBook,
                    spellCells: nextCells,
                });
            }
            return;
        }
        const nextMax = currentMax - 1;
        const nextCurrent = Math.min(currentCurrent, nextMax);
        const updated = await updateSpellCell(cell.id, {
            ...cell,
            maxCount: nextMax,
            currentCount: nextCurrent,
            refillRestType: cell.refillRestType ?? DEFAULT_REFILL_REST_TYPE,
        });
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
        console.error("Failed to decrement spell cell:", e);
    }
}

function canUseSpell(item: SpellBookItemDto): boolean {
    const level = Number(item.spell?.level ?? 0);
    if (!Number.isFinite(level)) return false;
    if (level <= 0) return true;
    const cell = spellCellsByLevel.value[String(level)];
    return Boolean(cell?.id && (cell.currentCount ?? 0) > 0);
}

async function useSpell(item: SpellBookItemDto) {
    const level = Number(item.spell?.level ?? 0);
    if (!Number.isFinite(level)) return;
    if (level <= 0) {
        return;
    }
    const cell = spellCellsByLevel.value[String(level)];
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

function openSearchView() {
    ionRouter.navigate(
        "/rooms/" + route.params.roomId + "/characters/" + route.params.characterId + "/magic/search",
        "forward",
        "push"
    );
}

const selectedSpellId = ref<string | null>(null);
const showSpellModal = ref(false);

const selectedSpellItem = computed(() => {
    if (!selectedSpellId.value || !spellBook.value?.spells) return null;
    return spellBook.value.spells.find((s) => s.spellId === selectedSpellId.value) ?? null;
});

function openSpellModal(item: SpellBookItemDto) {
    selectedSpellId.value = item.spellId ?? null;
    showSpellModal.value = true;
}

function closeSpellModal() {
    showSpellModal.value = false;
    selectedSpellId.value = null;
}

async function ensureDefaultSpellCell() {
    const book = magicStore.spellBook;
    if (!book?.id) return;
    const cells = book.spellCells ?? {};
    if (Object.keys(cells).length > 0) return;
    try {
        const created = await createSpellCellForBook(book.id, {
            level: 1,
            maxCount: 1,
            currentCount: 1,
            refillRestType: DEFAULT_REFILL_REST_TYPE,
        });
        magicStore.setSpellBook({
            ...book,
            spellCells: {
                ...cells,
                [String(created.level ?? 1)]: created,
            },
        });
    } catch (e) {
        console.error("Failed to create default spell cell:", e);
    }
}

const loadMagicData = async () => {
    loading.value = true;
    error.value = null;
    try {
        await magicStore.updateSpellBookInStore(roomId.value, characterId.value);
        await ensureDefaultSpellCell();
    } catch (e) {
        console.error("Failed to load spell book:", e);
        error.value = "Не удалось загрузить книгу заклинаний";
    } finally {
        loading.value = false;
    }
};

onMounted(loadMagicData);
onIonViewDidEnter(loadMagicData);
</script>

<template>
  <div class="magic-body">
    <div v-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <template v-else>
      <div class="spell-cells">
        <div class="spell-cells-header">
          <div class="spell-cells-title">Ячейки заклинаний</div>
          <ion-button size="small" fill="solid" shape="round" color="secondary" @click="addNewSpellCellLevel">
            <ion-icon slot="icon-only" :icon="addOutline"/>
          </ion-button>
        </div>
        <div class="spell-cells-grid">
          <div
            class="spell-cell-row"
            v-for="level in visibleSpellCellLevels"
            :key="level"
          >
            <div class="spell-cell-level">{{ getCellLabel(level) }}</div>
            <div class="spell-cell-dots">
              <span
                v-for="n in getCellMaxCount(level)"
                :key="n"
                class="spell-cell-dot"
                :class="{ filled: n <= getCellCurrentCount(level) }"
                @click="refillOneSpellCell(level)"
              />
            </div>
            <div class="spell-cell-actions">
              <ion-button
                size="small"
                fill="solid"
                shape="round"
                color="medium"
                @click="decrementSpellCell(level)"
              >
                <ion-icon slot="icon-only" :icon="removeOutline"/>
              </ion-button>
              <ion-button
                size="small"
                fill="solid"
                shape="round"
                color="secondary"
                @click="incrementSpellCell(level)"
              >
                <ion-icon slot="icon-only" :icon="addOutline"/>
              </ion-button>
            </div>
          </div>
          <div class="spell-cell-row" :key="classSpellCellLevel">
            <div class="spell-cell-level">{{ getCellLabel(classSpellCellLevel) }}</div>
            <div class="spell-cell-dots">
              <span
                v-for="n in getCellMaxCount(classSpellCellLevel)"
                :key="n"
                class="spell-cell-dot"
                :class="{ filled: n <= getCellCurrentCount(classSpellCellLevel) }"
                @click="refillOneSpellCell(classSpellCellLevel)"
              />
              <span v-if="getCellMaxCount(classSpellCellLevel) === 0" class="spell-cell-empty">—</span>
            </div>
            <div class="spell-cell-actions">
              <ion-button
                size="small"
                fill="solid"
                shape="round"
                color="medium"
                :disabled="getCellMaxCount(classSpellCellLevel) === 0"
                @click="decrementSpellCell(classSpellCellLevel)"
              >
                <ion-icon slot="icon-only" :icon="removeOutline"/>
              </ion-button>
              <ion-button
                size="small"
                fill="solid"
                shape="round"
                color="secondary"
                @click="incrementSpellCell(classSpellCellLevel)"
              >
                <ion-icon slot="icon-only" :icon="addOutline"/>
              </ion-button>
            </div>
          </div>
        </div>
      </div>
      <h1 class="sectionHeader" v-if="preparedSpells.length > 0">Подготовлено</h1>
      <div class="spell-list" v-if="preparedSpells.length > 0">
        <div class="section" v-for="item in preparedSpells" :key="item.id">
          <div class="section-start-block" @click="openSpellModal(item)">
            <div class="image-block">
              <img
                width="55"
                height="55"
                class="spell-image"
                :src="getSpellImageUrl(item.spell?.imgUrl)"
                :alt="getSpellName(item.spell)"
              />
            </div>
            <div class="stats-block">
              <div class="item-name">{{ getSpellName(item.spell) }}</div>
              <div class="item-stats">{{ getDetailsLine1(item.spell) }}</div>
              <div class="item-stats">{{ getDetailsLine2(item.spell) }}</div>
            </div>
          </div>
          <div class="star-button-block">
            <ion-button
              @click.stop="useSpell(item)"
              size="small"
              shape="round"
              class="star-button"
              :disabled="!canUseSpell(item)"
            >
              <ion-icon slot="icon-only" :icon="flashOutline"/>
            </ion-button>
          </div>
        </div>
      </div>

      <template v-for="[level, items] in spellsByLevel" :key="level">
        <h1 class="sectionHeader">{{ level }} уровень</h1>
        <div class="spell-list">
          <div class="section" v-for="item in items" :key="item.id">
            <div class="section-start-block" @click="openSpellModal(item)">
              <div class="image-block">
                <img
                  width="55"
                  height="55"
                  class="spell-image"
                  :src="getSpellImageUrl(item.spell?.imgUrl)"
                  :alt="getSpellName(item.spell)"
                />
              </div>
              <div class="stats-block">
                <div class="item-name">{{ getSpellName(item.spell) }}</div>
                <div class="item-stats">{{ getDetailsLine1(item.spell) }}</div>
                <div class="item-stats">{{ getDetailsLine2(item.spell) }}</div>
              </div>
            </div>
            <div class="star-button-block">
              <ion-button
                @click.stop="useSpell(item)"
                size="small"
                shape="round"
                class="star-button"
                :disabled="!canUseSpell(item)"
              >
                <ion-icon slot="icon-only" :icon="flashOutline"/>
              </ion-button>
            </div>
          </div>
        </div>
      </template>

      <div v-if="!loading && !error && (!spellBook?.spells?.length)" class="empty">
        Нет заклинаний
      </div>

      <div class="add-new-button">
        <ion-button size="large" shape="round" color="secondary" @click="openSearchView">
          <ion-icon slot="icon-only" :icon="add"/>
        </ion-button>
      </div>

      <SpellInfoModal
        :isOpen="showSpellModal"
        :item="selectedSpellItem ?? null"
        :spell-book-id="spellBookId ?? null"
        @closeSpellInfoModal="closeSpellModal"
      />
    </template>
  </div>
</template>

<style scoped>
.magic-body {
}

.loading,
.error,
.empty {
  color: var(--ion-color-light);
  padding: 1rem;
  text-align: center;
}

.error {
  color: var(--ion-color-danger);
}

.sectionHeader {
  color: var(--ion-color-light);
  font-size: 22px;
  font-weight: normal;
  margin-top: 10px;
}

.spell-cells {
  background-color: var(--ion-color-medium);
  border-radius: 25px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.spell-cells-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.spell-cells-title {
  color: var(--ion-color-light);
  font-size: 16px;
  font-weight: 600;
}

.spell-cells-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spell-cell-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.spell-cell-level {
  color: var(--ion-color-light);
  font-size: 12px;
  min-width: 70px;
}

.spell-cell-dots {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.spell-cell-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.spell-cell-actions ion-button {
  --padding-start: 6px;
  --padding-end: 6px;
  --padding-top: 6px;
  --padding-bottom: 6px;
  height: 24px;
}

.spell-cell-actions ion-icon {
  width: 14px;
  height: 14px;
}

.spell-cell-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid #7c5cc4;
  background: transparent;
  box-shadow: 0 0 0 1px rgba(124, 92, 196, 0.25);
}

.spell-cell-dot.filled {
  background: #b38cff;
  border-color: #b38cff;
  box-shadow: 0 0 6px rgba(179, 140, 255, 0.6);
}

.spell-cell-empty {
  color: var(--ion-color-light-shade);
  font-size: 10px;
}

.spell-list {
}

.section {
  background-color: var(--ion-color-medium);
  border-radius: 25px;
  padding: 10px;
  overflow: hidden;
  max-height: 75px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.section-start-block {
  display: flex;
  flex-direction: row;
  justify-content: start;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.star-button-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  min-width: 45px;
}

.star-button {
  --background: #4a2c6e;
  --background-hover: #5a3c7e;
  --background-activated: #3a1c5e;
  --background-focused: #4a2c6e;
  --color: white;
  --border-radius: 50%;
}

.star-button::part(native) {
  width: 45px;
  height: 45px;
}

.star-button ion-icon {
  width: 24px;
  height: 24px;
}

.item-name {
  font-size: 16px;
  font-weight: bold;
}

.item-stats {
  font-size: 11px;
  color: var(--ion-color-light-shade);
  overflow: hidden;
  max-height: 15px;
  max-width: 200px;
}

.spell-image {
  border-radius: 15px;
  object-fit: cover;
}

.add-new-button {
  position: fixed;
  bottom: -10px;
  width: 100%;
  background: transparent;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-left: -15px;
}
</style>
