<script setup lang="ts">

import {HEADERS, TEXTS} from "@/config/localisations";
import {computed, ref} from "vue";
import {useInventoryStore} from "@/stores/InventoryStore";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useCharacterStore} from "@/stores/CharacterStore";
import {InventoryItem, InventoryItemSkill, ItemSkill} from "@/components/models/response/InventoryResponse";
import {addOutline, chevronDownOutline, chevronUpOutline, contractOutline, handRightOutline, manOutline, reorderThreeOutline, skullOutline} from "ionicons/icons";
import {IonButton, IonIcon, IonProgressBar, toastController, useIonRouter} from "@ionic/vue";
import axios from "axios";
import {useRoute} from "vue-router";
import EditItemSkillValueModal from "@/views/character/tabs/inventory/EditItemSkillValueModal.vue";
import {useInventoryItemStore} from "@/stores/InventoryItemStore";
import {CharacterSkill} from "@/components/models/response/Character";
import {useCharacterSkillsStore} from "@/stores/CharacterSkillsStore";
import EditCharacterSkillValueModal from "@/views/character/tabs/attacksAndSkills/EditCharacterSkillValueModal.vue";
import {storeToRefs} from "pinia";
import EditItemCombatBonusModal from "@/views/character/tabs/attacksAndSkills/EditItemCombatBonusModal.vue";
import inventoryTabIcon from "@/static/icons/InventoryTab.svg";
import {useDragSort} from "@/composables/useDragSort";

const route = useRoute();

const inventoryStore = useInventoryStore();
const characterStore = useCharacterStore();
const characterSkillsStore = useCharacterSkillsStore();

const getAbilityModifier = (code: string) => {
  const ability = characterStore.character.abilities.find((item) => item.code === code);
  if (!ability) return 0;
  return Math.floor((ability.value + ability.bonusValue - 10) / 2);
};

const str = computed(() => getAbilityModifier("STR"));
const dex = computed(() => getAbilityModifier("DEX"));
const con = computed(() => getAbilityModifier("CON"));
const int = computed(() => getAbilityModifier("INT"));
const wis = computed(() => getAbilityModifier("WIS"));
const cha = computed(() => getAbilityModifier("CHA"));

const {characterSkills: characterSkillsRef} = storeToRefs(characterSkillsStore);
const charId = String(route.params.characterId);

const equippedDrag = useDragSort<InventoryItem>({
  key: `att_equipped_${charId}`,
  source: () => inventoryStore.inventory?.items?.filter(item => item.inUse && item.item.type === 'WEAPON') ?? [],
  getKey: item => item.id,
});
const hasEquippedWeapons = computed(() => equippedDrag.ordered.length > 0);

const skillsDrag = useDragSort<InventoryItemSkill>({
  key: `att_skills_${charId}`,
  source: () => inventoryStore.inventory?.items?.flatMap(i => i.skills ?? []) ?? [],
  getKey: skill => skill.id,
});
const hasItemSkills = computed(() => skillsDrag.ordered.length > 0);

const charSkillsDrag = useDragSort<CharacterSkill>({
  key: `att_charskills_${charId}`,
  source: () => characterSkillsRef.value ?? [],
  getKey: skill => skill.id,
  onCommit: list => { characterSkillsRef.value = list; },
});
const hasCharacterSkills = computed(() => charSkillsDrag.ordered.length > 0);

const isEquippedSectionExpanded = ref(true);
const isItemSkillsSectionExpanded = ref(true);
const isCharacterSkillsSectionExpanded = ref(true);

const getItemImageUrl = (imgUrl: string | undefined) => {
  return imgUrl != null
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png';
};

const getSkillImageUrl = (imgUrl: string | undefined) => {
  return imgUrl != null
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.skills_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png';
};

const useSkill = async (skill: InventoryItemSkill | CharacterSkill) => {
  if (skill.currentCharges <= 0) return;

  // Optimistic update
  const prevCharges = skill.currentCharges;
  skill.currentCharges = skill.currentCharges - 1;

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("accessToken")}` };
  try {
    if ((skill as InventoryItemSkill).inventoryItemId) {
      const s = skill as InventoryItemSkill;
      await axios.post(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.items}/${s.inventoryItemId}${GATEWAY_INTEGRATION_ROUTES.skills}/${skill.id}${GATEWAY_INTEGRATION_ROUTES.use}`,
        {},
        { headers }
      );
    } else {
      await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.characterSkills}/${skill.id}${GATEWAY_INTEGRATION_ROUTES.use}`,
        {},
        { headers }
      );
    }
  } catch (e: unknown) {
    const err = e as { response?: unknown };
    if (err.response) {
      // Server rejected — rollback
      skill.currentCharges = prevCharges;
    }
    // Network error: optimistic change stays, request already queued
  }
}

function getRarityClass(rarity: string | undefined) {
  switch (rarity) {
    case 'COMMON':
      return 'rarity-common';
    case 'UNCOMMON':
      return 'rarity-uncommon';
    case 'RARE':
      return 'rarity-rare';
    case 'VERY_RARE':
      return 'rarity-very-rare';
    case 'LEGENDARY':
      return 'rarity-legendary';
    default:
      return 'rarity-common';
  }
}

const getItemStats = (item: InventoryItem) => {
  const stats: string[] = [];

  if (item.item.stats?.damage) {
    stats.push(`${TEXTS.damage.rus}: ${item.item.stats.damage.damageTypeName}`);
  }

  if (item.item.subtypeName) {
    stats.push(`${TEXTS.type.rus}: ${item.item.subtypeName}`);
  }

  return stats;
};

const getDamageText = (item: InventoryItem) => {
  const d = item.item.stats?.damage;
  if (!d) return '';
  const parsedDamage = replaceDamageAbilityPlaceholders(String(d.value ?? ""));
  const fallbackDamageFromWeaponType = parsedDamage.hasPlaceholders ? 0 : calculateDamageFromWeaponType(item);
  const totalDamageBonus = fallbackDamageFromWeaponType + getDamageBonus(item);
  const value = parsedDamage.value
      + (totalDamageBonus > 0 ? " + " + totalDamageBonus : "")
      + (totalDamageBonus < 0 ? " " + totalDamageBonus : "");
  const normalizedValue = normalizeDamageExpression(value);
  if (normalizedValue) return normalizedValue;
  return '';
};

const getAttackBonus = (item: InventoryItem) => {
  return item.attackBonusValue ? item.attackBonusValue : 0;
};

const getDamageBonus = (item: InventoryItem) => {
  return item.damageBonusValue ? item.damageBonusValue : 0;
};

const setAttackBonus = (item: InventoryItem, value: number) => {
  (item.item.stats as Record<string, unknown>).attackBonus = value;
};

const setDamageBonus = (item: InventoryItem, value: number) => {
  (item.item.stats as Record<string, unknown>).damageBonus = value;
};

const calculateAttack = (item: InventoryItem) => {
  if (item.item.subtype === 'EHW' || item.item.subtype === 'AHW' || item.item.subtype === 'SHW') {
    return characterStore.character.proficiencyBonus + str.value + getAttackBonus(item);
  } else if (item.item.subtype === 'ERW' || item.item.subtype === 'ARW' || item.item.subtype === 'SRW') {
    return characterStore.character.proficiencyBonus + dex.value + getAttackBonus(item);
  }
  return getAttackBonus(item);
};

const calculateDamageFromWeaponType = (item: InventoryItem) => {
  if (item.item.subtype === 'EHW' || item.item.subtype === 'AHW' || item.item.subtype === 'SHW') {
    return str.value;
  } else if (item.item.subtype === 'ERW' || item.item.subtype === 'ARW' || item.item.subtype === 'SRW') {
    return dex.value;
  }
  return 0;
};

const getAbilityPlaceholders = (): Record<string, number> => ({
  STR: str.value,
  DEX: dex.value,
  CON: con.value,
  INT: int.value,
  WIS: wis.value,
  CHA: cha.value,
  СИЛА: str.value,
  СИЛ: str.value,
  ЛОВКОСТЬ: dex.value,
  ЛОВК: dex.value,
  ЛОВ: dex.value,
  ТЕЛОСЛОЖЕНИЕ: con.value,
  ТЕЛ: con.value,
  ИНТЕЛЛЕКТ: int.value,
  ИНТ: int.value,
  МУДРОСТЬ: wis.value,
  МУД: wis.value,
  МДР: wis.value,
  ХАРИЗМА: cha.value,
  ХАР: cha.value,
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceDamageAbilityPlaceholders(rawDamage: string): { value: string; hasPlaceholders: boolean } {
  if (!rawDamage) {
    return {value: "", hasPlaceholders: false};
  }

  let value = rawDamage;
  let hasPlaceholders = false;
  const abilityPlaceholders = getAbilityPlaceholders();
  const aliases = Object.keys(abilityPlaceholders).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    const regex = new RegExp(`(^|[^\\p{L}])(${escapeRegExp(alias)})(?=$|[^\\p{L}])`, "giu");
    if (!regex.test(value)) {
      continue;
    }

    hasPlaceholders = true;
    const modifier = abilityPlaceholders[alias];
    value = value.replace(regex, (_fullMatch, prefix) => `${prefix}${modifier}`);
  }

  return {value, hasPlaceholders};
}

function normalizeDamageExpression(rawValue: string): string {
  if (!rawValue) {
    return "";
  }

  let value = rawValue;

  // 1d6 + -1 -> 1d6 - 1
  value = value.replace(/\+\s*-(\d+)/g, "- $1");
  // 1d6 - -1 -> 1d6 + 1
  value = value.replace(/-\s*-(\d+)/g, "+ $1");
  // Remove explicit zero terms: + 0 / - 0
  value = value.replace(/\s*[+-]\s*0(?!\d)/g, "");
  // Cleanup extra spaces
  value = value.replace(/\s{2,}/g, " ").trim();
  // Avoid dangling trailing + or -
  value = value.replace(/[+-]\s*$/, "").trim();

  return collapseNumericModifiers(value);
}

function collapseNumericModifiers(expression: string): string {
  if (!expression) {
    return "";
  }

  const prepared = expression
      .replace(/\s+/g, " ")
      .replace(/^\+/, "")
      .trim();

  const rawTerms = prepared.match(/[+-]?\s*[^+-]+/g) ?? [];
  if (!rawTerms.length) {
    return prepared;
  }

  const nonNumericTerms: string[] = [];
  let numericSum = 0;

  for (const rawTerm of rawTerms) {
    const normalizedTerm = rawTerm.trim();
    const sign = normalizedTerm.startsWith("-") ? -1 : 1;
    const unsigned = normalizedTerm.replace(/^[+-]\s*/, "").trim();

    if (/^\d+$/.test(unsigned)) {
      numericSum += sign * Number(unsigned);
      continue;
    }

    const normalizedSign = sign < 0 ? "-" : "+";
    nonNumericTerms.push(`${normalizedSign} ${unsigned}`);
  }

  if (numericSum !== 0) {
    const numericSign = numericSum < 0 ? "-" : "+";
    nonNumericTerms.push(`${numericSign} ${Math.abs(numericSum)}`);
  }

  if (!nonNumericTerms.length) {
    return "0";
  }

  const [first, ...rest] = nonNumericTerms;
  const firstClean = first.replace(/^\+\s*/, "");
  return [firstClean, ...rest].join(" ").trim();
}

const showEditItemSkillModal = ref(false);
const isEditingItemSkill = ref(false);
const editingItemSkill = ref<ItemSkill>();


const showEditCharacterSkillModal = ref(false);
const isEditingCharacterSkill = ref(false);
const editingCharacterSkill = ref<CharacterSkill>();

const showEditCombatBonusModal = ref(false);
const editingCombatBonusType = ref<"attack" | "damage">("attack");
const editingCombatBonusItem = ref<InventoryItem>();
const pressHintTimeoutId = ref<number | null>(null);
const longPressTriggered = ref(false);

const inventoryItemStore = useInventoryItemStore();
const ionRouter = useIonRouter();

const closeEditItemSkillModal = () => {
  showEditItemSkillModal.value = false;
};
const closeEditCharacterSkillModal = () => {
  showEditCharacterSkillModal.value = false;
  isEditingCharacterSkill.value = false;
  editingCharacterSkill.value = undefined;
};

const closeEditCombatBonusModal = () => {
  showEditCombatBonusModal.value = false;
  editingCombatBonusItem.value = undefined;
};

const openEditItemSkillModal = (isEditing: boolean, itemSkill: ItemSkill | undefined) => {
  isEditingItemSkill.value = isEditing;
  if (!isEditing) {
    editingItemSkill.value = itemSkill;
  } else if (isEditing && !itemSkill) {
    editingItemSkill.value = undefined;
  }
  showEditItemSkillModal.value = true;
};

const openEditCharacterSkillModal = (isEditing: boolean, characterSkill: CharacterSkill | undefined) => {
  isEditingCharacterSkill.value = isEditing;
  if (!isEditing) {
    editingCharacterSkill.value = characterSkill;
  } else if (isEditing && !characterSkill) {
    editingCharacterSkill.value = undefined;
  }
  showEditCharacterSkillModal.value = true;
};

const openEditCombatBonusModal = (item: InventoryItem, type: "attack" | "damage") => {
  editingCombatBonusItem.value = item;
  editingCombatBonusType.value = type;
  showEditCombatBonusModal.value = true;
};

const clearPressHintTimer = () => {
  if (pressHintTimeoutId.value !== null) {
    window.clearTimeout(pressHintTimeoutId.value);
    pressHintTimeoutId.value = null;
  }
};

const getAttackHintText = (item: InventoryItem): string => {
  const attackBonus = getAttackBonus(item);
  if (item.item.subtype === 'EHW' || item.item.subtype === 'AHW' || item.item.subtype === 'SHW') {
    return `Атака = Бонус мастерства (${characterStore.character.proficiencyBonus}) + СИЛ (${str.value}) + бонус атаки предмета (${attackBonus}) = ${calculateAttack(item)}`;
  }
  if (item.item.subtype === 'ERW' || item.item.subtype === 'ARW' || item.item.subtype === 'SRW') {
    return `Атака = Бонус мастерства (${characterStore.character.proficiencyBonus}) + ЛОВ (${dex.value}) + бонус атаки предмета (${attackBonus}) = ${calculateAttack(item)}`;
  }
  return `Атака = бонус атаки предмета (${attackBonus}) = ${calculateAttack(item)}`;
};

const getDamageHintText = (item: InventoryItem): string => {
  const baseDamage = String(item.item.stats?.damage?.value ?? "");
  const parsedDamage = replaceDamageAbilityPlaceholders(baseDamage);
  const replaced = parsedDamage.value;
  const fallbackDamageFromWeaponType = parsedDamage.hasPlaceholders
      ? 0
      : calculateDamageFromWeaponType(item);
  const itemDamageBonus = getDamageBonus(item);
  const totalNumericBonus = fallbackDamageFromWeaponType + itemDamageBonus;
  const normalized = normalizeDamageExpression(
      replaced
      + (totalNumericBonus > 0 ? ` + ${totalNumericBonus}` : "")
      + (totalNumericBonus < 0 ? ` ${totalNumericBonus}` : "")
  );
  return `Урон: ${baseDamage}${replaced !== baseDamage ? ` -> ${replaced}` : ""}${totalNumericBonus !== 0 ? `; доп. бонус: ${totalNumericBonus > 0 ? "+" : ""}${totalNumericBonus}` : ""}; итог: ${normalized || "—"}`;
};

const showCombatHint = async (item: InventoryItem, type: "attack" | "damage") => {
  const toast = await toastController.create({
    message: type === "attack" ? getAttackHintText(item) : getDamageHintText(item),
    duration: 2600,
    position: "top",
  });
  await toast.present();
};

const onCombatPressStart = (item: InventoryItem, type: "attack" | "damage") => {
  clearPressHintTimer();
  longPressTriggered.value = false;
  pressHintTimeoutId.value = window.setTimeout(() => {
    longPressTriggered.value = true;
    void showCombatHint(item, type);
  }, 450);
};

const onCombatPressEnd = () => {
  clearPressHintTimer();
};

const onCombatShortClick = (item: InventoryItem, type: "attack" | "damage") => {
  if (longPressTriggered.value) {
    longPressTriggered.value = false;
    return;
  }
  openEditCombatBonusModal(item, type);
};

const currentCombatBonusValue = computed(() => {
  if (!editingCombatBonusItem.value) return 0;
  return editingCombatBonusType.value === "attack"
      ? getAttackBonus(editingCombatBonusItem.value)
      : getDamageBonus(editingCombatBonusItem.value);
});

const combatBonusTitle = computed(() => {
  return editingCombatBonusType.value === "attack" ? "Бонус к атаке" : "Бонус к урону";
});

async function saveItemCombatBonus(value: number) {
  if (!editingCombatBonusItem.value) return;

  const typePath = editingCombatBonusType.value === "attack" ? "/attack" : "/damage";
  const targetItem = editingCombatBonusItem.value;

  try {
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.items}/${targetItem.id}${typePath}${GATEWAY_INTEGRATION_ROUTES.bonus}`,
        {bonusValue: value},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );

    if (editingCombatBonusType.value === "attack") {
      setAttackBonus(targetItem, value);
    } else {
      setDamageBonus(targetItem, value);
    }
    await inventoryStore.updateInventoryInStoreById(route.params.roomId, route.params.characterId)
    closeEditCombatBonusModal();
  } catch (error) {
    console.error("Error while updating item combat bonus:", error);
  }
}

function openInventoryItem(item: InventoryItem) {
  inventoryItemStore.inventoryItem = item;
  ionRouter.navigate('/rooms/' + route.params.roomId + '/characters/' + route.params.characterId + '/inventory/' + item.id, 'forward', 'push')
}

async function saveCharacterSkill(characterSkill: CharacterSkill) {
  await axios.put(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.characterSkills}`,
      characterSkill,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        }
      }
  );
  await characterSkillsStore.updateCharacterSkills(route.params.roomId, route.params.characterId)
}

async function deleteCharacterSkill(id: string) {
  await axios.delete(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.characterSkills}/${id}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        }
      }
  );
  await characterSkillsStore.updateCharacterSkills(route.params.roomId, route.params.characterId)
}

</script>

<template>
  <div class="inventory-body">
    <div class="collapsible-section">
      <div
        class="section-header-row"
        :class="{ 'section-header-row--collapsed': !isEquippedSectionExpanded }"
        @click="!isEquippedSectionExpanded && (isEquippedSectionExpanded = true)"
      >
        <h1 class="sectionHeader">{{ HEADERS.equipped.rus }}</h1>
        <ion-button
          size="small"
          fill="outline"
          shape="round"
          color="transparent"
          class="section-toggle-button"
          @click.stop="isEquippedSectionExpanded = !isEquippedSectionExpanded"
        >
          <ion-icon slot="icon-only" :icon="isEquippedSectionExpanded ? chevronUpOutline : chevronDownOutline" color="primary"></ion-icon>
        </ion-button>
      </div>
      <div v-show="isEquippedSectionExpanded">
    <div v-if="!hasEquippedWeapons" class="hint-card">
      <div class="hint-title">Атаки оружием</div>
      <div class="hint-text">
        Для отображения атак сначала снарядите оружие в инвентаре кнопкой:
      </div>
      <div class="hint-equip-button-wrap">
        <ion-button size="small" shape="round" class="hint-equip-button" fill="solid" disabled>
          <ion-icon slot="icon-only" :icon="manOutline"></ion-icon>
        </ion-button>
      </div>
      <div class="hint-tab-location">
        Где найти инвентарь:
        <span class="tab-button-inventory" aria-hidden="true">
          <ion-icon :icon="inventoryTabIcon"></ion-icon>
        </span>
      </div>
    </div>
    <div class="equipped" v-if="hasEquippedWeapons">
      <div class="section"
           v-for="(item, idx) in equippedDrag.ordered" :key="item.id"
           :data-drag-list="equippedDrag.listId" :data-drag-index="idx"
           :class="{ 'is-dragging': equippedDrag.dragFromIndex === idx, 'is-drag-over': equippedDrag.dragOverIndex === idx && equippedDrag.dragFromIndex !== idx }">
        <div class="drag-handle drag-handle--corner"
             @pointerdown="equippedDrag.onHandlePointerDown($event, idx)"
             @pointermove="equippedDrag.onHandlePointerMove($event)"
             @pointerup="equippedDrag.onHandlePointerUp($event)"
             @pointercancel="equippedDrag.onHandlePointerCancel($event)">
          <ion-icon :icon="reorderThreeOutline"/>
        </div>
        <div class="image-block" @click="openInventoryItem(item)">
          <img width="75px" height="75px" class="item-image" :class="getRarityClass(item.item.rarity)"
               :src="getItemImageUrl(item.item.imgUrl)" :alt="item.item.name.rus"
               onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"/>
        </div>
        <div class="info-block">
          <div class="header-block">
            <div class="item-name">
              <span>
                {{ item.item.name.rus }}
              <span
                  v-if="characterStore.character.abilities.find(ability => ability.code === 'STR')?.value < Number(item.item.stats.requirement)"
                  style="color: red;">*</span>
            </span>
            </div>
            <div
              class="attack"
              @click="onCombatShortClick(item, 'attack')"
              @pointerdown="onCombatPressStart(item, 'attack')"
              @pointerup="onCombatPressEnd()"
              @pointercancel="onCombatPressEnd()"
              @pointerleave="onCombatPressEnd()"
            >
              <div class="attack-value">{{ calculateAttack(item) }}</div>
              <div class="attack-icon">
                <ion-icon :icon="contractOutline" color="primary" slot="icon-only"/>
              </div>
            </div>
          </div>
          <div class="item-footer-block">
            <div class="stats-block">
              <div class="item-stats" v-for="(stat, index) in getItemStats(item)" :key="index">
                {{ stat }}
              </div>
              <div
                class="damage"
                @click="onCombatShortClick(item, 'damage')"
                @pointerdown="onCombatPressStart(item, 'damage')"
                @pointerup="onCombatPressEnd()"
                @pointercancel="onCombatPressEnd()"
                @pointerleave="onCombatPressEnd()"
              >
                <div class="damage-icon">
                  <ion-icon :icon="skullOutline" color="primary" slot="icon-only"/>
                </div>
                <div class="damage-value">{{ getDamageText(item) || '—' }}</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
      </div>
    </div>
    <div class="collapsible-section">
      <div
        class="section-header-row"
        :class="{ 'section-header-row--collapsed': !isItemSkillsSectionExpanded }"
        @click="!isItemSkillsSectionExpanded && (isItemSkillsSectionExpanded = true)"
      >
        <h1 class="sectionHeader">{{ HEADERS.item_skills.rus }}</h1>
        <ion-button
          size="small"
          fill="outline"
          shape="round"
          color="transparent"
          class="section-toggle-button"
          @click.stop="isItemSkillsSectionExpanded = !isItemSkillsSectionExpanded"
        >
          <ion-icon slot="icon-only" :icon="isItemSkillsSectionExpanded ? chevronUpOutline : chevronDownOutline" color="primary"></ion-icon>
        </ion-button>
      </div>
      <div v-show="isItemSkillsSectionExpanded">
    <div v-if="!hasItemSkills" class="hint-card">
      <div class="hint-title">Навыки от снаряжения</div>
      <div class="hint-text">
        Они появятся здесь, когда вы снарядите предметы из инвентаря кнопкой:
      </div>
      <div class="hint-equip-button-wrap">
        <ion-button size="small" shape="round" class="hint-equip-button" fill="solid" disabled>
          <ion-icon slot="icon-only" :icon="manOutline"></ion-icon>
        </ion-button>
      </div>
      <div class="hint-text hint-text--subtle">
        Эта кнопка находится на карточке предмета в инвентаре.
      </div>
      <div class="hint-tab-location">
        Где найти инвентарь:
        <span class="tab-button-inventory" aria-hidden="true">
          <ion-icon :icon="inventoryTabIcon"></ion-icon>
        </span>
      </div>
    </div>
    <div class="skills" v-if="hasItemSkills">
      <div class="section-skill"
           v-for="(skill, idx) in skillsDrag.ordered" :key="skill.id"
           :data-drag-list="skillsDrag.listId" :data-drag-index="idx"
           :class="{ 'is-dragging': skillsDrag.dragFromIndex === idx, 'is-drag-over': skillsDrag.dragOverIndex === idx && skillsDrag.dragFromIndex !== idx }">
        <div class="drag-handle drag-handle--corner"
             @pointerdown="skillsDrag.onHandlePointerDown($event, idx)"
             @pointermove="skillsDrag.onHandlePointerMove($event)"
             @pointerup="skillsDrag.onHandlePointerUp($event)"
             @pointercancel="skillsDrag.onHandlePointerCancel($event)">
          <ion-icon :icon="reorderThreeOutline"/>
        </div>
        <div class="image-block">
          <img width="75px" height="75px" class="item-image"
               :src="getSkillImageUrl(skill.skill.imgUrl)"
               :alt="skill.skill.name.rus" onerror="this.onerror=null;
               this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"/>
        </div>
        <div class="info-block">
          <div class="item-name">
              <span>
                {{ skill.skill.name.rus }}
            </span>
          </div>
          <div class="item-footer-block">
            <div class="stats-block">
              <div class="item-stats" @click="openEditItemSkillModal(false, skill.skill)">
                <div class="description">
                  {{ skill.skill.shortDescription }}
                </div>
                <div class="charges" v-if="skill.skill.charges">
                  <div class="charges-title">Зарядов:</div>
                  <div class="charges-value">
                    <ion-progress-bar
                        :color="skill.currentCharges==1 ? 'warning' : skill.currentCharges==0 ? 'danger' : 'primary'"
                        :value="skill.currentCharges / skill.skill.charges"></ion-progress-bar>
                  </div>
                  <div class="charges-text-value">{{ skill.currentCharges }} / {{ skill.skill.charges }}</div>
                </div>
              </div>
            </div>
            <div class="buttons-block">
              <div class="use">
                <ion-button size="default" shape="round" @click="useSkill(skill)">
                  <ion-icon slot="icon-only" :icon="handRightOutline"></ion-icon>
                </ion-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      </div>
    </div>
    <div class="collapsible-section">
      <div
        class="section-header-row"
        :class="{ 'section-header-row--collapsed': !isCharacterSkillsSectionExpanded }"
        @click="!isCharacterSkillsSectionExpanded && (isCharacterSkillsSectionExpanded = true)"
      >
        <h1 class="sectionHeader">{{ HEADERS.character_skills.rus }}</h1>
        <ion-button
          size="small"
          fill="outline"
          shape="round"
          color="transparent"
          class="section-toggle-button"
          @click.stop="isCharacterSkillsSectionExpanded = !isCharacterSkillsSectionExpanded"
        >
          <ion-icon slot="icon-only" :icon="isCharacterSkillsSectionExpanded ? chevronUpOutline : chevronDownOutline" color="primary"></ion-icon>
        </ion-button>
      </div>
      <div v-show="isCharacterSkillsSectionExpanded">
    <div v-if="!hasCharacterSkills" class="hint-card hint-card--cta">
      <div class="hint-title">Навыки персонажа</div>
      <div class="hint-text">
        Добавьте новый навык по кнопке "+" внизу экрана.
      </div>
      <div class="hint-arrow" aria-hidden="true">↓</div>
    </div>
    <div class="skills" v-if="hasCharacterSkills">
      <div class="section-skill"
           v-for="(skill, idx) in charSkillsDrag.ordered" :key="skill.id"
           :data-drag-list="charSkillsDrag.listId" :data-drag-index="idx"
           :class="{ 'is-dragging': charSkillsDrag.dragFromIndex === idx, 'is-drag-over': charSkillsDrag.dragOverIndex === idx && charSkillsDrag.dragFromIndex !== idx }">
        <div class="drag-handle drag-handle--corner"
             @pointerdown="charSkillsDrag.onHandlePointerDown($event, idx)"
             @pointermove="charSkillsDrag.onHandlePointerMove($event)"
             @pointerup="charSkillsDrag.onHandlePointerUp($event)"
             @pointercancel="charSkillsDrag.onHandlePointerCancel($event)">
          <ion-icon :icon="reorderThreeOutline"/>
        </div>
        <div class="image-block">
          <img width="75px" height="75px" class="item-image"
               :src="getSkillImageUrl(skill.imgUrl)"
               :alt="skill.name"/>
        </div>
        <div class="info-block">
          <div class="item-name">
              <span>
                {{ skill.name }}
            </span>
          </div>
          <div class="item-footer-block">
            <div class="stats-block">
              <div class="item-stats" @click="openEditCharacterSkillModal(false, skill)">
                <div class="description">
                  {{ skill.shortDescription }}
                </div>
                <div class="charges" v-if="skill.charges">
                  <div class="charges-title">Зарядов:</div>
                  <div class="charges-value">
                    <ion-progress-bar
                        :color="skill.currentCharges==1 ? 'warning' : skill.currentCharges==0 ? 'danger' : 'primary'"
                        :value="skill.currentCharges / skill.charges"></ion-progress-bar>
                  </div>
                  <div class="charges-text-value">{{ skill.currentCharges }} / {{ skill.charges }}</div>
                </div>
              </div>
            </div>
            <div class="buttons-block">
              <div class="use">
                <ion-button size="default" shape="round" @click="useSkill(skill)">
                  <ion-icon slot="icon-only" :icon="handRightOutline"></ion-icon>
                </ion-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      </div>
    </div>
  <div class="security-block" style="height: 50px;"></div>
  </div>
  <div class="add-new-button">
    <ion-button color="secondary" size="large" shape="round" @click="openEditCharacterSkillModal(true, undefined)">
      <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
    </ion-button>
  </div>

  <EditItemSkillValueModal :isOpen="showEditItemSkillModal"
                           :character-id="String(route.params.characterId)"
                           :is-editing="false"
                           :item-skill="editingItemSkill"
                           :is-read-only="true"
                           @closeEditItemSkillModal="closeEditItemSkillModal"/>

  <EditCharacterSkillValueModal :isOpen="showEditCharacterSkillModal"
                                :character-id="String(route.params.characterId)"
                                :is-editing="isEditingCharacterSkill"
                                :character-skill="editingCharacterSkill"
                                :is-read-only="false"
                                @closeEditCharacterSkillModal="closeEditCharacterSkillModal"
                                @saveCharacterSkill="(characterSkill : CharacterSkill) => saveCharacterSkill(characterSkill)"
                                @deleteCharacterSkill="(skillId : string) => deleteCharacterSkill(skillId)"/>

  <EditItemCombatBonusModal
      :isOpen="showEditCombatBonusModal"
      :title="combatBonusTitle"
      :initialValue="currentCombatBonusValue"
      @close="closeEditCombatBonusModal"
      @save="(value: number) => saveItemCombatBonus(value)"
  />
</template>

<style scoped>
.inventory-body {
  padding-bottom: max(60px, calc(52px + env(safe-area-inset-bottom, 0)));
}

.equipped,
.skills {
  margin-bottom: 8px;
}

.hint-card {
  margin: 8px 0 12px;
  padding: 14px 14px 12px;
  border-radius: 16px;
  background:
    radial-gradient(circle at 15% 20%, rgba(var(--ion-color-primary-rgb), 0.16), rgba(var(--ion-color-primary-rgb), 0) 45%),
    linear-gradient(180deg, rgba(var(--ion-color-medium-rgb), 0.48), rgba(var(--ion-color-medium-rgb), 0.30));
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.28);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
  text-align: center;
}

.hint-card--cta {
  animation: hintPulse 2.2s ease-in-out infinite;
}

.hint-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.hint-text {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.35;
  color: var(--ion-color-light);
  opacity: 0.96;
}

.hint-text--subtle {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.8;
}

.hint-equip-button-wrap {
  margin-top: 8px;
  display: flex;
  justify-content: center;
}

.hint-equip-button {
  --opacity: 1;
  --border-radius: 999px;
}

.hint-equip-button[disabled] {
  opacity: 1;
}

.hint-tab-location {
  margin-top: 6px;
  font-size: 12px;
  color: var(--ion-color-light);
  opacity: 0.88;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tab-button-inventory {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--ion-color-dark-rgb), 0.28);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.18);
}

.tab-button-inventory ion-icon {
  width: 18px;
  height: 18px;
}

.hint-arrow {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: rgba(var(--ion-color-primary-rgb), 0.95);
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  animation: hintArrowBounce 1.2s ease-in-out infinite;
}

@keyframes hintArrowBounce {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.85;
  }
  50% {
    transform: translateY(6px);
    opacity: 1;
  }
}

@keyframes hintPulse {
  0%, 100% {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
    border-color: rgba(var(--ion-color-primary-rgb), 0.28);
  }
  50% {
    box-shadow: 0 10px 24px rgba(var(--ion-color-primary-rgb), 0.28);
    border-color: rgba(var(--ion-color-primary-rgb), 0.5);
  }
}

.stats-block {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.header-block {
  display: flex;
  justify-content: space-between;
  padding-right: 5px;
  padding-bottom: 0;
}

.charges {
  display: flex;
  flex-direction: row;
  gap: 5px;
}

.charges-value {
  min-width: 100px;
  width: 120px;
}

:deep(ion-progress-bar) {
  height: 12px;
  border-radius: 6px;
}

.collapsible-section {
  margin-bottom: 4px;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
}

.section-header-row .sectionHeader {
  flex: 1;
  margin-top: 0;
  margin-bottom: 0;
  min-width: 0;
}

.section-header-row--collapsed {
  margin-bottom: 2px;
}

.section-toggle-button {
  --padding-start: 6px;
  --padding-end: 6px;
  --border-width: 1px;
  min-height: 30px;
  flex-shrink: 0;
}

.section-toggle-button ion-icon {
  width: 16px;
  height: 16px;
}

.sectionHeader {
  color: var(--ion-color-light);
  font-size: 22px;
  font-weight: normal;
  margin-top: 10px;
}

.section {
  background-color: var(--ion-color-medium);
  border-radius: 25px;
  padding: 5px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  width: 100%;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  transition: opacity 0.15s ease, box-shadow 0.15s ease;
}

.section-skill {
  background-color: var(--ion-color-medium);
  border-radius: 25px;
  padding: 5px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  width: 100%;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  transition: opacity 0.15s ease, box-shadow 0.15s ease;
}

.section.is-dragging,
.section-skill.is-dragging { opacity: 0.35; box-shadow: none; }

.section.is-drag-over,
.section-skill.is-drag-over { box-shadow: 0 0 0 2px var(--ion-color-primary), 0 8px 20px rgba(0,0,0,.35); }

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  flex-shrink: 0;
  color: rgba(var(--ion-color-light-rgb), 0.35);
  font-size: 20px;
  cursor: grab;
  touch-action: none;
  transition: color 0.15s ease;
}
.drag-handle:hover { color: rgba(var(--ion-color-light-rgb), 0.7); }

.drag-handle--corner {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 28px;
  height: 28px;
  font-size: 22px;
}

.info-block {
  display: flex;
  flex: 1;
  flex-direction: column;
  margin-right: 0;
  gap: 5px;
}

.item-footer-block {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.use {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.buttons-block {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
}

.item-name {
  font-size: 16px;
  font-weight: bold;
}

.item-stats {
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 11px;
  min-height: 15px;
}

.image-block {
  width: 75px;
  height: 75px;
}

.item-image {
  width: 75px;
  height: 75px;
  border-radius: 20px;
  border: 2px solid transparent;
}

.rarity-common {
  border-color: gray;
}

.rarity-uncommon {
  border-color: green;
}

.rarity-rare {
  border-color: blue;
}

.rarity-very-rare {
  border-color: purple;
}

.rarity-legendary {
  border-color: orange;
}

.damage, .attack {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  border-radius: 10px;
  height: 20px;
  width: auto;
  cursor: pointer;
}

.damage-value, .attack-value {
  font-size: 11px;
  height: 15px;
  width: auto;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding-left: 5px;
}

.damage-value {
  color: var(--ion-color-primary);
}

.damage {
  margin-top: 2px;
}

.attack-value {
  font-size: 16px;
}

.add-new-button {
  position: fixed;
  bottom: 60px;
  left: 0;
  right: 0;
  width: 100%;
  background: transparent;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
  padding-bottom: max(8px, env(safe-area-inset-bottom, 0));
}

.attack-icon,
.damage-icon {
  font-size: 22px;
  display: flex;
  align-items: center;
}

.description {
  word-break: break-word;
  min-width: 0;
}

@media (min-width: 1024px) {
  .add-new-button {
    bottom: 10px;
  }
}

</style>
