<script setup lang="ts">
import {
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonPage,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonToolbar,
    onIonViewDidEnter,
    toastController,
    useIonRouter,
} from "@ionic/vue";
import { add, addOutline, arrowBack } from "ionicons/icons";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
    addSpellToBook,
    getSpellBookByRoomAndCharacter,
    listSpells,
} from "@/api/magicApi";
import type { SpellDto } from "@/components/models/response/MagicApi";
import type { SpellClass } from "@/components/models/response/MagicApi";
import type { SpellBookItemDto } from "@/components/models/response/MagicApi";
import {
    FILE_STORAGE_INTEGRATION_ROUTES,
    SPELL_IMAGE_PLACEHOLDER,
} from "@/config/integrationRoutes";
import { useCharacterStore } from "@/stores/CharacterStore";
import { useMagicStore } from "@/stores/MagicStore";
import SpellInfoModal from "@/views/character/tabs/magic/SpellInfoModal.vue";

const route = useRoute();
const ionRouter = useIonRouter();
const router = useRouter();
const characterStore = useCharacterStore();
const magicStore = useMagicStore();

const roomId = computed(() => String(route.params.roomId));
const characterId = computed(() => String(route.params.characterId));

const allSpells = ref<SpellDto[]>([]);
const searchQuery = ref("");
const forMyClass = ref(true);
const selectedSchool = ref<string>(""); // "" => all schools
const selectedLevel = ref<string>(""); // "" => all levels
const loading = ref(true);
const addingSpellId = ref<string | null>(null);
const selectedSpellId = ref<string | null>(null);
const showSpellModal = ref(false);

const spellBookId = computed(() => magicStore.spellBook?.id ?? null);
const spellsInBook = computed(
    () => new Set(magicStore.spellBook?.spells?.map((s) => s.spellId) ?? [])
);

const characterSpellClass = computed((): SpellClass | undefined => {
    const code = characterStore.character?.clazzCode;
    if (!code) return undefined;
    const valid: SpellClass[] = [
        "BARD", "BARBARIAN", "FIGHTER", "WIZARD", "DRUID", "CLERIC",
        "ARTIFICER", "WARLOCK", "MONK", "PALADIN", "ROGUE", "RANGER", "SORCERER",
    ];
    return valid.includes(code as SpellClass) ? (code as SpellClass) : undefined;
});

const filteredSpells = computed(() => {
    let list = allSpells.value;
    const q = searchQuery.value.trim().toLowerCase();
    if (q) {
        list = list.filter((s) => {
            const name =
                (s.name as Record<string, string>)?.rus ??
                (s.name as Record<string, string>)?.en ??
                "";
            const aliasName =
                (s.aliasName as Record<string, string>)?.rus ??
                (s.aliasName as Record<string, string>)?.en ??
                "";
            return name.toLowerCase().includes(q) || aliasName.toLowerCase().includes(q);
        });
    }

    if (selectedSchool.value) {
        list = list.filter((s) => (s.school ?? "") === selectedSchool.value);
    }
    if (selectedLevel.value) {
        list = list.filter((s) => String(s.level ?? "0") === selectedLevel.value);
    }

    return list;
});

const availableSchools = computed(() => {
    const set = new Set<string>();
    for (const spell of allSpells.value) {
        if (spell.school) set.add(spell.school);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
});

const availableLevels = computed(() => {
    const set = new Set<string>();
    for (const spell of allSpells.value) {
        set.add(String(spell.level ?? "0"));
    }
    return Array.from(set).sort((a, b) => {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        if (!Number.isFinite(na) || !Number.isFinite(nb)) return a.localeCompare(b, "ru");
        return na - nb;
    });
});

const spellsByLevel = computed(() => {
    const byLevel = new Map<string, SpellDto[]>();
    for (const spell of filteredSpells.value) {
        const level = spell.level ?? "0";
        if (!byLevel.has(level)) byLevel.set(level, []);
        byLevel.get(level)!.push(spell);
    }
    return Array.from(byLevel.entries()).sort(
        ([a], [b]) => parseInt(a, 10) - parseInt(b, 10)
    );
});

const selectedSpellItem = computed<SpellBookItemDto | null>(() => {
    const sid = selectedSpellId.value;
    if (!sid) return null;
    const spell = allSpells.value.find((s) => s.id === sid);
    if (!spell) return null;
    return {
        spellId: sid,
        spell,
        inUse: false,
    };
});

function getSpellName(spell: SpellDto): string {
    if (!spell?.name) return "—";
    const n = spell.name as Record<string, string>;
    return n.rus ?? n.en ?? "—";
}

function getDetailsLine1(spell: SpellDto): string {
    if (!spell) return "";
    const parts: string[] = [];
    if (spell.level === "0") parts.push("Фокус");
    else if (spell.level != null) parts.push(`Уровень ${spell.level}`);
    if (spell.school) parts.push(`школа ${spell.school}`);
    if (spell.damageType) parts.push(spell.damageType);
    if (spell.healType) parts.push(spell.healType);
    if (spell.ritual) parts.push("ритуал");
    if (spell.customization) parts.push("доп.тип");
    return parts.join(", ") || "";
}

function getDetailsLine2(spell: SpellDto): string {
    if (!spell) return "";
    const parts: string[] = [];
    if (spell.useTime) parts.push(spell.useTime);
    if (spell.distance) parts.push(spell.distance);
    return parts.join(", ") || "";
}

function getSpellImageUrl(imgUrl: string | undefined): string {
    if (!imgUrl) return SPELL_IMAGE_PLACEHOLDER;
    if (imgUrl.startsWith("http")) return imgUrl;
    return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.spell_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
}

function getLevelLabel(level: string): string {
    return level === "0" ? "Фокусы" : `${level} уровень`;
}

function canAdd(spell: SpellDto): boolean {
    return spell.id != null && !spellsInBook.value.has(spell.id);
}

async function addSpell(spell: SpellDto) {
    const bookId = spellBookId.value;
    const sid = spell.id;
    if (!bookId || !sid || !canAdd(spell)) return;
    addingSpellId.value = sid;
    try {
        const updated = await addSpellToBook(bookId, sid);
        magicStore.setSpellBook(updated);
        await presentToast();
    } catch (e) {
        console.error("Failed to add spell:", e);
    } finally {
        addingSpellId.value = null;
    }
}

async function presentToast() {
    const toast = await toastController.create({
        message: "Заклинание добавлено в книгу",
        duration: 1000,
        position: "top",
    });
    await toast.present();
}

async function loadSpells() {
    loading.value = true;
    try {
        const spellClass = forMyClass.value ? characterSpellClass.value : undefined;
        allSpells.value = await listSpells(spellClass);
    } catch (e) {
        console.error("Failed to load spells:", e);
        allSpells.value = [];
    } finally {
        loading.value = false;
    }
}

async function loadSpellBook() {
    try {
        const book = await getSpellBookByRoomAndCharacter(
            roomId.value,
            characterId.value
        );
        magicStore.setSpellBook(book);
    } catch (e) {
        console.error("Failed to load spell book:", e);
        magicStore.setSpellBook(null);
    }
}

function openSpellModal(spell: SpellDto) {
    if (!spell.id) return;
    selectedSpellId.value = spell.id;
    showSpellModal.value = true;
}

function closeSpellModal() {
    showSpellModal.value = false;
    selectedSpellId.value = null;
}

onIonViewDidEnter(async () => {
    await loadSpellBook();
    await loadSpells();
});

watch(forMyClass, () => {
    selectedSchool.value = "";
    selectedLevel.value = "";
    loadSpells();
});

function openAddSpellView() {
    ionRouter.navigate(
        `/rooms/${roomId.value}/characters/${characterId.value}/magic/add`,
        "forward",
        "push"
    );
}
</script>

<template>
  <ion-page>
    <ion-header class="search-header">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/rooms/${roomId}/characters/${characterId}`"/>
        </ion-buttons>
        <ion-searchbar
          v-model="searchQuery"
          placeholder="Найти заклинание"
          class="search-line"
        />
      </ion-toolbar>
      <div class="filter-row">
        <ion-toggle
          v-model="forMyClass"
          color="primary"
        >
          Для моего класса
        </ion-toggle>
        <ion-select
          v-model="selectedSchool"
          interface="popover"
          placeholder="Школа"
          aria-label="Фильтр по школе заклинания"
        >
          <ion-select-option value="">Все школы</ion-select-option>
          <ion-select-option
            v-for="s in availableSchools"
            :key="s"
            :value="s"
          >
            {{ s }}
          </ion-select-option>
        </ion-select>

        <ion-select
          v-model="selectedLevel"
          interface="popover"
          placeholder="Уровень"
          aria-label="Фильтр по уровню заклинания"
        >
          <ion-select-option value="">Все уровни</ion-select-option>
          <ion-select-option
            v-for="lvl in availableLevels"
            :key="lvl"
            :value="lvl"
          >
            {{ getLevelLabel(lvl) }}
          </ion-select-option>
        </ion-select>
      </div>
    </ion-header>
    <ion-content>
      <div v-if="loading" class="loading">Загрузка...</div>
      <div v-else class="found" :class="{ 'has-content': filteredSpells.length > 0 }">
        <template v-for="[level, spells] in spellsByLevel" :key="level">
          <h1 class="sectionHeader">{{ getLevelLabel(level) }}</h1>
          <div class="section" v-for="spell in spells" :key="spell.id">
            <div class="section-start-block" @click="openSpellModal(spell)">
              <div class="image-block">
                <img
                  width="55"
                  height="55"
                  class="spell-image"
                  :src="getSpellImageUrl(spell.imgUrl)"
                  :alt="getSpellName(spell)"
                />
              </div>
              <div class="stats-block">
                <div class="item-name">{{ getSpellName(spell) }}</div>
                <div class="item-stats">{{ getDetailsLine1(spell) }}</div>
                <div class="item-stats">{{ getDetailsLine2(spell) }}</div>
              </div>
            </div>
            <div class="add-button-block">
              <ion-button
                v-if="canAdd(spell)"
                @click="addSpell(spell)"
                size="small"
                shape="round"
                class="add-button"
                :disabled="addingSpellId === spell.id"
              >
                <ion-icon slot="icon-only" :icon="addOutline"/>
              </ion-button>
              <span v-else class="already-added">В книге</span>
            </div>
          </div>
        </template>
        <div v-if="!loading && filteredSpells.length === 0" class="empty">
          Заклинания не найдены
        </div>
      </div>
    </ion-content>
    <ion-fab slot="fixed" vertical="bottom" horizontal="start">
      <ion-fab-button color="primary" @click="router.back()">
        <ion-icon :icon="arrowBack" color="dark"/>
      </ion-fab-button>
    </ion-fab>
    <ion-fab slot="fixed" vertical="bottom" horizontal="end">
      <ion-fab-button color="primary" @click="openAddSpellView()">
        <ion-icon :icon="add" color="dark"/>
      </ion-fab-button>
    </ion-fab>

    <SpellInfoModal
      :isOpen="showSpellModal"
      :item="selectedSpellItem"
      :spell-book-id="spellBookId"
      :readonly="true"
      @closeSpellInfoModal="closeSpellModal"
    />
  </ion-page>
</template>

<style scoped>
.search-header,
ion-content {
  --background: var(--ion-color-dark);
}

.filter-row {
  padding: 8px 16px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--ion-color-light);
  font-size: 14px;
}

.filter-row ion-toggle {
  --track-background-checked: #4a2c6e;
}

.found {
  margin-bottom: 90px;
  margin-left: 10px;
  margin-right: 10px;
}

.loading,
.empty {
  color: var(--ion-color-light);
  padding: 1rem;
  text-align: center;
}

.sectionHeader {
  color: var(--ion-color-light);
  font-size: 18px;
  font-weight: bold;
  margin-top: 14px;
  margin-bottom: 8px;
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
}

.add-button-block {
  display: flex;
  align-items: center;
  min-width: 50px;
  justify-content: flex-end;
}

.add-button {
  --background: #4a2c6e;
  --background-hover: #5a3c7e;
  --color: white;
  --border-radius: 50%;
}

.add-button::part(native) {
  width: 45px;
  height: 45px;
}

.add-button ion-icon {
  width: 24px;
  height: 24px;
}

.already-added {
  font-size: 11px;
  color: var(--ion-color-medium-shade);
}

.item-name {
  font-size: 16px;
  font-weight: bold;
}

.item-stats {
  font-size: 11px;
  color: var(--ion-color-light-shade);
}

.spell-image {
  border-radius: 15px;
  object-fit: cover;
  min-width: 55px;
  min-height: 55px;
}

ion-searchbar {
  --border-radius: 20px;
  --background: #2B2930;
}

.found, ion-toolbar, ion-content, .filter-row {
  --background: var(--ion-color-dark);
}
</style>
