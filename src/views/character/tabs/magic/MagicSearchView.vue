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
    IonToggle,
    IonToolbar,
    toastController,
    useIonRouter,
} from "@ionic/vue";
import { add, addOutline, arrowBack } from "ionicons/icons";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
    addSpellToBook,
    getSpellBookByRoomAndCharacter,
    listSpells,
} from "@/api/magicApi";
import type { SpellDto } from "@/components/models/response/MagicApi";
import type { SpellClass } from "@/components/models/response/MagicApi";
import {
    FILE_STORAGE_INTEGRATION_ROUTES,
    SPELL_IMAGE_PLACEHOLDER,
} from "@/config/integrationRoutes";
import { useCharacterStore } from "@/stores/CharacterStore";
import { useMagicStore } from "@/stores/MagicStore";

const route = useRoute();
const ionRouter = useIonRouter();
const characterStore = useCharacterStore();
const magicStore = useMagicStore();

const roomId = computed(() => String(route.params.roomId));
const characterId = computed(() => String(route.params.characterId));

const allSpells = ref<SpellDto[]>([]);
const searchQuery = ref("");
const forMyClass = ref(true);
const loading = ref(true);
const addingSpellId = ref<string | null>(null);

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
            return name.toLowerCase().includes(q);
        });
    }
    return list;
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
    return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
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

onMounted(async () => {
    await loadSpellBook();
    await loadSpells();
});

watch(forMyClass, () => {
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
      </div>
    </ion-header>
    <ion-content>
      <div v-if="loading" class="loading">Загрузка...</div>
      <div v-else class="found" :class="{ 'has-content': filteredSpells.length > 0 }">
        <template v-for="[level, spells] in spellsByLevel" :key="level">
          <h1 class="sectionHeader">{{ getLevelLabel(level) }}</h1>
          <div class="section" v-for="spell in spells" :key="spell.id">
            <div class="section-start-block">
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
      <ion-fab-button color="primary" @click="ionRouter.back()">
        <ion-icon :icon="arrowBack" color="dark"/>
      </ion-fab-button>
    </ion-fab>
    <ion-fab slot="fixed" vertical="bottom" horizontal="end">
      <ion-fab-button color="primary" @click="openAddSpellView()">
        <ion-icon :icon="add" color="dark"/>
      </ion-fab-button>
    </ion-fab>
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
  --background: #2b2930;
}
</style>
