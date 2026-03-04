<template>
  <div>
    <div class="wrapper">
      <div class="ability-header">
        <ion-chip class="race-modifiers" v-for="(raceModifier, index) in getAbilityRaceModifiers()" :key="index">
          <ion-icon :icon="arrowUp" color="success"></ion-icon>
          <ion-label>{{
              raceModifier.name + " " + (raceModifier.value > 0 ? '+' : '') + raceModifier.value
            }}
          </ion-label>
        </ion-chip>
        <ion-chip class="coins">
          <ion-icon :icon="invertModeOutline" color="warning"></ion-icon>
          <ion-label>{{ totalCoins }}</ion-label>
        </ion-chip>
      </div>
      <!-- D&D 2024: background ability modifiers (+2/+1 or +1/+1/+1) -->
      <div v-if="hasBackgroundModifiers" class="background-modifiers-block">
        <p class="background-modifiers-title">Предыстория (D&D 2024)</p>
        <p class="background-modifiers-hint">+2 к одной и +1 к другой <strong>или</strong> +1 к трём разным</p>
        <ion-segment :value="backgroundBonusMode">
          <ion-segment-button value="2+1" @click="applyBackgroundMode('2+1')">
            <ion-label>+2 и +1</ion-label>
          </ion-segment-button>
          <ion-segment-button value="1+1+1" @click="applyBackgroundMode('1+1+1')">
            <ion-label>+1, +1, +1</ion-label>
          </ion-segment-button>
        </ion-segment>
        <div class="background-slots">
          <template v-if="backgroundBonusMode === '2+1'">
            <ion-chip
                v-for="slot in ['+2', '+1']"
                :key="slot"
                :color="getBackgroundSlotCode(slot) ? 'primary' : 'secondary'"
                @click="getBackgroundSlotCode(slot) && clearBackgroundSlot(slot)"
            >
              <ion-label>{{ slot }}: {{ getBackgroundSlotName(slot) || 'Выберите' }}</ion-label>
            </ion-chip>
          </template>
          <template v-else>
            <ion-chip
                v-for="(code, idx) in backgroundPlus1x3"
                :key="`${code}-${idx}`"
                color="primary"
            >
              <ion-label>+1: {{ getAbilityName(code) }}</ion-label>
            </ion-chip>
          </template>
        </div>
      </div>
      <div class="ability-list">
        <ion-list color="dark">
          <ion-item color="dark" v-for="(ability, index) in abilities" :key="index">
            <div @click="onClickAbility(ability.code)" class="ability-score-round"
                 :class="{ highlighted: isAbilityHighlighted(ability.code), 'background-eligible': isAllowedForBackground(ability.code) }"
                 slot="start">
              <span class="ability-score-value">{{
                  ability.defaultValue + ability.modifierValue + ability.byCoinsValue
                }}</span>
            </div>
            <div class="ability-description">
              <ion-label slot="start">{{ ability.name }}</ion-label>
              <ion-note slot="start">Модификатор</ion-note>
            </div>
            <div class="ability-buttons">
              <ion-button shape="round" size="default" fill="clear" @click="abilityModify(ability.code, -1)">
                <ion-icon slot="icon-only" :icon="removeOutline" color="light"></ion-icon>
              </ion-button>
              <ion-button shape="round" size="default" fill="clear" @click="abilityModify(ability.code, 1)">
                <ion-icon slot="icon-only" :icon="addOutline" color="light"></ion-icon>
              </ion-button>
            </div>
          </ion-item>
        </ion-list>
      </div>
    </div>
  </div>
  <ion-fab slot="fixed" vertical="bottom" horizontal="end" @click="onChooseAbilities(abilities)">
    <ion-fab-button color="primary">
      <ion-icon :icon="arrowForwardOutline" color="dark"></ion-icon>
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonChip,
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSegment,
  IonSegmentButton,
} from "@ionic/vue";
import {computed, onMounted, ref, watch} from "vue";
import {addOutline, arrowForwardOutline, arrowUp, invertModeOutline, removeOutline} from "ionicons/icons";
import axios from "axios";
import {useRoute} from "vue-router";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

const route = useRoute();

const props = defineProps({
  characterData: Object,
  currentStep: Object,
});

const abilities = ref<AbilityResponse[]>([]);
const totalCoins = ref(27);
let onChooseCount = 0;
let selected: string[] = [];

// D&D 2024: background ability modifiers — +2/+1 to two abilities or +1/+1/+1 to three
const backgroundBonusMode = ref<"2+1" | "1+1+1">("2+1");
const backgroundPlus2 = ref<string | null>(null);
const backgroundPlus1 = ref<string | null>(null);
const backgroundPlus1x3 = ref<string[]>([]);

const backgroundStats = computed(() => {
  const bg = props.characterData?.background as { stats?: { abilityModifiers?: string[] } } | undefined;
  return bg?.stats;
});
const allowedBackgroundCodes = computed(() => {
  const codes = backgroundStats.value?.abilityModifiers;
  if (!Array.isArray(codes) || codes.length === 0) return [];
  return codes.filter((code: string) => abilities.value.some((a) => a.code === code));
});
const hasBackgroundModifiers = computed(() => allowedBackgroundCodes.value.length > 0);
const abilityUpgradeCostTable: { [key: number]: number } = {
  0: 1,
  1: 1,
  2: 1,
  3: 1,
  4: 1,
  5: 2,
  6: 2,
};
const MINIMAL_ABILITY_VALUE = 8;
const MAX_COINS_VALUE = 27;

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

    abilities.value = response.data.map((ability: AbilityResponse) => ({
      ...ability,
      defaultValue: MINIMAL_ABILITY_VALUE // Начальное значение
    }));

    calculateAbilityValues(); // Вычисляем итоговые значения способностей
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
});

// Функция для вычисления значений способностей
function calculateAbilityValues() {
  const raceModifiers = getAbilityRaceModifiers();
  totalCoins.value = MAX_COINS_VALUE;
  abilities.value = abilities.value.map(ability => {
    const modifier = raceModifiers.find((mod: AbilityModifier) => mod.code === ability.code || mod.code === "ALL");
    const modifierValue = modifier ? modifier.value : 0;
    const backgroundMod = getBackgroundModifierForAbility(ability.code);

    return {
      ...ability,
      defaultValue: MINIMAL_ABILITY_VALUE,
      modifierValue: modifierValue + backgroundMod,
      byCoinsValue: 0
    };
  });
}

function getBackgroundModifierForAbility(code: string): number {
  if (!hasBackgroundModifiers.value) return 0;
  if (backgroundBonusMode.value === "2+1") {
    if (backgroundPlus2.value === code) return 2;
    if (backgroundPlus1.value === code) return 1;
  } else if (backgroundPlus1x3.value.filter(a => a === code).length > 0) return 1;
  return 0;
}

function getBackgroundSlotCode(slot: "+2" | "+1"): string | null {
  return slot === "+2" ? backgroundPlus2.value : backgroundPlus1.value;
}

function getBackgroundSlotName(slot: "+2" | "+1"): string {
  const code = getBackgroundSlotCode(slot);
  return code ? (abilities.value.find((a) => a.code === code)?.name ?? code) : "";
}

function getAbilityName(code: string): string {
  return abilities.value.find((a) => a.code === code)?.name ?? code;
}

function clearBackgroundSlot(slot: "+2" | "+1") {
  if (slot === "+2") backgroundPlus2.value = null;
  else backgroundPlus1.value = null;
  calculateAbilityValues();
}

function applyBackgroundMode(value: "2+1" | "1+1+1") {
  backgroundBonusMode.value = value;
  if (value === "2+1") {
    backgroundPlus1x3.value = [];
  } else {
    backgroundPlus2.value = null;
    backgroundPlus1.value = null;
    backgroundPlus1x3.value = allowedBackgroundCodes.value.slice(0, 3);
  }
  calculateAbilityValues();
}


function isAllowedForBackground(code: string): boolean {
  return allowedBackgroundCodes.value.includes(code);
}

function tryAssignBackgroundModifier(abilityCode: string): boolean {
  if (!hasBackgroundModifiers.value || !isAllowedForBackground(abilityCode)) return false;
  if (backgroundBonusMode.value === "2+1") {
    // 1. Clicking an already-assigned ability clears it (toggle off)
    if (backgroundPlus2.value === abilityCode) {
      backgroundPlus2.value = null;
    } else if (backgroundPlus1.value === abilityCode) {
      backgroundPlus1.value = null;
    } else if (!backgroundPlus2.value) {
      // 2. Assign +2 first
      backgroundPlus2.value = abilityCode;
    } else if (!backgroundPlus1.value && abilityCode !== backgroundPlus2.value) {
      // 3. Then assign +1 to a different ability (never same as +2)
      backgroundPlus1.value = abilityCode;
    } else if (backgroundPlus2.value && backgroundPlus1.value && abilityCode !== backgroundPlus2.value) {
      // 4. Both full: clicking another allowed ability replaces +1
      backgroundPlus1.value = abilityCode;
    } else {
      backgroundPlus1x3.value = allowedBackgroundCodes.value.slice(0, 3);
      return false;
    }
  } else {
    // +1+1+1: preselected, user cannot choose or change
    return false;
  }
  calculateAbilityValues();
  return true;
}

watch(() => props.characterData?.race?.stats?.abilityModifiers, () => {
  calculateAbilityValues();
}, {immediate: true});

watch(
    () => props.characterData?.background?.stats?.abilityModifiers,
    () => {
      backgroundPlus2.value = null;
      backgroundPlus1.value = null;
      backgroundPlus1x3.value = [];
      calculateAbilityValues();
    }
);

function getAbilityRaceModifiers() {
  return (props.characterData?.race?.stats?.abilityModifiers || [{code: 'Нет модификаторов'}])
      .map((raceModifier: AbilityModifier) => {
        let calcedName: string;
        if (raceModifier?.code == 'ANY') {
          onChooseCount = raceModifier?.count
          calcedName = `${raceModifier?.count} на выбор`
        } else if (raceModifier?.code == 'ALL') {
          calcedName = "Все"
        } else {
          const matchingAbility = abilities.value.find(ability => ability.code === raceModifier.code);
          if (matchingAbility != undefined) {
            calcedName = matchingAbility.name;
          } else {
            calcedName = ""
          }
        }
        return {
          ...raceModifier,  // Сохраняем все остальные поля
          name: calcedName // Добавляем поле `name` с нужным значением
        };
      });
}

function onClickAbility(abilityCode: string) {
  if (tryAssignBackgroundModifier(abilityCode)) return;

  const matchingAbility = abilities.value.find(ability => ability.code === abilityCode);
  if (!matchingAbility) {
    return
  }
  const matchingAnyModifier = getAbilityRaceModifiers().find((modifier: AbilityModifier) => modifier.code === "ANY");
  const matchingNotAnyModifier = getAbilityRaceModifiers().find((modifier: AbilityModifier) => modifier.code === abilityCode);
  if (!matchingNotAnyModifier && matchingAbility.defaultValue + matchingAbility.modifierValue == MINIMAL_ABILITY_VALUE) {
    if (selected.length < onChooseCount && !selected.includes(matchingAbility.code)) {
      selected.push(matchingAbility.code)
      if (matchingAnyModifier) {
        matchingAbility.modifierValue = matchingAnyModifier.value
      }
    }
  } else if (!matchingNotAnyModifier && selected.length >= 0) {
    selected = selected.filter((code) => {
      return code != matchingAbility.code
    });
    matchingAbility.modifierValue = 0
  }
}

function isAbilityHighlighted(abilityCode: string) {
  const raceModifiers = getAbilityRaceModifiers();
  const fromRace =
      raceModifiers.some((modifier: AbilityModifier) => modifier.code === "ALL") ||
      raceModifiers.some((modifier: AbilityModifier) => modifier.code === abilityCode) ||
      selected.some(code => code === abilityCode);
  if (fromRace) return true;
  return hasBackgroundModifiers.value && getBackgroundModifierForAbility(abilityCode) > 0;

}

function abilityModify(abilityCode: string, change: number) {
  const ability = abilities.value.find(ab => ab.code === abilityCode);

  if (ability) {
    // Текущее значение способности
    const currentAbilityValue = ability.defaultValue + ability.byCoinsValue;
    const newAbilityValue = currentAbilityValue + change;

    // Проверяем, что новое значение находится в допустимых пределах (8-15)
    if (newAbilityValue >= 8 && newAbilityValue <= 15) {
      // Рассчитываем общую стоимость улучшения/понижения
      let totalCost = 0;
      if (change > 0) {
        // Увеличиваем значение
        for (let i = currentAbilityValue; i < newAbilityValue; i++) {
          totalCost += abilityUpgradeCostTable[i - 8] || 0; // Рассчитываем стоимость для каждого шага
        }
      } else {
        // Уменьшаем значение
        for (let i = currentAbilityValue - 1; i >= newAbilityValue; i--) {
          totalCost -= abilityUpgradeCostTable[i - 8] || 0; // Рассчитываем стоимость для каждого шага
        }
      }

      // Проверяем, достаточно ли монет
      if ((totalCoins.value < MAX_COINS_VALUE && change < 0) || (totalCoins.value >= totalCost && change > 0)) {
        // Применяем изменения
        totalCoins.value -= totalCost; // Списываем/добавляем монеты
        ability.byCoinsValue += change; // Изменяем значение способности
      }
    }
  }
}

function onChooseAbilities(abilities: AbilityResponse[]) {
  if (props.characterData) {
    // eslint-disable-next-line vue/no-mutating-props
    props.characterData.abilities = abilities.map(ability => {
      return {
        code: ability.code,
        value: ability.defaultValue + ability.modifierValue + ability.byCoinsValue
      };
    });
  }
  if (props.currentStep) {
    // eslint-disable-next-line vue/no-mutating-props
    props.currentStep.current = props.currentStep.current + 1
  }
}

</script>

<style scoped>
.wrapper {
  display: flex;
  flex-direction: column;
}

.ability-list ion-list {
  background: transparent;
}

.ability-header .coins {
  float: right;
}

.ability-description {
  display: flex;
  flex-direction: column;
}

.ability-score-round {
  width: 5vh;
  height: 5vh;
  background-color: var(--ion-color-primary); /* Цвет фона */
  border-radius: 50%; /* Форма круга */
  display: flex;
  align-items: center;
  justify-content: center;
}

.ability-score-value {
  color: white; /* Цвет буквы */
  font-weight: bold;
}

.ability-buttons {
  display: flex;
  flex-direction: row;
  margin-left: auto;
}

.ability-buttons ion-button {
  background: transparent;
}

ion-item {
  padding-bottom: 5%;
  --padding-end: 0px;
  --inner-padding-end: 0px;
  --padding-start: 0px;
  --inner-padding-start: 0px;
}

@keyframes glowing {
  0% {
    box-shadow: 0 0 5px var(--ion-color-success) inset;
  }
  50% {
    box-shadow: 0 0 30px var(--ion-color-success) inset;
  }
  100% {
    box-shadow: 0 0 5px var(--ion-color-success) inset;
  }
}

.ability-score-round.highlighted {
  background-color: var(--ion-color-primary);
  animation: glowing 1.5s infinite;
  position: relative;
}

.ability-score-round.background-eligible {
  border: 2px solid var(--ion-color-success);
}

.background-modifiers-block {
  margin-top: 12px;
  margin-bottom: 12px;
  padding: 10px 0;
}

.background-modifiers-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ion-text-color);
  margin: 0 0 4px 0;
}

.background-modifiers-hint {
  font-size: 0.85rem;
  color: var(--ion-color-secondary);
  margin: 0 0 10px 0;
}

.background-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.background-slots ion-chip {
  cursor: pointer;
}
</style>
