<script setup lang="ts">
import {IonButton, IonIcon} from "@ionic/vue";
import {add, star} from "ionicons/icons";
import {useRoute} from "vue-router";
import {computed, onMounted, ref} from "vue";
import {setSpellInUse} from "@/api/magicApi";
import type {SpellBookItemDto, SpellDto} from "@/components/models/response/MagicApi";
import SpellInfoModal from "@/views/character/tabs/magic/SpellInfoModal.vue";
import {
    FILE_STORAGE_INTEGRATION_ROUTES,
    SPELL_IMAGE_PLACEHOLDER,
} from "@/config/integrationRoutes";
import {useMagicStore} from "@/stores/MagicStore";
import {useAppRouter} from "@/composables/useAppRouter";

const route = useRoute();
const { navigate, isDesktop } = useAppRouter();
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
    const sorted = Array.from(byLevel.entries()).sort(
        ([a], [b]) => parseInt(a, 10) - parseInt(b, 10)
    );
    return sorted;
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

async function togglePrepared(item: SpellBookItemDto) {
    const bookId = spellBookId.value;
    const sid = item.spellId;
    if (!bookId || !sid) return;
    const newInUse = !(item.inUse === true);
    try {
        const updated = await setSpellInUse(bookId, sid, newInUse);
        item.inUse = updated.inUse;
        if (magicStore.spellBook?.spells) {
            const idx = magicStore.spellBook.spells.findIndex((s) => s.spellId === sid);
            if (idx >= 0) magicStore.spellBook.spells[idx] = updated;
        }
    } catch (e) {
        console.error("Failed to toggle spell prepared:", e);
    }
}

function openSearchView() {
    navigate(
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

onMounted(async () => {
    loading.value = true;
    error.value = null;
    try {
        await magicStore.updateSpellBookInStore(roomId.value, characterId.value);
    } catch (e) {
        console.error("Failed to load spell book:", e);
        error.value = "Не удалось загрузить книгу заклинаний";
    } finally {
        loading.value = false;
    }
});
</script>

<template>
  <div class="magic-body" :class="{ 'desktop-content': isDesktop }">
    <div v-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <template v-else>
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
              @click.stop="togglePrepared(item)"
              size="small"
              shape="round"
              class="star-button"
              :fill="item.inUse ? 'solid' : 'outline'"
            >
              <ion-icon slot="icon-only" :icon="star"/>
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
                @click.stop="togglePrepared(item)"
                size="small"
                shape="round"
                class="star-button"
                :fill="item.inUse ? 'solid' : 'outline'"
              >
                <ion-icon slot="icon-only" :icon="star"/>
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

.magic-body.desktop-content {
  max-width: var(--desktop-content-max-width);
  margin: 0 auto;
  padding: var(--desktop-content-padding);
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
