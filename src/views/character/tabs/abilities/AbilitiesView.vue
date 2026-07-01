<script setup lang="ts">
import SkillUp from "@/views/common/SkillUp.vue";
import AbilityParamUp from "@/views/common/AbilityParamUp.vue";
import axios from "axios";
import {useRoute} from "vue-router";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {computed, onMounted, ref, watch} from "vue";
import {onIonViewDidEnter, IonIcon} from "@ionic/vue";
import {reorderThreeOutline, shieldOutline} from "ionicons/icons";
import {Ability, Character} from "@/components/models/response/Character";
import {useCharacterStore} from "@/stores/CharacterStore";
import {useInventoryStore} from "@/stores/InventoryStore";
import {useDragSort} from "@/composables/useDragSort";

const route = useRoute();
const characterStore = useCharacterStore();
const inventoryStore = useInventoryStore();

const armorStealthDisadvantage = computed(() => {
  const items = inventoryStore.inventory?.items ?? [];
  return items.some(
    inv => inv.inUse && inv.item?.type === 'ARMOR' && inv.item?.stats?.stealthDisadvantage === 'DISADVANTAGE'
  );
});

function effectiveStealthAdvantage(skill: any): number {
  if (armorStealthDisadvantage.value) {
    return skill.advantageValue === 1 ? 0 : -1;
  }
  return skill.advantageValue ?? 0;
}

const abilities = ref<AbilityResponse[]>([]);
let ruleBookAbilityCodeMap: Map<string, AbilityResponse>;
let characterAbilityCodeMap: Map<string, Ability>;
const resultAbilities = ref<Record<string, AbilityDto>>();

const abilitiesDrag = useDragSort<[string, AbilityDto]>({
  key: `abilities_v2_${route.params.characterId}`,
  source: () => {
    if (!resultAbilities.value || !ruleBookAbilityCodeMap) return [];
    return Array.from(ruleBookAbilityCodeMap.keys())
        .filter(code => resultAbilities.value && code in resultAbilities.value)
        .map(code => [code, resultAbilities.value![code]] as [string, AbilityDto]);
  },
  getKey: ([code]) => code,
  defaultOrder: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
});

const emits = defineEmits(["ability-selected", "skill-selected"]);

const selectAbility = (ability: AbilityDto) => {
  emits("ability-selected", ability);
};


const selectSkill = (skill: SkillDto) => {
  emits("skill-selected", skill);
};

const loadAbilitiesData = async () => {
  try {
    const response = await axios.get(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.roomAbilities}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
    abilities.value = response.data;
    ruleBookAbilityCodeMap = buildAbilityCodeMap(abilities.value);
  } catch (error) {
    console.error("Ошибка при получении способностей:", error);
  }

  try {
    characterAbilityCodeMap = buildCharacterAbilityCodeMap(characterStore.character);
    characterAbilityCodeMap = buildCharacterAbilitiesWithNameAndValue(characterAbilityCodeMap);
    resultAbilities.value = Object.fromEntries(characterAbilityCodeMap);
  } catch (error) {
    console.error("Ошибка при получении персонажа:", error);
  }
};

onMounted(loadAbilitiesData);
onIonViewDidEnter(loadAbilitiesData);

watch(() => characterStore.character, (newChar, oldChar) => {
  if (!ruleBookAbilityCodeMap || newChar === oldChar) return;
  characterAbilityCodeMap = buildCharacterAbilityCodeMap(newChar);
  characterAbilityCodeMap = buildCharacterAbilitiesWithNameAndValue(characterAbilityCodeMap);
  resultAbilities.value = Object.fromEntries(characterAbilityCodeMap);
});

function buildAbilityCodeMap(abilities: AbilityResponse[]): Map<string, AbilityResponse> {
  const codeMap = new Map<string, AbilityResponse>();
  abilities.forEach((ability) => {
    codeMap.set(ability.code, ability);
  });
  return codeMap;
}

function buildCharacterAbilityCodeMap(character: Character): Map<string, Ability> {
  if (!character) return new Map();
  const codeMap = new Map<string, Ability>();
  character.abilities.forEach((ability: Ability) => {
    codeMap.set(ability.code, ability);
  });
  return codeMap;
}

function buildCharacterAbilitiesWithNameAndValue(characterAbilityCodeMap: Map<string, Ability>): Map<string, Ability> {
  characterAbilityCodeMap.forEach(enrichCharacterAbility);
  return characterAbilityCodeMap;
}

function enrichCharacterAbility(value: Ability, key: string, map: Map<string, Ability>) {
  const ruleBookAbility = ruleBookAbilityCodeMap.get(value.code);
  if (!ruleBookAbility) return;

  value.name = ruleBookAbility.name;

  if (!ruleBookAbility.skills) return;

  if (characterStore.character) {
    const characterSkillCodes = new Set(characterStore.character.skills.map(skill => skill.code));
    value.skills = ruleBookAbility.skills.map((skill) => ({
      name: skill.name,
      code: skill.code,
      up: characterSkillCodes.has(skill.code),
      bonusValue: characterStore.character?.skills.filter(s => s.code === skill.code)[0]?.bonusValue || 0,
      masteryValue: characterStore.character?.skills.filter(s => s.code === skill.code)[0]?.masteryValue || 0,
      advantageValue: characterStore.character?.skills.filter(s => s.code === skill.code)[0]?.advantageValue || 0
    }));
    value.masteryCheckValue = characterStore.character?.skills.filter(s => s.code === ("CHECK_" + value.code))[0]?.masteryValue || 0;
    value.masterySavingThrowValue = characterStore.character?.skills.filter(s => s.code === ("SAVING_THROW_" + value.code))[0]?.masteryValue || 0;
    value.advantageCheckValue = characterStore.character?.skills.filter(s => s.code === ("CHECK_" + value.code))[0]?.advantageValue || 0;
    value.advantageSavingThrowValue = characterStore.character?.skills.filter(s => s.code === ("SAVING_THROW_" + value.code))[0]?.advantageValue || 0;
  }
}

async function updateMastery(skill: any) {
  try {
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterStore.character.id}${GATEWAY_INTEGRATION_ROUTES.skills}/${skill.code}${GATEWAY_INTEGRATION_ROUTES.mastery}`,
        {
          isMastery: skill.masteryValue > 0,
          masteryValue: skill.masteryValue,
          bonusValue: skill.bonusValue || 0,
          advantageValue: skill.advantageValue || 0
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
  } catch (error) {
    console.error("Ошибка при обновлении мастерства:", error);
  }
}

async function updateMasteryAbilityCheck(ability: AbilityDto) {
  const checkSkill = characterStore.character?.skills.find(s => s.code === `CHECK_${ability.code}`);
  try {
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterStore.character.id}${GATEWAY_INTEGRATION_ROUTES.skills}/CHECK_${ability.code}${GATEWAY_INTEGRATION_ROUTES.mastery}`,
        {
          isMastery: ability.masteryCheckValue >= 1,
          masteryValue: ability.masteryCheckValue,
          bonusValue: checkSkill?.bonusValue ?? 0,
          advantageValue: ability.advantageCheckValue ?? 0
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
  } catch (error) {
    console.error("Ошибка при обновлении мастерства:", error);
  }
}

async function updateMasteryAbilitySavingThrow(ability: AbilityDto) {
  const savingSkill = characterStore.character?.skills.find(s => s.code === `SAVING_THROW_${ability.code}`);
  try {
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterStore.character.id}${GATEWAY_INTEGRATION_ROUTES.skills}/SAVING_THROW_${ability.code}${GATEWAY_INTEGRATION_ROUTES.mastery}`,
        {
          isMastery: ability.masterySavingThrowValue >= 1,
          masteryValue: ability.masterySavingThrowValue,
          bonusValue: savingSkill?.bonusValue ?? 0,
          advantageValue: ability.advantageSavingThrowValue ?? 0
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
  } catch (error) {
    console.error("Ошибка при обновлении мастерства:", error);
  }
}

function changeChecked(skill: any) {
  if (skill.masteryValue == 0) {
    skill.up = true;
    skill.masteryValue = 1;
  } else if (skill.masteryValue == 1) {
    skill.up = true;
    skill.masteryValue = 2;
  } else if (skill.masteryValue == 2) {
    skill.up = false;
    skill.masteryValue = 0;
  }
  updateMastery(skill);
}

function changeAdvantage(skill: any) {
  if (skill.advantageValue === 0 || !skill.advantageValue) {
    skill.advantageValue = 1;
  } else if (skill.advantageValue === 1) {
    skill.advantageValue = -1;
  } else {
    skill.advantageValue = 0;
  }
  updateMastery(skill);
}

function getAdvantageLabel(value: number | undefined) {
  if (value === 1) {
    return "Преимущество";
  }
  if (value === -1) {
    return "Помеха";
  }
  return "Обычный";
}

function getRollModifierClass(value: number | undefined, kind: "skill" | "check" | "save" = "skill") {
  const prefix = kind === "skill" ? "skill-value" : kind === "check" ? "check-value" : "saving-throw-value";
  if (value === 1) {
    return `${prefix}--roll-adv`;
  }
  if (value === -1) {
    return `${prefix}--roll-dis`;
  }
  return `${prefix}--roll-neutral`;
}

function rollModifierAriaLabel(value: number | undefined, modifier: number) {
  return `${getAdvantageLabel(value)}. Модификатор ${modifier}`;
}

function changeCheckedAbilityCheck(ability: AbilityDto) {
  if (ability.masteryCheckValue == 0 || !ability.masteryCheckValue) {
    ability.masteryCheckValue = 1;
  } else if (ability.masteryCheckValue == 1) {
    ability.masteryCheckValue = 2;
  } else if (ability.masteryCheckValue == 2) {
    ability.masteryCheckValue = 0;
  }
  updateMasteryAbilityCheck(ability);
}

function changeAdvantageAbilityCheck(ability: AbilityDto) {
  if (ability.advantageCheckValue === 0 || ability.advantageCheckValue === undefined) {
    ability.advantageCheckValue = 1;
  } else if (ability.advantageCheckValue === 1) {
    ability.advantageCheckValue = -1;
  } else {
    ability.advantageCheckValue = 0;
  }
  updateMasteryAbilityCheck(ability);
}

function changeCheckedAbilitySavingThrow(ability: AbilityDto) {
  if (ability.masterySavingThrowValue == 0 || !ability.masterySavingThrowValue) {
    ability.masterySavingThrowValue = 1;
  } else if (ability.masterySavingThrowValue == 1) {
    ability.masterySavingThrowValue = 2;
  } else if (ability.masterySavingThrowValue == 2) {
    ability.masterySavingThrowValue = 0;
  }
  updateMasteryAbilitySavingThrow(ability);
}

function changeAdvantageAbilitySavingThrow(ability: AbilityDto) {
  if (ability.advantageSavingThrowValue === 0 || ability.advantageSavingThrowValue === undefined) {
    ability.advantageSavingThrowValue = 1;
  } else if (ability.advantageSavingThrowValue === 1) {
    ability.advantageSavingThrowValue = -1;
  } else {
    ability.advantageSavingThrowValue = 0;
  }
  updateMasteryAbilitySavingThrow(ability);
}

function calculateSkillValue(value: any, skill: any) {
  let result = Math.floor((value - 10) / 2);
  if (skill.masteryValue == 1 && characterStore.character?.proficiencyBonus) {
    result += characterStore.character.proficiencyBonus;
  }
  if (skill.masteryValue > 1 && characterStore.character?.proficiencyBonus) {
    result += skill.masteryValue * characterStore.character.proficiencyBonus;
  }
  if (skill.bonusValue) {
    result += skill.bonusValue;
  }
  return result;
}

function calculateSavingThrow(value: any, ability: AbilityDto) {
  let result = Math.floor((value - 10) / 2);
  if (ability.masterySavingThrowValue == 1 && characterStore.character?.proficiencyBonus) {
    result += characterStore.character.proficiencyBonus;
  }
  if (ability.masterySavingThrowValue > 1 && characterStore.character?.proficiencyBonus) {
    result += ability.masterySavingThrowValue * characterStore.character.proficiencyBonus;
  }
  return result;
}

function calculateCheckValue(value: any, ability: AbilityDto) {
  let result = Math.floor((value - 10) / 2);
  if (ability.masteryCheckValue == 1 && characterStore.character?.proficiencyBonus) {
    result += characterStore.character.proficiencyBonus;
  }
  if (ability.masteryCheckValue > 1 && characterStore.character?.proficiencyBonus) {
    result += ability.masteryCheckValue * characterStore.character.proficiencyBonus;
  }
  return result;
}

function abilityModifier(ability: AbilityDto): number {
  const score = (ability.value ?? 0) + (ability.bonusValue ?? 0);
  return Math.floor((score - 10) / 2);
}

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}
</script>


<template>
  <div class="abilities" v-if="resultAbilities">
    <div class="prof-banner">
      <span class="prof-banner__label">Бонус мастерства</span>
      <span class="prof-banner__value">{{ formatModifier(characterStore.character.proficiencyBonus) }}</span>
    </div>

    <div class="abilities-grid">
    <div class="ability-card"
         v-for="(ability, idx) in abilitiesDrag.ordered" :key="ability[0]"
         :data-drag-list="abilitiesDrag.listId" :data-drag-index="idx"
         :class="{ 'is-dragging': abilitiesDrag.dragFromIndex === idx, 'is-drag-over': abilitiesDrag.dragOverIndex === idx && abilitiesDrag.dragFromIndex !== idx }">
      <div class="ability-card__drag-handle"
           @pointerdown="abilitiesDrag.onHandlePointerDown($event, idx)"
           @pointermove="abilitiesDrag.onHandlePointerMove($event)"
           @pointerup="abilitiesDrag.onHandlePointerUp($event)"
           @pointercancel="abilitiesDrag.onHandlePointerCancel($event)">
        <ion-icon :icon="reorderThreeOutline"/>
      </div>
      <button type="button" class="ability-card__head" @click="selectAbility(ability[1])">
        <span class="ability-card__name">{{ ability[1].name }}</span>
        <span class="ability-card__mod">{{ formatModifier(abilityModifier(ability[1])) }}</span>
        <span class="ability-card__score">{{ ability[1].value + ability[1].bonusValue }}</span>
      </button>

      <div class="ability-card__rolls">
        <div
            class="roll-row roll-row--check"
            :class="{
              'roll-row--adv': ability[1].advantageCheckValue === 1,
              'roll-row--dis': ability[1].advantageCheckValue === -1
            }"
        >
          <span class="roll-row__toggle">
            <AbilityParamUp :checked="ability[1].masteryCheckValue > 0"
                            :doubleChecked="ability[1].masteryCheckValue > 1"
                            @click="changeCheckedAbilityCheck(ability[1])"/>
          </span>
          <span class="roll-row__label">Проверка</span>
          <button
              type="button"
              class="roll-pill"
              :class="getRollModifierClass(ability[1].advantageCheckValue, 'check')"
              :title="`${getAdvantageLabel(ability[1].advantageCheckValue)} — нажмите, чтобы сменить`"
              :aria-label="rollModifierAriaLabel(ability[1].advantageCheckValue, calculateCheckValue(ability[1].value + ability[1].bonusValue, ability[1]))"
              @click.stop="changeAdvantageAbilityCheck(ability[1])"
          >
            {{ formatModifier(calculateCheckValue(ability[1].value + ability[1].bonusValue, ability[1])) }}
          </button>
        </div>
        <div
            class="roll-row roll-row--save"
            :class="{
              'roll-row--adv': ability[1].advantageSavingThrowValue === 1,
              'roll-row--dis': ability[1].advantageSavingThrowValue === -1
            }"
        >
          <span class="roll-row__toggle">
            <AbilityParamUp :checked="ability[1].masterySavingThrowValue > 0"
                            :doubleChecked="ability[1].masterySavingThrowValue > 1"
                            @click="changeCheckedAbilitySavingThrow(ability[1])"/>
          </span>
          <span class="roll-row__label">Спасбросок</span>
          <button
              type="button"
              class="roll-pill"
              :class="getRollModifierClass(ability[1].advantageSavingThrowValue, 'save')"
              :title="`${getAdvantageLabel(ability[1].advantageSavingThrowValue)} — нажмите, чтобы сменить`"
              :aria-label="rollModifierAriaLabel(ability[1].advantageSavingThrowValue, calculateSavingThrow(ability[1].value + ability[1].bonusValue, ability[1]))"
              @click.stop="changeAdvantageAbilitySavingThrow(ability[1])"
          >
            {{ formatModifier(calculateSavingThrow(ability[1].value + ability[1].bonusValue, ability[1])) }}
          </button>
        </div>
      </div>

      <div class="ability-card__skills" v-if="ability[1].skills && ability[1].skills.length">
        <div
            class="skill-row"
            :class="{
              'skill-row--adv': skill.code === 'STEA' ? (!armorStealthDisadvantage && skill.advantageValue === 1) : skill.advantageValue === 1,
              'skill-row--dis': skill.code === 'STEA' ? effectiveStealthAdvantage(skill) === -1 : skill.advantageValue === -1,
              'skill-row--armor-dis': skill.code === 'STEA' && armorStealthDisadvantage && effectiveStealthAdvantage(skill) === -1
            }"
            v-for="(skill, index) in ability[1].skills"
            :key="index"
        >
          <span class="skill-row__toggle">
            <SkillUp :checked="skill.masteryValue > 0" :doubleChecked="skill.masteryValue > 1"
                     @click="changeChecked(skill)"/>
          </span>
          <span class="skill-row__name" @click="selectSkill(skill)">{{ skill.name }}</span>
          <ion-icon
              v-if="skill.code === 'STEA' && armorStealthDisadvantage"
              :icon="shieldOutline"
              class="skill-row__armor-icon"
              title="Помеха к скрытности от доспеха"
          />
          <button
              type="button"
              class="roll-pill roll-pill--sm"
              :class="skill.code === 'STEA' ? getRollModifierClass(effectiveStealthAdvantage(skill)) : getRollModifierClass(skill.advantageValue)"
              :title="`${getAdvantageLabel(skill.code === 'STEA' ? effectiveStealthAdvantage(skill) : skill.advantageValue)} — нажмите, чтобы сменить`"
              :aria-label="rollModifierAriaLabel(skill.code === 'STEA' ? effectiveStealthAdvantage(skill) : skill.advantageValue, calculateSkillValue(ability[1].value + ability[1].bonusValue, skill))"
              @click.stop="changeAdvantage(skill)"
          >
            {{ formatModifier(calculateSkillValue(ability[1].value + ability[1].bonusValue, skill)) }}
          </button>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
.abilities {
  width: 100%;
}

.abilities-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 640px) {
  .abilities-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1100px) {
  .abilities-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Proficiency banner */
.prof-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.28);
  background: linear-gradient(150deg, rgba(var(--ion-color-primary-rgb), 0.14) 0%, rgba(var(--ion-color-medium-rgb), 0.6) 100%);
}

.prof-banner__label {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.78);
}

.prof-banner__value {
  font-size: 20px;
  font-weight: 800;
  color: var(--ion-color-primary);
  font-variant-numeric: tabular-nums;
}

/* Ability card */
.ability-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.92) 100%);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.15s ease;
  user-select: none;
  -webkit-user-select: none;
}

.ability-card:hover {
  border-color: rgba(var(--ion-color-primary-rgb), 0.35);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.38);
}

.ability-card.is-dragging { opacity: 0.35; box-shadow: none; }
.ability-card.is-drag-over { box-shadow: 0 0 0 2px var(--ion-color-primary), 0 12px 28px rgba(0,0,0,.4); }

.ability-card__drag-handle {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 20px;
  color: rgba(var(--ion-color-light-rgb), 0.3);
  cursor: grab;
  touch-action: none;
  margin-bottom: -4px;
  transition: color 0.15s ease;
}
.ability-card__drag-handle:hover { color: rgba(var(--ion-color-light-rgb), 0.65); }

.ability-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  border-radius: 14px;
  background: rgba(var(--ion-color-dark-rgb), 0.45);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, transform 0.15s ease;
}

.ability-card__head:hover {
  border-color: rgba(var(--ion-color-primary-rgb), 0.3);
}

.ability-card__head:active {
  transform: scale(0.995);
}

.ability-card__name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.72);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ability-card__mod {
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  color: var(--ion-color-light);
  font-variant-numeric: tabular-nums;
}

.ability-card__score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 26px;
  padding: 0 8px;
  border-radius: 9px;
  background: rgba(var(--ion-color-primary-rgb), 0.16);
  color: var(--ion-color-primary);
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Rolls (check / saving throw) — grouped block with divider */
.ability-card__rolls {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(var(--ion-color-dark-rgb), 0.35);
}

.roll-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px 9px 12px;
  border-left: 3px solid transparent;
  border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.07);
  transition: background 0.15s ease;
}

.roll-row:last-child {
  border-bottom: none;
}

.roll-row--check {
  border-left-color: rgba(var(--ion-color-primary-rgb), 0.85);
}

.roll-row--save {
  border-left-color: rgba(var(--ion-color-tertiary-rgb), 0.9);
}

.roll-row--adv {
  background: rgba(var(--ion-color-success-rgb), 0.12);
}

.roll-row--dis {
  background: rgba(var(--ion-color-danger-rgb), 0.12);
}

.roll-row__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.roll-row__label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: rgba(var(--ion-color-light-rgb), 0.82);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Skills */
.ability-card__skills {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skill-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(var(--ion-color-light-rgb), 0.04);
  border: 1px solid transparent;
}

.skill-row--adv {
  border-color: rgba(var(--ion-color-success-rgb), 0.45);
}

.skill-row--dis {
  border-color: rgba(var(--ion-color-danger-rgb), 0.45);
}

.skill-row--armor-dis {
  border-color: rgba(var(--ion-color-danger-rgb), 0.6);
  background: rgba(var(--ion-color-danger-rgb), 0.07);
}

.skill-row__armor-icon {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--ion-color-danger);
  opacity: 0.9;
}

.skill-row__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.skill-row__name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--ion-color-light);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Roll value pills (shared) */
.roll-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 32px;
  height: 28px;
  padding: 0 8px;
  border: none;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  appearance: none;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease, color 0.12s ease;
}

.roll-pill:active {
  transform: scale(0.94);
}

.roll-pill--sm {
  min-width: 30px;
  height: 26px;
  font-size: 13px;
}

.roll-pill.skill-value--roll-neutral,
.roll-pill.check-value--roll-neutral,
.roll-pill.saving-throw-value--roll-neutral {
  color: var(--ion-color-primary-contrast);
  background: var(--ion-color-primary);
  box-shadow: 0 0 0 1px rgba(var(--ion-color-primary-rgb), 0.22);
}

.roll-pill.skill-value--roll-adv,
.roll-pill.check-value--roll-adv,
.roll-pill.saving-throw-value--roll-adv {
  color: var(--ion-color-success-contrast);
  background: var(--ion-color-success-shade);
  box-shadow:
      0 0 0 1px rgba(var(--ion-color-success-rgb), 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.roll-pill.skill-value--roll-dis,
.roll-pill.check-value--roll-dis,
.roll-pill.saving-throw-value--roll-dis {
  color: var(--ion-color-danger-contrast);
  background: var(--ion-color-danger-shade);
  box-shadow:
      0 0 0 1px rgba(var(--ion-color-danger-rgb), 0.32),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

ion-content {
  --padding-start: 0;
  --padding-end: 0;
}
</style>
