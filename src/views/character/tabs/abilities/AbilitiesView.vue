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
      masteryValue: characterStore.character?.skills.filter(s => s.code === skill.code)[0]?.masteryValue || 0
    }));
    value.masteryCheckValue = characterStore.character?.skills.filter(s => s.code === ("CHECK_" + value.code))[0]?.masteryValue || 0;
    value.masterySavingThrowValue = characterStore.character?.skills.filter(s => s.code === ("SAVING_THROW_" + value.code))[0]?.masteryValue || 0;
  }
}

async function updateMastery(skill: any) {
  try {
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterStore.character.id}${GATEWAY_INTEGRATION_ROUTES.skills}/${skill.code}${GATEWAY_INTEGRATION_ROUTES.mastery}`,
        {isMastery: skill.up, masteryValue: skill.masteryValue},
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
  try {
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterStore.character.id}${GATEWAY_INTEGRATION_ROUTES.skills}/CHECK_${ability.code}${GATEWAY_INTEGRATION_ROUTES.mastery}`,
        {isMastery: ability.masteryCheckValue >= 1, masteryValue: ability.masteryCheckValue},
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
  try {
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterStore.character.id}${GATEWAY_INTEGRATION_ROUTES.skills}/SAVING_THROW_${ability.code}${GATEWAY_INTEGRATION_ROUTES.mastery}`,
        {isMastery: ability.masterySavingThrowValue >= 1, masteryValue: ability.masterySavingThrowValue},
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
    <div class="ability-item">
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
          <div class="check">
            <div class="skill-up">
              <AbilityParamUp :checked="ability[1].masteryCheckValue > 0"
                              :doubleChecked="ability[1].masteryCheckValue > 1"
                              @click="changeCheckedAbilityCheck(ability[1])"/>
            </div>
            <div class="check-name">Проверка</div>
            <div class="check-value">{{ calculateCheckValue(ability[1].value + ability[1].bonusValue, ability[1]) }}</div>
          </div>
          <div class="saving-throw">
            <div class="skill-up">
              <AbilityParamUp :checked="ability[1].masterySavingThrowValue > 0"
                              :doubleChecked="ability[1].masterySavingThrowValue > 1"
                              @click="changeCheckedAbilitySavingThrow(ability[1])"/>
            </div>
            <div class="saving-throw-name">Спасбросок</div>
            <div class="saving-throw-value">{{ calculateSavingThrow(ability[1].value + ability[1].bonusValue, ability[1]) }}</div>
          </div>
        </div>
      </div>
      <div class="skills" v-if="ability[1].skills && ability[1].skills.length">
        <div class="skill-item" v-for="(skill, index) in ability[1].skills" :key="index">
          <div class="skill-start-block">
            <div class="skill-up">
              <SkillUp :checked="skill.masteryValue > 0" :doubleChecked="skill.masteryValue > 1"
                       @click="changeChecked(skill)"/>
            </div>
            <div class="skill-name" @click="selectSkill(skill)">{{ skill.name }}</div>
          </div>
          <div class="skill-value">{{ calculateSkillValue(ability[1].value + ability[1].bonusValue, skill) }}</div>
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
}

.skill-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 27px;
  margin-top: 10px;
  padding-left: 4px;
  padding-right: 4px;
  background: var(--ion-color-medium-tint);
  border-radius: 20px;
}

.skill-item--proficiency {
  margin-top: 0;
}

.skill-start-block {
  display: flex;
  justify-content: start;
}

.skill-name {
  padding-left: 4px;
}

.skill-value {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 11px;
  color: var(--ion-color-primary-contrast);
  background: var(--ion-color-primary);
  border-radius: 50%;
}

.skill-up {
  display: flex;
  align-items: center;
  width: 20px;
  height: 20px;
}

ion-content {
  --padding-start: 0;
  --padding-end: 0;
}
</style>
