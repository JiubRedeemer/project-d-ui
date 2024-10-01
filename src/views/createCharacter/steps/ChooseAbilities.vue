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
      <div class="ability-list">
        <ion-list color="dark">
          <ion-item color="dark" v-for="(ability, index) in abilities" :key="index">
            <div @click="onClickAbility(ability.code)" class="ability-score-round"
                 :class="{ highlighted: isAbilityHighlighted(ability.code)  }" slot="start">
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
      <ion-icon :icon="arrowForwardOutline" color="light"></ion-icon>
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import {IonButton, IonChip, IonFab, IonFabButton, IonIcon, IonItem, IonLabel, IonList, IonNote} from "@ionic/vue";
import {onMounted, ref, watch} from "vue";
import {addOutline, arrowForwardOutline, arrowUp, invertModeOutline, removeOutline} from "ionicons/icons";
import axios from "axios";
import {useRoute} from "vue-router";
import {INTEGRATION_ROUTES} from "@/config/integrationRoutes";

const route = useRoute();

const props = defineProps({
  characterData: Object,
  currentStep: Object,
});

const abilities = ref<Ability[]>([]);
const totalCoins = ref(27);
let onChooseCount = 0;
let selected = [];
const abilityUpgradeCostTable = {
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
        `${INTEGRATION_ROUTES.baseURL}${INTEGRATION_ROUTES.api}${INTEGRATION_ROUTES.rooms}/${route.params.roomId}${INTEGRATION_ROUTES.roomAbilities}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );

    abilities.value = response.data.map(ability => ({
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

  abilities.value = abilities.value.map(ability => {
    const modifier = raceModifiers.find(mod => mod.code === ability.code || mod.code === "ALL");
    const modifierValue = modifier ? modifier.value : 0; // Если модификатор не найден, 0

    return {
      ...ability,
      defaultValue: MINIMAL_ABILITY_VALUE, // Прибавляем модификатор к defaultValue
      modifierValue: modifierValue,
      byCoinsValue: 0
    };
  });
}

// Используем watch для отслеживания изменений в abilityModifiers
watch(() => props.characterData?.race?.stats?.abilityModifiers, (newModifiers) => {
  calculateAbilityValues(); // Пересчитываем значения, когда модификаторы меняются
}, {immediate: true}); // Вызов при первой инициализации

function getAbilityRaceModifiers() {
  return (props.characterData?.race?.stats?.abilityModifiers || [{code: 'Нет модификаторов'}])
      .map(raceModifier => {
        let calcedName: string;
        if (raceModifier?.code == 'ANY') {
          onChooseCount = raceModifier?.count
          calcedName = `${raceModifier?.count} на выбор`
        } else if (raceModifier?.code == 'ALL') {
          calcedName = "Все"
        } else {
          const matchingAbility = abilities.value.find(ability => ability.code === raceModifier.code);
          calcedName = matchingAbility?.name;
        }
        return {
          ...raceModifier,  // Сохраняем все остальные поля
          name: calcedName // Добавляем поле `name` с нужным значением
        };
      });
}

function onClickAbility(abilityCode: string) {
  const matchingAbility = abilities.value.find(ability => ability.code === abilityCode);
  const matchingAnyModifier = getAbilityRaceModifiers().find(modifier => modifier.code === "ANY");
  const matchingNotAnyModifier = getAbilityRaceModifiers().find(modifier => modifier.code === abilityCode);
  if (!matchingNotAnyModifier && matchingAbility?.defaultValue + matchingAbility?.modifierValue == MINIMAL_ABILITY_VALUE) {
    if (selected.length < onChooseCount) {
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

function isAbilityHighlighted(abilityCode) {
  const raceModifiers = getAbilityRaceModifiers();
  return raceModifiers.some(modifier => modifier.code === "ALL") ||
      raceModifiers.some(modifier => modifier.code === abilityCode) ||
      selected.some(code => code === abilityCode);
}

function abilityModify(abilityCode, change) {
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

function onChooseAbilities(abilities: Ability[]) {
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
  console.log(props.characterData)
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
  background-color: var(--ion-color-primary); /* Цвет фона */
  animation: glowing 1.5s infinite; /* Анимация свечения */
  position: relative; /* Устанавливает позиционирование элемента */
}
</style>
