<script setup lang="ts">
import SkillUp from "@/views/common/SkillUp.vue";
import axios from "axios";
import {useRoute} from "vue-router";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {onMounted, ref} from "vue";
import {Ability, Character} from "@/components/models/response/Character";
import {useCharacterStore} from "@/stores/CharacterStore";

const route = useRoute();
const characterStore = useCharacterStore();

const abilities = ref<AbilityResponse[]>([]);
let ruleBookAbilityCodeMap: Map<string, AbilityResponse>;
let characterAbilityCodeMap: Map<string, Ability>;
const resultAbilities = ref<Record<string, AbilityDto>>();

const emits = defineEmits(["ability-selected"]);

const selectAbility = (ability: AbilityDto) => {
  emits("ability-selected", ability);
};

onMounted(async () => {
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
    }));
  }
}

async function updateMastery(skill: any) {
  try {
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterStore.character.id}${GATEWAY_INTEGRATION_ROUTES.skills}/${skill.code}${GATEWAY_INTEGRATION_ROUTES.mastery}`,
        {isMastery: skill.up},
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
  skill.up = !skill.up;
  updateMastery(skill);
}

function calculateSkillValue(value: any, skill: any) {
  let result = Math.floor((value - 10) / 2);
  if (skill.up && characterStore.character?.proficiencyBonus) {
    result += characterStore.character.proficiencyBonus;
  }
  return result;
}

function calculateSavingThrow(value: any) {
  return Math.floor((value - 10) / 2);
}

function calculateCheckValue(value: any) {
  return Math.floor((value - 10) / 2);
}
</script>


<template>
  <!--  <ion-content class="ion-padding" color="dark">-->
  <div class="abilities" v-if="resultAbilities">
    <div
        class="ability-item"
        v-for="(ability, key) in Object.entries(resultAbilities)"
        :key="key">
      <div class="ability-header" @click="selectAbility(ability[1])">
        <div class="ability">
          <div class="ability-name">{{ ability[1].name }}</div>
          <div class="ability-value">{{ ability[1].value + ability[1].bonusValue }}</div>
        </div>
        <div class="ability-side-block">
          <div class="check">
            <div class="check-name">Проверка</div>
            <div class="check-value">{{ calculateCheckValue(ability[1].value + ability[1].bonusValue) }}</div>
          </div>
          <div class="saving-throw">
            <div class="saving-throw-name">Спасбросок</div>
            <div class="saving-throw-value">{{ calculateSavingThrow(ability[1].value + ability[1].bonusValue) }}</div>
          </div>
        </div>
      </div>
      <div class="skills" v-if="ability[1].skills && ability[1].skills.length">
        <div
            class="skill-item"
            v-for="(skill, index) in ability[1].skills"
            :key="index"
        >
          <div class="skill-start-block">
            <div class="skill-up">
              <SkillUp :checked="skill.up" @click="changeChecked(skill)"/>
            </div>
            <div class="skill-name">{{ skill.name }}</div>
          </div>
          <div class="skill-value">{{ calculateSkillValue(ability[1].value + ability[1].bonusValue, skill) }}</div>
        </div>
      </div>
    </div>
  </div>
  <!--  </ion-content>-->
</template>

<style scoped>
.abilities {
  width: 100%;
}

.ability-item {
  background: var(--ion-color-medium);
  border-radius: 15px;
  padding: 10px;
  margin-top: 10px;
}

.ability-header {
  display: flex;
  flex-direction: row;
}

.ability {
  background: var(--ion-color-medium-tint);
  border-radius: 15px;
  width: 70%;
  height: 50px;
  padding-left: 15px;
  padding-right: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
}

.ability-side-block {
  padding-left: 6px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 30%;
}

.check {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  background: var(--ion-color-medium-tint);
  border-radius: 10px;
  font-size: 11px;
  height: 20px;
  padding-left: 10px;
  padding-right: 3px;
}

.check-value {
  font-size: 11px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border-radius: 50%;
  height: 15px;
  width: 15px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.saving-throw {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  background: var(--ion-color-medium-tint);
  border-radius: 10px;
  font-size: 11px;
  height: 20px;
  padding-left: 10px;
  padding-right: 3px;
}

.saving-throw-value {
  font-size: 11px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border-radius: 50%;
  height: 15px;
  width: 15px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.skill-item {
  padding-left: 4px;
  padding-right: 4px;
  background: var(--ion-color-medium-tint);
  border-radius: 20px;
  margin-top: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 27px;
  justify-content: space-between;
}

.skill-start-block {
  display: flex;
  justify-content: start;
}

.skill-name {
  padding-left: 4px;
}

.skill-value {
  font-size: 11px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border-radius: 50%;
  height: 20px;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-up {
  width: 20px;
  height: 20px;
}

ion-content {
  --padding-start: 0px;
  --padding-end: 0px;
}


</style>
