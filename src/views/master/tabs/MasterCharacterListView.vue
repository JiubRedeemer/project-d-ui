<script setup lang="ts">
import {IonButton, IonIcon, useIonRouter} from "@ionic/vue";
import {
  alertCircleOutline,
  chevronForwardOutline,
  peopleOutline,
  searchOutline,
  shieldOutline,
  sparklesOutline
} from "ionicons/icons";
import {computed, ref} from "vue";
import {useRoute} from "vue-router";
import {Character} from "@/components/models/response/Character";
import {useRoomStore} from "@/stores/RoomStore";
import CachedFileImage from "@/components/CachedFileImage.vue";
import {CHARACTER_AVATAR_PLACEHOLDER, getCharacterAvatarUrl} from "@/utils/characterAvatar";
import {TEXTS} from "@/config/localisations";
import MasterCharacterStateModal from "@/views/master/modals/MasterCharacterStateModal.vue";

const route = useRoute();
const ionRouter = useIonRouter();
const roomStore = useRoomStore();

const searchQuery = ref("");

const isCharacterOwned = (character: Character) => {
  return (character as Character & { isOwned?: boolean }).isOwned ?? character.isOwner;
};

const sortCharacters = (list: Character[]) => {
  return [...list].sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name, "ru", {sensitivity: "base"});
    if (nameCompare !== 0) return nameCompare;
    return a.id.localeCompare(b.id);
  });
};

const matchesQuery = (character: Character, query: string) => {
  if (!query) return true;
  const haystack = [
    character.name,
    character.ownerUsername,
    character.raceInfo?.name,
    character.clazzInfo?.name
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
};

const filteredCharacters = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return roomStore.characters.filter((character) => matchesQuery(character, query));
});

const characterGroups = computed(() => {
  const owned = sortCharacters(
    filteredCharacters.value.filter((character) => isCharacterOwned(character))
  );
  const others = sortCharacters(
    filteredCharacters.value.filter((character) => !isCharacterOwned(character))
  );

  return [
    {key: "owned", title: "Мои персонажи", owned: true, items: owned},
    {key: "others", title: "Персонажи игроков", owned: false, items: others}
  ].filter((group) => group.items.length > 0);
});

const totalCount = computed(() => roomStore.characters.length);
const hasCharacters = computed(() => totalCount.value > 0);
const hasResults = computed(() => filteredCharacters.value.length > 0);
const isSearching = computed(() => searchQuery.value.trim().length > 0);

const hpPercent = (character: Character) => {
  const health = character.health;
  if (!health || !health.maxHp) return 0;
  const max = health.maxHp + (health.bonusValue ?? 0);
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (health.currentHp / max) * 100));
};

const hpTone = (character: Character): "normal" | "warn" | "critical" => {
  const percent = hpPercent(character);
  if (percent <= 25) return "critical";
  if (percent <= 50) return "warn";
  return "normal";
};

const maxHpValue = (character: Character) => {
  const health = character.health;
  if (!health) return 0;
  return health.maxHp + (health.bonusValue ?? 0);
};

const armoryClassValue = (character: Character) =>
  character.armoryClass + (character.bonusArmoryClass ?? 0);

const goToCharacter = (characterId: string) => {
  ionRouter.navigate(
    `/rooms/${route.params.roomId}/characters/${characterId}`,
    "forward",
    "push"
  );
};

const stateModalCharacter = ref<Character | null>(null);

function openStateModal(e: Event, character: Character) {
  e.stopPropagation();
  stateModalCharacter.value = character;
}
function closeStateModal() {
  stateModalCharacter.value = null;
}
</script>

<template>
  <div class="master-character-list">
    <header v-if="hasCharacters" class="list-toolbar">
      <div class="search-field">
        <ion-icon class="search-field__icon" :icon="searchOutline" aria-hidden="true" />
        <input
          v-model="searchQuery"
          type="text"
          class="search-field__input"
          placeholder="Поиск по имени, игроку, расе или классу"
          aria-label="Поиск персонажей"
        />
      </div>
      <div class="list-count" aria-live="polite">
        <ion-icon :icon="peopleOutline" aria-hidden="true" />
        <span>{{ filteredCharacters.length }} / {{ totalCount }}</span>
      </div>
    </header>

    <template v-if="hasResults">
      <section v-for="group in characterGroups" :key="group.key" class="character-section">
        <div class="section-heading">
          <span class="section-heading__title">{{ group.title }}</span>
          <span class="section-heading__count">{{ group.items.length }}</span>
        </div>
        <div class="character-grid">
          <button
            v-for="character in group.items"
            :key="character.id"
            type="button"
            class="character-card"
            :class="{ 'character-card--owned': group.owned }"
            @click="goToCharacter(character.id)"
          >
            <div class="character-card__glow" aria-hidden="true" />
            <span v-if="character.level" class="character-card__level">
              <ion-icon :icon="sparklesOutline" aria-hidden="true" />
              {{ character.level.level }}
            </span>

            <div class="character-card__top">
              <div class="character-card__avatar">
                <CachedFileImage
                  :width="64"
                  :height="64"
                  :src="getCharacterAvatarUrl(character)"
                  alt=""
                  @error="($event.target as HTMLImageElement).src = CHARACTER_AVATAR_PLACEHOLDER"
                />
              </div>
              <div class="character-card__identity">
                <h3 class="character-card__name">{{ character.name }}</h3>
                <p class="character-card__owner">@{{ character.ownerUsername }}</p>
                <div class="character-card__tags">
                  <span class="tag tag--race">{{ character.raceInfo.name }}</span>
                  <span class="tag tag--class">{{ character.clazzInfo.name }}</span>
                </div>
              </div>
              <ion-icon class="character-card__chevron" :icon="chevronForwardOutline" aria-hidden="true" />
            </div>

            <div class="character-card__stats">
              <div v-if="character.health" class="hp-meter">
                <div class="hp-meter__head">
                  <span class="hp-meter__label">HP</span>
                  <span class="hp-meter__value">
                    {{ character.health.currentHp }}<span class="hp-meter__max">/{{ maxHpValue(character) }}</span>
                    <span v-if="character.health.tempHp > 0" class="hp-meter__temp">+{{ character.health.tempHp }}</span>
                  </span>
                </div>
                <div class="hp-meter__track">
                  <div
                    class="hp-meter__fill"
                    :class="`hp-meter__fill--${hpTone(character)}`"
                    :style="{ width: `${hpPercent(character)}%` }"
                  />
                </div>
              </div>
              <div class="ac-chip" :aria-label="`Класс брони ${armoryClassValue(character)}`">
                <ion-icon :icon="shieldOutline" aria-hidden="true" />
                <span>{{ armoryClassValue(character) }}</span>
              </div>
              <ion-button
                class="state-btn"
                fill="clear"
                size="small"
                color="danger"
                :aria-label="`Состояния ${character.name}`"
                @click="openStateModal($event, character)"
              >
                <ion-icon slot="icon-only" :icon="alertCircleOutline"/>
              </ion-button>
            </div>
          </button>
        </div>
      </section>
    </template>

    <div v-else-if="isSearching" class="empty-state">
      <ion-icon :icon="searchOutline" class="empty-state__icon" aria-hidden="true" />
      <p class="empty-state__text">Ничего не найдено по запросу «{{ searchQuery.trim() }}»</p>
    </div>

    <div v-else class="empty-state">
      <ion-icon :icon="peopleOutline" class="empty-state__icon" aria-hidden="true" />
      <p class="empty-state__text">{{ TEXTS.emptyCharactersList.rus }}</p>
    </div>
  </div>

  <MasterCharacterStateModal
    :is-open="!!stateModalCharacter"
    :room-id="String(route.params.roomId)"
    :character="stateModalCharacter"
    @close="closeStateModal"
  />
</template>

<style scoped>
.master-character-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Toolbar */
.list-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-field {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.search-field__icon {
  position: absolute;
  left: 14px;
  font-size: 18px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  pointer-events: none;
}

.search-field__input {
  width: 100%;
  height: 44px;
  padding: 0 14px 0 42px;
  border-radius: 14px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
  background: rgba(var(--ion-color-medium-rgb), 0.7);
  color: var(--ion-color-light);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.search-field__input::placeholder {
  color: rgba(var(--ion-color-light-rgb), 0.4);
}

.search-field__input:focus {
  border-color: rgba(var(--ion-color-primary-rgb), 0.6);
  background: rgba(var(--ion-color-medium-rgb), 0.95);
  box-shadow: 0 0 0 3px rgba(var(--ion-color-primary-rgb), 0.16);
}

.list-count {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 0 14px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  background: rgba(var(--ion-color-medium-rgb), 0.55);
  color: rgba(var(--ion-color-light-rgb), 0.78);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.list-count ion-icon {
  font-size: 16px;
  color: var(--ion-color-primary);
}

/* Sections */
.character-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 2px;
}

.section-heading__title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.55);
}

.section-heading__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.16);
  color: var(--ion-color-primary);
  font-size: 12px;
  font-weight: 700;
}

/* Grid */
.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

/* Card */
.character-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  background:
    linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.92) 100%);
  cursor: pointer;
  overflow: hidden;
  text-align: left;
  isolation: isolate;
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.22s ease, box-shadow 0.22s ease;
}

.character-card__glow {
  position: absolute;
  inset: -1px;
  z-index: -1;
  background: radial-gradient(120% 80% at 0% 0%, rgba(var(--ion-color-primary-rgb), 0.12), transparent 60%);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.character-card--owned {
  border-color: rgba(var(--ion-color-primary-rgb), 0.28);
}

.character-card--owned .character-card__glow {
  opacity: 1;
}

.character-card:hover {
  transform: translateY(-3px);
  border-color: rgba(var(--ion-color-primary-rgb), 0.45);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.4);
}

.character-card:hover .character-card__glow {
  opacity: 1;
}

.character-card:active {
  transform: translateY(-1px) scale(0.992);
}

.character-card:hover .character-card__chevron {
  transform: translateX(3px);
  color: var(--ion-color-primary);
}

/* Level badge */
.character-card__level {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.16);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
  color: var(--ion-color-primary);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.character-card__level ion-icon {
  font-size: 12px;
}

/* Top row */
.character-card__top {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-right: 44px;
}

.character-card__avatar {
  position: relative;
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  background: rgba(var(--ion-color-dark-rgb), 0.6);
}

.character-card__avatar :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.character-card__identity {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.character-card__name {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.15;
  color: var(--ion-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.character-card--owned .character-card__name {
  color: var(--ion-color-primary);
}

.character-card__owner {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.character-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.tag--race {
  background: var(--race-color);
  color: var(--ion-color-light);
}

.tag--class {
  background: var(--clazz-color);
  color: var(--ion-color-light);
}

.character-card__chevron {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  font-size: 18px;
  color: rgba(var(--ion-color-light-rgb), 0.3);
  transition: transform 0.22s ease, color 0.22s ease;
}

/* Stats row */
.character-card__stats {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.hp-meter {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.hp-meter__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.hp-meter__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.45);
}

.hp-meter__value {
  font-size: 13px;
  font-weight: 700;
  color: var(--ion-color-light);
  font-variant-numeric: tabular-nums;
}

.hp-meter__max {
  color: rgba(var(--ion-color-light-rgb), 0.45);
  font-weight: 600;
}

.hp-meter__temp {
  margin-left: 3px;
  color: rgba(124, 212, 255, 0.98);
  font-size: 0.85em;
}

.hp-meter__track {
  position: relative;
  width: 100%;
  height: 7px;
  border-radius: 999px;
  background: rgba(var(--ion-color-light-rgb), 0.1);
  overflow: hidden;
}

.hp-meter__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.hp-meter__fill--normal {
  background: linear-gradient(90deg, var(--ion-color-success-shade), var(--ion-color-success));
}

.hp-meter__fill--warn {
  background: linear-gradient(90deg, var(--ion-color-warning-shade), var(--ion-color-warning));
}

.hp-meter__fill--critical {
  background: linear-gradient(90deg, var(--ion-color-danger-shade), var(--ion-color-danger-tint));
}

.ac-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  border-radius: 12px;
  background: rgba(var(--ion-color-light-rgb), 0.06);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
  color: var(--ion-color-light);
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.ac-chip ion-icon {
  font-size: 15px;
  color: var(--ion-color-primary);
}

.state-btn {
  flex-shrink: 0;
  --padding-start: 6px;
  --padding-end: 6px;
  margin: 0;
  font-size: 20px;
}

/* Empty state */
.empty-state {
  width: 100%;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
}

.empty-state__icon {
  font-size: 48px;
  color: rgba(var(--ion-color-light-rgb), 0.22);
}

.empty-state__text {
  margin: 0;
  max-width: 280px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 420px) {
  .character-grid {
    grid-template-columns: 1fr;
  }
}
</style>
