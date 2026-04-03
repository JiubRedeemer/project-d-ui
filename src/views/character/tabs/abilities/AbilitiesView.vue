<script setup lang="ts">
import SkillUp from "@/views/common/SkillUp.vue";
import AbilityParamUp from "@/views/common/AbilityParamUp.vue";
import axios from "axios";
import {useRoute} from "vue-router";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {computed, onMounted, ref} from "vue";
import {onIonViewDidEnter} from "@ionic/vue";
import {Ability, Character} from "@/components/models/response/Character";
import {useCharacterStore} from "@/stores/CharacterStore";

const route = useRoute();
const characterStore = useCharacterStore();

const abilities = ref<AbilityResponse[]>([]);
let ruleBookAbilityCodeMap: Map<string, AbilityResponse>;
let characterAbilityCodeMap: Map<string, Ability>;
const resultAbilities = ref<Record<string, AbilityDto>>();

const orderedAbilities = computed(() => {
  if (!resultAbilities.value || !ruleBookAbilityCodeMap) return [];
  return Array.from(ruleBookAbilityCodeMap.keys())
      .filter((code) => resultAbilities.value && code in resultAbilities.value)
      .map((code) => [code, resultAbilities.value![code]] as [string, AbilityDto]);
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
</script>


<template>
  <div class="abilities" v-if="resultAbilities">
    <div class="ability-item ability-item--proficiency">
      <div class="skill-item skill-item--proficiency">
        <div class="skill-name">Бонус мастерства</div>
        <div class="skill-value">{{ characterStore.character.proficiencyBonus }}</div>
      </div>
    </div>
    <div class="ability-item" v-for="(ability, key) in orderedAbilities" :key="key">
      <div class="ability-header">
        <div class="ability" @click="selectAbility(ability[1])">
          <div class="ability-name">{{ ability[1].name }}</div>
          <div class="ability-value">{{ ability[1].value + ability[1].bonusValue }}</div>
        </div>
        <div class="ability-side-block">
          <div
              class="check"
              :class="{
                'skill-item--roll-adv': ability[1].advantageCheckValue === 1,
                'skill-item--roll-dis': ability[1].advantageCheckValue === -1
              }"
          >
            <div class="skill-up">
              <AbilityParamUp :checked="ability[1].masteryCheckValue > 0"
                              :doubleChecked="ability[1].masteryCheckValue > 1"
                              @click="changeCheckedAbilityCheck(ability[1])"/>
            </div>
            <div class="check-name">Проверка</div>
            <button
                type="button"
                class="check-value check-value--roll"
                :class="getRollModifierClass(ability[1].advantageCheckValue, 'check')"
                :title="`${getAdvantageLabel(ability[1].advantageCheckValue)} — нажмите, чтобы сменить`"
                :aria-label="rollModifierAriaLabel(ability[1].advantageCheckValue, calculateCheckValue(ability[1].value + ability[1].bonusValue, ability[1]))"
                @click.stop="changeAdvantageAbilityCheck(ability[1])"
            >
              {{ calculateCheckValue(ability[1].value + ability[1].bonusValue, ability[1]) }}
            </button>
          </div>
          <div
              class="saving-throw"
              :class="{
                'skill-item--roll-adv': ability[1].advantageSavingThrowValue === 1,
                'skill-item--roll-dis': ability[1].advantageSavingThrowValue === -1
              }"
          >
            <div class="skill-up">
              <AbilityParamUp :checked="ability[1].masterySavingThrowValue > 0"
                              :doubleChecked="ability[1].masterySavingThrowValue > 1"
                              @click="changeCheckedAbilitySavingThrow(ability[1])"/>
            </div>
            <div class="saving-throw-name">Спасбросок</div>
            <button
                type="button"
                class="saving-throw-value saving-throw-value--roll"
                :class="getRollModifierClass(ability[1].advantageSavingThrowValue, 'save')"
                :title="`${getAdvantageLabel(ability[1].advantageSavingThrowValue)} — нажмите, чтобы сменить`"
                :aria-label="rollModifierAriaLabel(ability[1].advantageSavingThrowValue, calculateSavingThrow(ability[1].value + ability[1].bonusValue, ability[1]))"
                @click.stop="changeAdvantageAbilitySavingThrow(ability[1])"
            >
              {{ calculateSavingThrow(ability[1].value + ability[1].bonusValue, ability[1]) }}
            </button>
          </div>
        </div>
      </div>
      <div class="skills" v-if="ability[1].skills && ability[1].skills.length">
        <div
            class="skill-item"
            :class="{
              'skill-item--roll-adv': skill.advantageValue === 1,
              'skill-item--roll-dis': skill.advantageValue === -1
            }"
            v-for="(skill, index) in ability[1].skills"
            :key="index"
        >
          <div class="skill-start-block">
            <div class="skill-up">
              <SkillUp :checked="skill.masteryValue > 0" :doubleChecked="skill.masteryValue > 1"
                       @click="changeChecked(skill)"/>
            </div>
            <div class="skill-name" @click="selectSkill(skill)">{{ skill.name }}</div>
          </div>
          <button
              type="button"
              class="skill-value skill-value--roll"
              :class="getRollModifierClass(skill.advantageValue)"
              :title="`${getAdvantageLabel(skill.advantageValue)} — нажмите, чтобы сменить`"
              :aria-label="rollModifierAriaLabel(skill.advantageValue, calculateSkillValue(ability[1].value + ability[1].bonusValue, skill))"
              @click.stop="changeAdvantage(skill)"
          >
            {{ calculateSkillValue(ability[1].value + ability[1].bonusValue, skill) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.abilities {
  width: 100%;
}

.ability-item {
  margin-top: 10px;
  padding: 10px;
  background: var(--ion-color-medium);
  border-radius: 15px;
}

.ability-header {
  display: flex;
  flex-direction: row;
}

.ability {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 70%;
  height: 50px;
  padding-left: 15px;
  padding-right: 15px;
  background: var(--ion-color-medium-tint);
  border-radius: 15px;
}

.ability-side-block {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 30%;
  padding-left: 6px;
}

.check,
.saving-throw {
  display: flex;
  align-items: center;
  height: 22px;
  padding-left: 2px;
  font-size: 11px;
  background: var(--ion-color-medium-tint);
  border-radius: 10px;
}

.check-name,
.saving-throw-name {
  flex: 1;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.check-value,
.saving-throw-value {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: 16px;
  width: 16px;
  min-width: 16px;
  font-size: 11px;
  color: var(--ion-color-primary-contrast);
  background: var(--ion-color-primary);
  border-radius: 50%;
  box-sizing: border-box;
}

.check-value--roll,
.saving-throw-value--roll {
  margin: 0;
  padding: 0;
  border: none;
  font: inherit;
  line-height: 1;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  appearance: none;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease, color 0.12s ease;
}

.check-value--roll:active,
.saving-throw-value--roll:active {
  transform: scale(0.94);
}

.skill-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 27px;
  margin-top: 10px;
  padding: 2px 4px;
  background: var(--ion-color-medium-tint);
  border-radius: 20px;
}

.skill-item--roll-adv {
  border-right: 2px solid var(--ion-color-success-shade);
}

.skill-item--roll-dis {
  border-right: 2px solid var(--ion-color-danger-shade);
}

.skill-item--proficiency {
  margin-top: 0;
}

.skill-start-block {
  display: flex;
  justify-content: start;
}

.skill-name {
  scrollbar-width: none;
  padding-left: 4px;
}

.skill-value {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  color: var(--ion-color-primary-contrast);
  background: var(--ion-color-primary);
  border-radius: 50%;
}

.skill-value--roll {
  margin: 0;
  padding: 0;
  font: inherit;
  line-height: 1;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease, color 0.12s ease;
}

.skill-value--roll:active {
  transform: scale(0.94);
}

.skill-value--roll-neutral,
.check-value--roll-neutral,
.saving-throw-value--roll-neutral {
  color: var(--ion-color-primary-contrast);
  background: var(--ion-color-primary);
  box-shadow: 0 0 0 1px rgba(var(--ion-color-primary-rgb), 0.22);
  font-size: 12px;
}

.skill-value--roll-adv,
.check-value--roll-adv,
.saving-throw-value--roll-adv {
  color: var(--ion-color-success-contrast);
  background: var(--ion-color-success-shade);
  box-shadow:
      0 0 0 1px rgba(var(--ion-color-success-rgb), 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
  font-size: 12px;
}

.skill-value--roll-dis,
.check-value--roll-dis,
.saving-throw-value--roll-dis {
  color: var(--ion-color-danger-contrast);
  background: var(--ion-color-danger-shade);
  box-shadow:
      0 0 0 1px rgba(var(--ion-color-danger-rgb), 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  font-size: 12px;
}

.skill-up {
  display: flex;
  align-items: center;
  width: 18px;
  height: 18px;
}

ion-content {
  --padding-start: 0;
  --padding-end: 0;
}

@media (min-width: 1024px) {
  .abilities {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    margin-top: -8px;
  }

  .ability-item {
    margin-top: 0;
    padding: 14px;
    border-radius: 16px;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  }

  .ability-item--proficiency {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--ion-color-medium-tint) 78%, transparent);
  }

  .ability-item--proficiency .skill-item--proficiency {
    width: 100%;
    margin-top: 0;
    min-height: 28px;
    height: 28px;
    padding: 0 8px;
    border-radius: 999px;
    background: transparent;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.18);
  }

  .ability-item--proficiency .skill-name {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .ability-item--proficiency .skill-value {
    width: 22px;
    height: 22px;
    font-size: 12px;
  }

  .ability-header {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) minmax(260px, 360px);
    gap: 10px;
    align-items: stretch;
  }

  .ability {
    width: 100%;
    height: auto;
    min-height: 54px;
    padding: 10px 16px;
  }

  .ability-name {
    font-size: 16px;
    font-weight: 600;
  }

  .ability-value {
    font-size: 18px;
    font-weight: 700;
  }

  .ability-side-block {
    width: 100%;
    padding-left: 0;
    gap: 8px;
  }

  .check,
  .saving-throw {
    height: auto;
    min-height: 24px;
    padding: 6px 8px;
    font-size: 13px;
  }

  .check-value,
  .saving-throw-value {
    width: 22px;
    min-width: 22px;
    height: 22px;
    font-size: 12px;
  }

  .skills {
    margin-top: 10px;
    display: grid;
    grid-template-columns: repeat(2, minmax(240px, 1fr));
    gap: 8px 10px;
  }

  .skill-item {
    margin-top: 0;
    height: auto;
    min-height: 30px;
    padding: 4px 8px;
    border-radius: 14px;
  }

  .skill-name {
    scrollbar-width: none;
    padding-left: 8px;
    font-size: 14px;
  }

  .skill-value {
    width: 22px;
    height: 22px;
    font-size: 12px;
  }

  .skill-up {
    width: 20px;
    height: 20px;
  }
}

@media (min-width: 1400px) {
  .abilities {
    grid-template-columns: repeat(2, minmax(420px, 1fr));
  }
}
</style>
