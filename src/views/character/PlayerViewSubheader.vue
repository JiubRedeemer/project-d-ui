<script setup lang="ts">

import {computed, onMounted, ref, watch} from "vue";
import {IonIcon} from "@ionic/vue";
import {chevronDownOutline, heartOutline, locateOutline} from "ionicons/icons";
import armorIcon from "../../static/icons/Armor.svg"
import speedIcon from "../../static/icons/Speed.svg"
import restIcon from "../../static/icons/rest.svg"
import {Character, EquippedItemsStatsResponse} from "@/components/models/response/Character";
import {HEADERS} from "@/config/localisations";
import {useCharacterStore} from "@/stores/CharacterStore";
import {useSubheaderOpenedStore} from "@/stores/SubheaderStore";
import {useInventoryStore} from "@/stores/InventoryStore";
import {useTransformStore} from "@/stores/TransformStore";
import {useRoute} from "vue-router";
import {getStatesForRoom} from "@/api/statesApi";
import type {StateDto} from "@/api/statesApi.types";

const characterStore = useCharacterStore()
const subheaderStore = useSubheaderOpenedStore();
const inventoryStore = useInventoryStore();
const transformStore = useTransformStore();
const route = useRoute();

const roomStates = ref<StateDto[]>([]);
const activeStates = computed(() => characterStore.character?.states ?? []);

onMounted(async () => {
  const roomId = route.params.roomId as string;
  if (!roomId) return;
  try { roomStates.value = await getStatesForRoom(roomId); } catch { /* non-critical */ }
});

function stateLabel(code: string | null | undefined): string {
  if (!code) return '?';
  return roomStates.value.find(s => s.code === code)?.name ?? code;
}

const activeForm = computed(() =>
  characterStore.character?.id
    ? transformStore.activeForm(characterStore.character.id)
    : null
)

function getArmoryClassBonusSum(itemStats: EquippedItemsStatsResponse | null): number {
  if (!itemStats) return 0;
  if (!itemStats.armoryClassBonus) return 0;

  return itemStats.armoryClassBonus.reduce((sum, stat) => {
    const value = typeof stat.value === 'number' ? stat.value : Number(stat.value);
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
}

function getSpeedBonusSum(itemStats: EquippedItemsStatsResponse | null): number {
  if (!itemStats) return 0;
  if (!itemStats.speedBonus) return 0;

  return itemStats.speedBonus.reduce((sum, stat) => {
    const value = typeof stat.value === 'number' ? stat.value : Number(stat.value);
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
}

const emits = defineEmits([
  "open-subheader",
  "close-subheader",
  "speed-selected",
  "armory-class-selected",
  "initiative-selected",
  "health-selected",
  "open-rest-modal",
  "has-states",
]);

const selectSpeed = (character: Character) => {
  emits("speed-selected", character);
};

const selectArmoryClass = (character: Character) => {
  emits("armory-class-selected", character);
};

const selectInitiative = (character: Character) => {
  emits("initiative-selected", character);
};

const selectHealth = (character: Character) => {
  emits("health-selected", character);
};

const openRestModal = (character: Character) => {
  emits("open-rest-modal", character);
};

const toggleSubheader = () => {
  subheaderStore.subheaderOpened = !subheaderStore.subheaderOpened
  if (subheaderStore.subheaderOpened) {
    emits("open-subheader");
  } else {
    emits("close-subheader")
  }
}

const getBaseArmoryClass = () : number => {
  if (characterStore.character != null && inventoryStore.inventory != null) {
    const equippedArmor = inventoryStore.inventory.items.filter(item => item.inUse && item.item.type === 'ARMOR' && item.item.subtype != "SHIELD")[0];
    const equippedShield = inventoryStore.inventory.items.filter(item => item.inUse && item.item.type === 'ARMOR' && item.item.subtype === "SHIELD")[0];

    if (equippedArmor)
      return Number(equippedArmor.item.stats.armorClass) + (equippedShield ? 2 : 0)
    else return 10 + (equippedShield ? 2 : 0);
  }
  return 0;
}

function calculateCheckValue(value: any) {
  return Math.floor((value - 10) / 2);
}

const getDexArmoryClass = () : number => {
  const equippedArmor = inventoryStore.inventory.items.filter(item => item.inUse && item.item.type === 'ARMOR' && item.item.subtype != "SHIELD")[0];
  const dexAbility = characterStore.character.abilities.filter(ability => ability.code == 'DEX')[0];
  const dexAbilityCheck = calculateCheckValue(dexAbility.value + dexAbility.bonusValue)
  let classBonusFromAbility = 0;
  if(characterStore.character.clazzCode === "MONK") {
    const wisAbility = characterStore.character.abilities.filter(ability => ability.code == 'WIS')[0];
    classBonusFromAbility = calculateCheckValue(wisAbility.value + wisAbility.bonusValue);
  }
  if(characterStore.character.clazzCode === "BARBARIAN") {
    const conAbility = characterStore.character.abilities.filter(ability => ability.code == 'CON')[0];
    classBonusFromAbility = calculateCheckValue(conAbility.value + conAbility.bonusValue);
  }
  if(equippedArmor && equippedArmor.item.subtype == 'HEAVY_ARMOR') return 0;
  else if (equippedArmor && equippedArmor.item.subtype == 'MEDIUM_ARMOR') {
    return dexAbilityCheck >= 2 ? 2 : dexAbilityCheck
  }
  else if (equippedArmor && equippedArmor.item.subtype == 'LIGHT_ARMOR') return dexAbilityCheck
  else return dexAbilityCheck + classBonusFromAbility;
}

const armoryClassValue = computed(() => {
  if (activeForm.value?.armoryClass != null) {
    const parsed = parseInt(String(activeForm.value.armoryClass), 10)
    if (!isNaN(parsed)) return parsed
  }
  if (getBaseArmoryClass() == null) return 0;
  return getBaseArmoryClass()
      + getDexArmoryClass()
      + (characterStore.character?.bonusArmoryClass ?? 0)
      + getArmoryClassBonusSum(characterStore.character?.itemStats ?? null);
});

const speedValue = computed(() => {
  if (activeForm.value?.speed != null) {
    const parsed = parseInt(String(activeForm.value.speed), 10)
    if (!isNaN(parsed)) return parsed
  }
  if (characterStore.character == null) return 0;
  return characterStore.character.speed
      + characterStore.character.bonusSpeed
      + getSpeedBonusSum(characterStore.character.itemStats);
});

const initiativeValue = computed(() => {
  if (characterStore.character == null) return '0';
  const value = characterStore.character.initiative + characterStore.character.bonusInitiative;
  return value >= 0 ? `${value}` : `${value}`;
});

const currentHp = computed(() => characterStore.character?.health?.currentHp ?? 0);
const maxHp = computed(() =>
    (characterStore.character?.health?.maxHp ?? 0)
    + (characterStore.character?.health?.bonusValue ?? 0)
);
const tempHp = computed(() => characterStore.character?.health?.tempHp ?? 0);

const isOpen = computed(() => subheaderStore.subheaderOpened);

watch(activeStates, (states) => { emits("has-states", states.length > 0); }, { immediate: true });
</script>

<template>
  <div class="subheader-root" :class="{ 'is-open': isOpen, 'has-states': activeStates.length > 0 }">
    <div class="subheader-shell">
      <button
          type="button"
          class="stat-card stat-card--ac"
          @click="selectArmoryClass(characterStore.character!!)"
      >
        <ion-icon class="stat-card__icon" :src="armorIcon"/>
        <span class="stat-card__value">{{ armoryClassValue }}</span>
        <span class="stat-card__label">{{ HEADERS.armoryClass.rus }}</span>
      </button>

      <button
          type="button"
          class="stat-card stat-card--speed stat-card--collapsible"
          @click="selectSpeed(characterStore.character!!)"
      >
        <ion-icon class="stat-card__icon" :src="speedIcon"/>
        <span class="stat-card__value">{{ speedValue }}</span>
        <span class="stat-card__label">{{ HEADERS.speed.rus }}</span>
      </button>

      <button
          type="button"
          class="stat-card stat-card--init stat-card--collapsible"
          @click="selectInitiative(characterStore.character!!)"
      >
        <ion-icon class="stat-card__icon" :icon="locateOutline"/>
        <span class="stat-card__value">{{ initiativeValue }}</span>
        <span class="stat-card__label">{{ HEADERS.initiative.rus }}</span>
      </button>

      <button
          type="button"
          class="stat-card stat-card--hp"
          @click="selectHealth(characterStore.character!!)"
      >
        <ion-icon class="stat-card__icon stat-card__icon--hp" :icon="heartOutline"/>
        <span class="stat-card__value stat-card__value--hp">
          {{ currentHp }}/{{ maxHp }}<span v-if="tempHp > 0" class="stat-card__temp-hp">+{{ tempHp }}</span>
        </span>
        <span class="stat-card__label">Здоровье</span>
      </button>

      <button
          type="button"
          class="subheader-toggle"
          :aria-expanded="isOpen"
          :aria-label="isOpen ? 'Свернуть панель персонажа' : 'Развернуть панель персонажа'"
          @click="toggleSubheader"
      >
        <ion-icon class="subheader-toggle__icon" :icon="chevronDownOutline"/>
      </button>

      <button
          type="button"
          class="rest-action stat-card--collapsible"
          @click="openRestModal(characterStore.character!!)"
      >
        <ion-icon class="rest-action__icon" :src="restIcon"/>
        <span class="rest-action__label">Отдых</span>
      </button>
    </div>

    <div v-if="activeStates.length && !isOpen" class="states-bar">
      <span v-for="s in activeStates" :key="s.id ?? s.stateCode" class="states-bar__chip">
        {{ stateLabel(s.stateCode) }}
      </span>
    </div>

    <div v-if="activeStates.length && isOpen" class="states-expanded">
      <span v-for="s in activeStates" :key="s.id ?? s.stateCode" class="states-bar__chip">
        {{ stateLabel(s.stateCode) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.subheader-root {
  --subheader-ease: cubic-bezier(0.33, 1, 0.68, 1);
  --subheader-duration: 0.48s;
  position: relative;
  padding: 5px 16px 5px;
  transition: padding-bottom var(--subheader-duration) var(--subheader-ease);
}

.subheader-root.is-open {
  padding-bottom: 35px;
}

/* Когда есть состояния в свёрнутом виде — убираем нижний паддинг, он занят полоской */
.subheader-root.has-states:not(.is-open) {
  padding-bottom: 0;
}

.states-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 16px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}
.states-bar::-webkit-scrollbar { display: none; }

.states-bar__chip {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ion-color-danger);
  opacity: 0.9;
  border-color: red;
  border: 1px solid var(--ion-color-danger);
  border-radius: 10px;
  padding: 1px 2px;
}

.subheader-shell {
  display: grid;
  gap: 6px;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: auto 0fr;
  grid-template-areas:
    "ac hp"
    "collapsible collapsible";
  transition: gap var(--subheader-duration) var(--subheader-ease);
}

.subheader-root.is-open .subheader-shell {
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: auto auto;
  grid-template-areas:
    "ac speed init hp"
    "rest rest rest rest";
}

.states-expanded {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  padding: 6px 0 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}
.states-expanded::-webkit-scrollbar { display: none; }

.stat-card,
.rest-action,
.subheader-toggle {
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.16);
  border-radius: 10px;
  background: var(--ion-color-medium);
  cursor: pointer;
  min-width: 0;
  transition:
    min-height var(--subheader-duration) var(--subheader-ease),
    padding var(--subheader-duration) var(--subheader-ease),
    border-radius var(--subheader-duration) var(--subheader-ease),
    margin var(--subheader-duration) var(--subheader-ease),
    opacity calc(var(--subheader-duration) * 0.85) var(--subheader-ease),
    border-color 0.3s ease,
    transform 0.2s ease;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 32px;
  padding: 5px 8px;
  flex-direction: row;
}

.subheader-root.is-open .stat-card {
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-height: 68px;
  padding: 8px 6px;
  border-radius: 12px;
}

.subheader-root.is-open .stat-card--ac,
.subheader-root.is-open .stat-card--hp {
  margin-inline: 0;
}

.stat-card--ac { grid-area: ac; margin-right: 18px; }
.stat-card--speed { grid-area: speed; }
.stat-card--init { grid-area: init; }
.stat-card--hp { grid-area: hp; margin-left: 18px; }

.stat-card--collapsible,
.rest-action {
  grid-area: collapsible;
  overflow: hidden;
}

.subheader-root.is-open .stat-card--collapsible {
  overflow: visible;
}

.subheader-root.is-open .stat-card--speed { grid-area: speed; }
.subheader-root.is-open .stat-card--init { grid-area: init; }
.subheader-root.is-open .rest-action { grid-area: rest; }

.stat-card--collapsible,
.rest-action {
  max-height: 0;
  min-height: 0;
  opacity: 0;
  padding-block: 0;
  padding-inline: 8px;
  border-width: 0;
  pointer-events: none;
  margin: 0;
}

.subheader-root.is-open .stat-card--collapsible {
  max-height: 120px;
  min-height: 68px;
  opacity: 1;
  padding-block: 8px;
  padding-inline: 6px;
  border-width: 1px;
  pointer-events: auto;
}

.subheader-root.is-open .rest-action {
  max-height: 56px;
  min-height: 38px;
  opacity: 1;
  padding: 0 16px;
  border-width: 1px;
  pointer-events: auto;
}

.stat-card:active,
.rest-action:active {
  transform: scale(0.97);
}

.stat-card__icon {
  width: 16px;
  height: 16px;
  color: rgba(var(--ion-color-primary-rgb), 0.9);
  flex-shrink: 0;
  transition: width var(--subheader-duration) var(--subheader-ease), height var(--subheader-duration) var(--subheader-ease);
}

.subheader-root.is-open .stat-card__icon {
  width: 16px;
  height: 16px;
}

.stat-card__value {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: var(--ion-color-light);
  font-variant-numeric: tabular-nums;
  transition: font-size var(--subheader-duration) var(--subheader-ease);
}

.subheader-root.is-open .stat-card__value {
  font-size: 17px;
}

.stat-card__label {
  margin-left: auto;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: font-size var(--subheader-duration) var(--subheader-ease), margin var(--subheader-duration) var(--subheader-ease), text-align var(--subheader-duration) var(--subheader-ease);
}

.subheader-root.is-open .stat-card__label {
  margin-left: 0;
  font-size: 9px;
  text-align: center;
  max-width: none;
}

.stat-card--hp {
  border-color: rgba(var(--ion-color-danger-rgb), 0.28);
}

.stat-card__icon--hp {
  color: var(--ion-color-danger);
}

.stat-card__value--hp {
  color: var(--ion-color-danger-tint);
}

.stat-card__temp-hp {
  margin-left: 3px;
  font-size: 0.82em;
  font-weight: 700;
  color: var(--ion-color-primary);
}

.rest-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 999px;
  color: rgba(var(--ion-color-light-rgb), 0.9);
  font-size: 14px;
  font-weight: 500;
}

.rest-action__icon {
  width: 18px;
  height: 18px;
  color: var(--ion-color-primary);
  flex-shrink: 0;
}

.subheader-toggle {
  position: absolute;
  left: 50%;
  top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 999px;
  background: var(--ion-color-medium-shade);
  z-index: 3;
  transform: translate(-50%, -50%);
  transition: top var(--subheader-duration) var(--subheader-ease);
}

.subheader-root.is-open .subheader-toggle {
  top: calc(100% - 16px);
}

.subheader-toggle:active {
  transform: translate(-50%, -40%) scale(0.94);
}

.subheader-toggle__icon {
  width: 14px;
  height: 14px;
  color: rgba(var(--ion-color-light-rgb), 0.7);
  transition: transform var(--subheader-duration) var(--subheader-ease), color 0.35s ease;
}

.subheader-root.is-open .subheader-toggle__icon {
  transform: rotate(180deg);
  color: var(--ion-color-primary);
}

@media (min-width: 1024px) {
  .subheader-root.is-open .stat-card__label {
    font-size: 10px;
  }
}
</style>
