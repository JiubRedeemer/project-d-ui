<script setup lang="ts">

import {HEADERS, TEXTS} from "@/config/localisations";
import {computed, ref} from "vue";
import {useInventoryStore} from "@/stores/InventoryStore";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useCharacterStore} from "@/stores/CharacterStore";
import {InventoryItem, InventoryItemSkill, ItemSkill} from "@/components/models/response/InventoryResponse";
import {addOutline, chevronDownOutline, chevronUpOutline, contractOutline, handRightOutline, manOutline, reorderThreeOutline, skullOutline} from "ionicons/icons";
import {IonButton, IonIcon, IonProgressBar, toastController, useIonRouter} from "@ionic/vue";
import DiceRollSheet from "@/views/character/tabs/attacksAndSkills/DiceRollSheet.vue";
import {rollFormula, rollAttack, type DiceRollResult} from "@/composables/useDice";
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

// ── Фехтовальное: выбор СИЛ / ЛОВ ───────────────────────────────────────
const finesseChoice = ref<Map<string, 'STR' | 'DEX'>>(new Map());

function isFinesseWeapon(item: InventoryItem): boolean {
  return item.item.stats?.tags?.includes('Фехтовальное') ?? false;
}

function getFinesseChoice(item: InventoryItem): 'STR' | 'DEX' {
  return finesseChoice.value.get(item.id) ?? 'STR';
}

function toggleFinesseChoice(item: InventoryItem): void {
  const next = new Map(finesseChoice.value);
  next.set(item.id, getFinesseChoice(item) === 'STR' ? 'DEX' : 'STR');
  finesseChoice.value = next;
}

// ── Универсальное: выбор одноручного / двуручного ────────────────────────
const versatileChoice = ref<Map<string, 'one' | 'two'>>(new Map());

function isVersatileWeapon(item: InventoryItem): boolean {
  return item.item.stats?.tags?.some((t: string) => /^Универсальное/i.test(t)) ?? false;
}

function parseVersatileDamage(item: InventoryItem): string | null {
  const tag = item.item.stats?.tags?.find((t: string) => /^Универсальное/i.test(t));
  if (!tag) return null;
  const match = /\(([^)]+)\)/.exec(tag);
  if (!match) return null;
  const raw = match[1].trim().replace(/к/gi, 'd');
  return raw || null;
}

function getVersatileChoice(item: InventoryItem): 'one' | 'two' {
  return versatileChoice.value.get(item.id) ?? 'one';
}

function toggleVersatileChoice(item: InventoryItem): void {
  const next = new Map(versatileChoice.value);
  next.set(item.id, getVersatileChoice(item) === 'one' ? 'two' : 'one');
  versatileChoice.value = next;
}

function getEffectiveBaseDamage(item: InventoryItem): string {
  const raw = String(item.item.stats?.damage?.value ?? '');
  if (isVersatileWeapon(item) && getVersatileChoice(item) === 'two') {
    const two = parseVersatileDamage(item);
    if (two) return two;
  }
  return raw;
}

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
  const parsedDamage = replaceDamageAbilityPlaceholders(getEffectiveBaseDamage(item));
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

const isHeavyHandWeapon = (item: InventoryItem) =>
  item.item.subtype === 'EHW' || item.item.subtype === 'AHW' || item.item.subtype === 'SHW';

const isRangedWeapon = (item: InventoryItem) =>
  item.item.subtype === 'ERW' || item.item.subtype === 'ARW' || item.item.subtype === 'SRW';

const getAttackAbilityMod = (item: InventoryItem): number => {
  if (isFinesseWeapon(item)) {
    return getFinesseChoice(item) === 'DEX' ? dex.value : str.value;
  }
  if (isHeavyHandWeapon(item)) return str.value;
  if (isRangedWeapon(item)) return dex.value;
  return 0;
};

const getAttackAbilityLabel = (item: InventoryItem): string => {
  if (isFinesseWeapon(item)) {
    return getFinesseChoice(item) === 'DEX' ? 'ЛОВ' : 'СИЛ';
  }
  if (isHeavyHandWeapon(item)) return 'СИЛ';
  if (isRangedWeapon(item)) return 'ЛОВ';
  return '';
};

const calculateAttack = (item: InventoryItem) => {
  const mod = getAttackAbilityMod(item);
  if (isHeavyHandWeapon(item) || isFinesseWeapon(item)) {
    return characterStore.character.proficiencyBonus + mod + getAttackBonus(item);
  } else if (isRangedWeapon(item)) {
    return characterStore.character.proficiencyBonus + mod + getAttackBonus(item);
  }
  return getAttackBonus(item);
};

const calculateDamageFromWeaponType = (item: InventoryItem) => {
  if (isFinesseWeapon(item)) {
    return getFinesseChoice(item) === 'DEX' ? dex.value : str.value;
  }
  if (isHeavyHandWeapon(item)) return str.value;
  if (isRangedWeapon(item)) return dex.value;
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

// Dice roll sheet
const diceSheetOpen = ref(false);
const diceSheetTitle = ref("");
const diceSheetSubtitle = ref("");
const diceSheetMode = ref<"attack" | "damage">("attack");
const diceResult = ref<DiceRollResult | null>(null);

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
  const lbl = getAttackAbilityLabel(item);
  const mod = getAttackAbilityMod(item);
  if (isHeavyHandWeapon(item) || isRangedWeapon(item) || isFinesseWeapon(item)) {
    return `Атака = Бонус мастерства (${characterStore.character.proficiencyBonus}) + ${lbl} (${mod}) + бонус атаки предмета (${attackBonus}) = ${calculateAttack(item)}`;
  }
  return `Атака = бонус атаки предмета (${attackBonus}) = ${calculateAttack(item)}`;
};

const getDamageBreakdownText = (item: InventoryItem): string => {
  const baseDamage = getEffectiveBaseDamage(item);
  const parsedDamage = replaceDamageAbilityPlaceholders(baseDamage);
  const fallback = parsedDamage.hasPlaceholders ? 0 : calculateDamageFromWeaponType(item);
  const itemBonus = getDamageBonus(item);

  const parts: string[] = [baseDamage];
  if (fallback !== 0) {
    const lbl = getAttackAbilityLabel(item) || (isRangedWeapon(item) ? 'ЛОВ' : 'СИЛ');
    parts.push(`${fallback > 0 ? '+' : ''}${fallback} (${lbl})`);
  }
  if (itemBonus !== 0) {
    parts.push(`${itemBonus > 0 ? '+' : ''}${itemBonus} (предмет)`);
  }
  return parts.join(' ');
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
    openEditCombatBonusModal(item, type);
  }, 500);
};

const onCombatPressEnd = () => {
  clearPressHintTimer();
};

const onCombatShortClick = (item: InventoryItem, type: "attack" | "damage") => {
  if (longPressTriggered.value) {
    longPressTriggered.value = false;
    return;
  }
  // Tap = roll dice
  if (type === "attack") {
    diceSheetMode.value = "attack";
    diceSheetTitle.value = `${item.item.name.rus} — Атака`;
    diceSheetSubtitle.value = getAttackHintText(item);
    diceResult.value = rollAttack(calculateAttack(item));
  } else {
    const formula = getDamageText(item);
    diceSheetMode.value = "damage";
    diceSheetTitle.value = `${item.item.name.rus} — Урон`;
    diceSheetSubtitle.value = getDamageBreakdownText(item);
    diceResult.value = formula ? rollFormula(formula) : rollFormula("1");
  }
  diceSheetOpen.value = true;
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

    <!-- Оружие -->
    <div class="collapsible-section">
      <div
        class="section-header-row"
        :class="{ 'section-header-row--collapsed': !isEquippedSectionExpanded }"
        @click="!isEquippedSectionExpanded && (isEquippedSectionExpanded = true)"
      >
        <h1 class="sectionHeader">{{ HEADERS.equipped.rus }}</h1>
        <ion-button size="small" fill="outline" shape="round" color="transparent" class="section-toggle-button"
          @click.stop="isEquippedSectionExpanded = !isEquippedSectionExpanded">
          <ion-icon slot="icon-only" :icon="isEquippedSectionExpanded ? chevronUpOutline : chevronDownOutline" color="primary"/>
        </ion-button>
      </div>
      <div v-show="isEquippedSectionExpanded">
        <div v-if="!hasEquippedWeapons" class="hint-card">
          <div class="hint-title">Атаки оружием</div>
          <div class="hint-text">Для отображения атак сначала снарядите оружие в инвентаре кнопкой:</div>
          <div class="hint-equip-button-wrap">
            <ion-button size="small" shape="round" class="hint-equip-button" fill="solid" disabled>
              <ion-icon slot="icon-only" :icon="manOutline"/>
            </ion-button>
          </div>
          <div class="hint-tab-location">
            Где найти инвентарь:
            <span class="tab-button-inventory" aria-hidden="true"><ion-icon :icon="inventoryTabIcon"/></span>
          </div>
        </div>
        <div class="equipped" v-if="hasEquippedWeapons">
          <div class="weapon-card"
               v-for="(item, idx) in equippedDrag.ordered" :key="item.id"
               :data-drag-list="equippedDrag.listId" :data-drag-index="idx"
               :class="{ 'is-dragging': equippedDrag.dragFromIndex === idx, 'is-drag-over': equippedDrag.dragOverIndex === idx && equippedDrag.dragFromIndex !== idx }">
            <div class="weapon-drag-handle"
                 @pointerdown="equippedDrag.onHandlePointerDown($event, idx)"
                 @pointermove="equippedDrag.onHandlePointerMove($event)"
                 @pointerup="equippedDrag.onHandlePointerUp($event)"
                 @pointercancel="equippedDrag.onHandlePointerCancel($event)">
              <ion-icon :icon="reorderThreeOutline"/>
            </div>
            <img class="weapon-image" :class="getRarityClass(item.item.rarity)"
                 width="70" height="70"
                 :src="getItemImageUrl(item.item.imgUrl)" :alt="item.item.name.rus"
                 onerror="this.onerror=null;this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                 @click="openInventoryItem(item)"/>
            <div class="weapon-body">
              <div class="weapon-name">
                {{ item.item.name.rus }}
                <span v-if="characterStore.character.abilities.find(a => a.code === 'STR')?.value < Number(item.item.stats.requirement)" class="weapon-req-warning">*</span>
              </div>
              <div v-if="isFinesseWeapon(item)" class="finesse-toggle" @click.stop="toggleFinesseChoice(item)">
                <span class="finesse-toggle__label">Фехтовальное</span>
                <div class="finesse-toggle__switch">
                  <span :class="['finesse-opt', getFinesseChoice(item) === 'STR' ? 'finesse-opt--active' : '']">СИЛ</span>
                  <span :class="['finesse-opt', getFinesseChoice(item) === 'DEX' ? 'finesse-opt--active' : '']">ЛОВ</span>
                </div>
              </div>
              <div v-if="isVersatileWeapon(item) && parseVersatileDamage(item)" class="finesse-toggle" @click.stop="toggleVersatileChoice(item)">
                <span class="finesse-toggle__label">Универсальное</span>
                <div class="finesse-toggle__switch">
                  <span :class="['finesse-opt', getVersatileChoice(item) === 'one' ? 'finesse-opt--active' : '']">1Р</span>
                  <span :class="['finesse-opt', getVersatileChoice(item) === 'two' ? 'finesse-opt--active' : '']">2Р</span>
                </div>
              </div>
              <div class="weapon-chips" v-if="getItemStats(item).length">
                <span class="weapon-chip" v-for="(stat, i) in getItemStats(item)" :key="i">{{ stat }}</span>
              </div>
              <div class="weapon-actions">
                <div class="weapon-action weapon-action--attack"
                     @click="onCombatShortClick(item, 'attack')"
                     @pointerdown="onCombatPressStart(item, 'attack')"
                     @pointerup="onCombatPressEnd()"
                     @pointercancel="onCombatPressEnd()"
                     @pointerleave="onCombatPressEnd()">
                  <div class="weapon-action__label"><ion-icon :icon="contractOutline"/> Атака</div>
                  <div class="weapon-action__value">{{ calculateAttack(item) >= 0 ? '+' : '' }}{{ calculateAttack(item) }}</div>
                </div>
                <div class="weapon-action weapon-action--damage"
                     @click="onCombatShortClick(item, 'damage')"
                     @pointerdown="onCombatPressStart(item, 'damage')"
                     @pointerup="onCombatPressEnd()"
                     @pointercancel="onCombatPressEnd()"
                     @pointerleave="onCombatPressEnd()">
                  <div class="weapon-action__label"><ion-icon :icon="skullOutline"/> Урон</div>
                  <div class="weapon-action__value weapon-action__value--damage">{{ getDamageText(item) || '—' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Навыки от снаряжения -->
    <div class="collapsible-section">
      <div
        class="section-header-row"
        :class="{ 'section-header-row--collapsed': !isItemSkillsSectionExpanded }"
        @click="!isItemSkillsSectionExpanded && (isItemSkillsSectionExpanded = true)"
      >
        <h1 class="sectionHeader">{{ HEADERS.item_skills.rus }}</h1>
        <ion-button size="small" fill="outline" shape="round" color="transparent" class="section-toggle-button"
          @click.stop="isItemSkillsSectionExpanded = !isItemSkillsSectionExpanded">
          <ion-icon slot="icon-only" :icon="isItemSkillsSectionExpanded ? chevronUpOutline : chevronDownOutline" color="primary"/>
        </ion-button>
      </div>
      <div v-show="isItemSkillsSectionExpanded">
        <div v-if="!hasItemSkills" class="hint-card">
          <div class="hint-title">Навыки от снаряжения</div>
          <div class="hint-text">Они появятся здесь, когда вы снарядите предметы из инвентаря кнопкой:</div>
          <div class="hint-equip-button-wrap">
            <ion-button size="small" shape="round" class="hint-equip-button" fill="solid" disabled>
              <ion-icon slot="icon-only" :icon="manOutline"/>
            </ion-button>
          </div>
          <div class="hint-text hint-text--subtle">Эта кнопка находится на карточке предмета в инвентаре.</div>
          <div class="hint-tab-location">
            Где найти инвентарь:
            <span class="tab-button-inventory" aria-hidden="true"><ion-icon :icon="inventoryTabIcon"/></span>
          </div>
        </div>
        <div class="skills" v-if="hasItemSkills">
          <div class="skill-card"
               v-for="(skill, idx) in skillsDrag.ordered" :key="skill.id"
               :data-drag-list="skillsDrag.listId" :data-drag-index="idx"
               :class="{ 'is-dragging': skillsDrag.dragFromIndex === idx, 'is-drag-over': skillsDrag.dragOverIndex === idx && skillsDrag.dragFromIndex !== idx }">
            <div class="skill-drag-handle"
                 @pointerdown="skillsDrag.onHandlePointerDown($event, idx)"
                 @pointermove="skillsDrag.onHandlePointerMove($event)"
                 @pointerup="skillsDrag.onHandlePointerUp($event)"
                 @pointercancel="skillsDrag.onHandlePointerCancel($event)">
              <ion-icon :icon="reorderThreeOutline"/>
            </div>
            <img class="skill-image" width="46" height="46"
                 :src="getSkillImageUrl(skill.skill.imgUrl)" :alt="skill.skill.name.rus"
                 onerror="this.onerror=null;this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"/>
            <div class="skill-body" @click="openEditItemSkillModal(false, skill.skill)">
              <div class="skill-name">{{ skill.skill.name.rus }}</div>
              <div class="skill-desc" v-if="skill.skill.shortDescription && skill.skill.shortDescription !== skill.skill.name.rus">
                {{ skill.skill.shortDescription }}
              </div>
              <div class="skill-charges" v-if="skill.skill.charges">
                <ion-progress-bar
                  :color="skill.currentCharges === 0 ? 'danger' : skill.currentCharges === 1 && skill.skill.charges > 1 ? 'warning' : 'primary'"
                  :value="Math.min(1, skill.currentCharges / skill.skill.charges)"/>
                <span class="skill-charges-text">{{ skill.currentCharges }} / {{ skill.skill.charges }}</span>
              </div>
            </div>
            <ion-button class="skill-use-btn" :class="{ 'skill-use-btn--depleted': skill.currentCharges <= 0 }"
                        size="small" shape="round" @click.stop="useSkill(skill)">
              <ion-icon slot="icon-only" :icon="handRightOutline"/>
            </ion-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Навыки персонажа -->
    <div class="collapsible-section">
      <div
        class="section-header-row"
        :class="{ 'section-header-row--collapsed': !isCharacterSkillsSectionExpanded }"
        @click="!isCharacterSkillsSectionExpanded && (isCharacterSkillsSectionExpanded = true)"
      >
        <h1 class="sectionHeader">{{ HEADERS.character_skills.rus }}</h1>
        <ion-button size="small" fill="outline" shape="round" color="transparent" class="section-toggle-button"
          @click.stop="isCharacterSkillsSectionExpanded = !isCharacterSkillsSectionExpanded">
          <ion-icon slot="icon-only" :icon="isCharacterSkillsSectionExpanded ? chevronUpOutline : chevronDownOutline" color="primary"/>
        </ion-button>
      </div>
      <div v-show="isCharacterSkillsSectionExpanded">
        <div v-if="!hasCharacterSkills" class="hint-card hint-card--cta">
          <div class="hint-title">Навыки персонажа</div>
          <div class="hint-text">Добавьте новый навык по кнопке "+" внизу экрана.</div>
          <div class="hint-arrow" aria-hidden="true">↓</div>
        </div>
        <div class="skills" v-if="hasCharacterSkills">
          <div class="skill-card"
               v-for="(skill, idx) in charSkillsDrag.ordered" :key="skill.id"
               :data-drag-list="charSkillsDrag.listId" :data-drag-index="idx"
               :class="{ 'is-dragging': charSkillsDrag.dragFromIndex === idx, 'is-drag-over': charSkillsDrag.dragOverIndex === idx && charSkillsDrag.dragFromIndex !== idx }">
            <div class="skill-drag-handle"
                 @pointerdown="charSkillsDrag.onHandlePointerDown($event, idx)"
                 @pointermove="charSkillsDrag.onHandlePointerMove($event)"
                 @pointerup="charSkillsDrag.onHandlePointerUp($event)"
                 @pointercancel="charSkillsDrag.onHandlePointerCancel($event)">
              <ion-icon :icon="reorderThreeOutline"/>
            </div>
            <img class="skill-image" width="46" height="46"
                 :src="getSkillImageUrl(skill.imgUrl)" :alt="skill.name"
                 onerror="this.onerror=null;this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"/>
            <div class="skill-body" @click="openEditCharacterSkillModal(false, skill)">
              <div class="skill-name">{{ skill.name }}</div>
              <div class="skill-desc" v-if="skill.shortDescription && skill.shortDescription !== skill.name">
                {{ skill.shortDescription }}
              </div>
              <div class="skill-charges" v-if="skill.charges">
                <ion-progress-bar
                  :color="skill.currentCharges === 0 ? 'danger' : skill.currentCharges === 1 && skill.charges > 1 ? 'warning' : 'primary'"
                  :value="Math.min(1, skill.currentCharges / skill.charges)"/>
                <span class="skill-charges-text">{{ skill.currentCharges }} / {{ skill.charges }}</span>
              </div>
            </div>
            <ion-button class="skill-use-btn" :class="{ 'skill-use-btn--depleted': skill.currentCharges <= 0 }"
                        size="small" shape="round" @click.stop="useSkill(skill)">
              <ion-icon slot="icon-only" :icon="handRightOutline"/>
            </ion-button>
          </div>
        </div>
      </div>
    </div>

    <div style="height: 50px;"></div>
  </div>

  <div class="add-new-button">
    <ion-button color="secondary" size="large" shape="round" @click="openEditCharacterSkillModal(true, undefined)">
      <ion-icon slot="icon-only" :icon="addOutline"/>
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
                                @saveCharacterSkill="(characterSkill: CharacterSkill) => saveCharacterSkill(characterSkill)"
                                @deleteCharacterSkill="(skillId: string) => deleteCharacterSkill(skillId)"/>

  <EditItemCombatBonusModal
      :isOpen="showEditCombatBonusModal"
      :title="combatBonusTitle"
      :initialValue="currentCombatBonusValue"
      @close="closeEditCombatBonusModal"
      @save="(value: number) => saveItemCombatBonus(value)"
  />

  <DiceRollSheet
      :isOpen="diceSheetOpen"
      :title="diceSheetTitle"
      :subtitle="diceSheetSubtitle"
      :result="diceResult"
      :mode="diceSheetMode"
      @close="diceSheetOpen = false"
  />
</template>

<style scoped>
.inventory-body {
  padding-bottom: max(60px, calc(52px + env(safe-area-inset-bottom, 0)));
}

/* ── Collapsible sections ── */
.collapsible-section { margin-bottom: 4px; }

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
}
.section-header-row .sectionHeader { flex: 1; margin: 0; min-width: 0; }
.section-header-row--collapsed { margin-bottom: 2px; }

.section-toggle-button {
  --padding-start: 6px;
  --padding-end: 6px;
  --border-width: 1px;
  min-height: 30px;
  flex-shrink: 0;
}
.section-toggle-button ion-icon { width: 16px; height: 16px; }

.sectionHeader {
  color: var(--ion-color-light);
  font-size: 22px;
  font-weight: normal;
  margin-top: 10px;
}

.equipped, .skills { margin-bottom: 8px; }

/* ── Hint cards ── */
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
.hint-card--cta { animation: hintPulse 2.2s ease-in-out infinite; }
.hint-title { font-size: 15px; font-weight: 700; color: var(--ion-color-light); }
.hint-text { margin-top: 6px; font-size: 13px; line-height: 1.35; color: var(--ion-color-light); opacity: 0.96; }
.hint-text--subtle { margin-top: 4px; font-size: 12px; opacity: 0.8; }
.hint-equip-button-wrap { margin-top: 8px; display: flex; justify-content: center; }
.hint-equip-button { --opacity: 1; --border-radius: 999px; }
.hint-equip-button[disabled] { opacity: 1; }
.hint-tab-location {
  margin-top: 6px; font-size: 12px; color: var(--ion-color-light); opacity: 0.88;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.tab-button-inventory {
  width: 30px; height: 30px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(var(--ion-color-dark-rgb), 0.28);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.18);
}
.tab-button-inventory ion-icon { width: 18px; height: 18px; }
.hint-arrow {
  margin-top: 8px; font-size: 22px; font-weight: 700; line-height: 1;
  color: rgba(var(--ion-color-primary-rgb), 0.95);
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  animation: hintArrowBounce 1.2s ease-in-out infinite;
}
@keyframes hintArrowBounce {
  0%, 100% { transform: translateY(0); opacity: 0.85; }
  50% { transform: translateY(6px); opacity: 1; }
}
@keyframes hintPulse {
  0%, 100% { box-shadow: 0 8px 20px rgba(0,0,0,.22); border-color: rgba(var(--ion-color-primary-rgb), 0.28); }
  50% { box-shadow: 0 10px 24px rgba(var(--ion-color-primary-rgb), 0.28); border-color: rgba(var(--ion-color-primary-rgb), 0.5); }
}

/* ══════════════════════════════
   WEAPON CARD
   ══════════════════════════════ */
.weapon-card {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 10px;
  background: var(--ion-color-medium);
  border-radius: 20px;
  padding: 10px 12px 10px 12px;
  margin-bottom: 10px;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  transition: opacity 0.15s ease, box-shadow 0.15s ease;
}
.weapon-card.is-dragging { opacity: 0.35; box-shadow: none; }
.weapon-card.is-drag-over { box-shadow: 0 0 0 2px var(--ion-color-primary), 0 8px 20px rgba(0,0,0,.35); }

.weapon-drag-handle {
  position: absolute;
  top: 6px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: rgba(var(--ion-color-light-rgb), 0.35);
  font-size: 22px;
  cursor: grab;
  touch-action: none;
  transition: color 0.15s ease;
  z-index: 1;
}
.weapon-drag-handle:hover { color: rgba(var(--ion-color-light-rgb), 0.7); }

.weapon-image {
  width: 70px;
  height: 70px;
  border-radius: 16px;
  border: 2px solid transparent;
  flex-shrink: 0;
  object-fit: cover;
  cursor: pointer;
  align-self: center;
}

.weapon-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 6px;
}

.weapon-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-light);
  line-height: 1.25;
  word-break: break-word;
}

.weapon-req-warning { color: var(--ion-color-danger); margin-left: 2px; }

.weapon-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.weapon-chip {
  font-size: 10px;
  line-height: 1;
  padding: 3px 7px;
  border-radius: 99px;
  background: rgba(var(--ion-color-primary-rgb), 0.18);
  color: rgba(var(--ion-color-light-rgb), 0.8);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
  white-space: nowrap;
}

.weapon-actions {
  display: flex;
  flex-direction: row;
  gap: 8px;
}

.weapon-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: filter 0.15s ease;
}
.weapon-action:active { filter: brightness(1.2); }

.weapon-action--attack {
  background: rgba(var(--ion-color-secondary-rgb), 0.25);
  border: 1px solid rgba(var(--ion-color-secondary-rgb), 0.5);
}
.weapon-action--damage {
  background: rgba(var(--ion-color-danger-rgb), 0.18);
  border: 1px solid rgba(var(--ion-color-danger-rgb), 0.4);
}

.weapon-action__label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--ion-color-light-rgb), 0.6);
  margin-bottom: 2px;
}
.weapon-action--attack .weapon-action__label { color: var(--ion-color-primary); }
.weapon-action--damage .weapon-action__label { color: var(--ion-color-danger-tint); }
.weapon-action__label ion-icon { font-size: 12px; flex-shrink: 0; }

.weapon-action__value {
  font-size: 20px;
  font-weight: 700;
  color: var(--ion-color-light);
  line-height: 1;
  word-break: break-word;
  text-align: center;
}
.weapon-action__value--damage {
  font-size: 14px;
  font-weight: 600;
  color: rgba(var(--ion-color-light-rgb), 0.9);
}

/* Rarity borders */
.rarity-common    { border-color: #7a7a7a; }
.rarity-uncommon  { border-color: #4caf50; }
.rarity-rare      { border-color: #2196f3; }
.rarity-very-rare { border-color: #9c27b0; }
.rarity-legendary { border-color: #ff9800; }

/* ══════════════════════════════
   SKILL CARD
   ══════════════════════════════ */
.skill-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  background: var(--ion-color-medium);
  border-radius: 16px;
  padding: 8px 10px 8px 8px;
  margin-bottom: 8px;
  user-select: none;
  -webkit-user-select: none;
  transition: opacity 0.15s ease, box-shadow 0.15s ease;
}
.skill-card.is-dragging { opacity: 0.35; box-shadow: none; }
.skill-card.is-drag-over { box-shadow: 0 0 0 2px var(--ion-color-primary), 0 6px 16px rgba(0,0,0,.35); }

.skill-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  flex-shrink: 0;
  color: rgba(var(--ion-color-light-rgb), 0.3);
  font-size: 20px;
  cursor: grab;
  touch-action: none;
  transition: color 0.15s ease;
}
.skill-drag-handle:hover { color: rgba(var(--ion-color-light-rgb), 0.65); }

.skill-image {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.skill-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 3px;
  cursor: pointer;
}

.skill-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--ion-color-light);
  line-height: 1.2;
  word-break: break-word;
}

.skill-desc {
  font-size: 11px;
  color: rgba(var(--ion-color-light-rgb), 0.65);
  line-height: 1.3;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.skill-charges {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

:deep(ion-progress-bar) {
  flex: 1;
  height: 6px;
  border-radius: 3px;
}

.skill-charges-text {
  font-size: 11px;
  font-weight: 600;
  color: rgba(var(--ion-color-light-rgb), 0.7);
  white-space: nowrap;
  flex-shrink: 0;
}

.skill-use-btn {
  flex-shrink: 0;
  --padding-start: 0;
  --padding-end: 0;
  width: 36px;
  height: 36px;
}
.skill-use-btn--depleted { opacity: 0.35; }

/* ── FAB ── */
.add-new-button {
  position: fixed;
  bottom: 60px;
  left: 0;
  right: 0;
  width: 100%;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
  padding-bottom: max(8px, env(safe-area-inset-bottom, 0));
}

@media (min-width: 1024px) {
  .add-new-button { bottom: 10px; }
}

/* ── Finesse toggle ── */
.finesse-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.finesse-toggle__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(var(--ion-color-light-rgb), 0.45);
  text-transform: uppercase;
}

.finesse-toggle__switch {
  display: inline-flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
  background: rgba(var(--ion-color-dark-rgb), 0.4);
}

.finesse-opt {
  padding: 2px 9px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(var(--ion-color-light-rgb), 0.4);
  transition: background 0.15s ease, color 0.15s ease;
}

.finesse-opt--active {
  background: rgba(var(--ion-color-primary-rgb), 0.22);
  color: var(--ion-color-primary);
}
</style>
