<template>
  <ion-grid>
    <ion-row>
      <ion-col>
        <ion-button expand="block" class="settings-button" @click="selectEditHp(character?.value!!)">
          <ion-icon :icon="settingsOutline"></ion-icon>
        </ion-button>
      </ion-col>
    </ion-row>
    <ion-row>
      <ion-col size="10">
        <ion-input v-model="inputValue" readonly class="calculator-display" fill="outline"></ion-input>
      </ion-col>
      <ion-col size="2">
        <ion-button class="backspace" expand="block" @click="backspace">&lt;</ion-button>
      </ion-col>
    </ion-row>
    <ion-row v-for="(row, rowIndex) in buttons" :key="rowIndex">
      <ion-col v-for="btn in row" :key="btn.value">
        <ion-button class="button" expand="block" :color="btn.color" @click="handleClick(btn.value)"
                    :style="{ fontSize: btn.size }">
          {{ btn.label }}
        </ion-button>
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {IonButton, IonCol, IonGrid, IonIcon, IonInput, IonRow} from '@ionic/vue';
import {settingsOutline} from 'ionicons/icons';
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {Character} from "@/components/models/response/Character";

const emits = defineEmits(["edit-hp-select"]);

const route = useRoute();
const inputValue = ref<string>('');

const props = defineProps({
  character: ref<Character>
});

interface Button {
  label: string;
  value: string;
  size?: string;
  color?: string;
}

const buttons: Button[][] = [
  [{label: '7', value: '7'}, {label: '8', value: '8'}, {label: '9', value: '9'}],
  [{label: '4', value: '4'}, {label: '5', value: '5'}, {label: '6', value: '6'}],
  [{label: '1', value: '1'}, {label: '2', value: '2'}, {label: '3', value: '3'}],
  [{label: '0', value: '0'}],
  [
    {label: 'Временные', value: 'temp', size: '10px'},
    {label: 'Лечение', value: 'heal', size: '10px'},
    {label: 'Урон', value: 'damage', size: '10px'}
  ]
];

const selectEditHp = (character: Character) => {
  emits("edit-hp-select", character);
};

const handleClick = (value: string) => {
  if (['heal', 'damage', 'temp'].includes(value)) {
    if (inputValue.value !== "") {
      updateCurrentHealth(value.toUpperCase(), Number(inputValue.value));
      inputValue.value = "";
    }
  } else {
    inputValue.value += value;
  }
};

const backspace = () => {
  inputValue.value = inputValue.value.slice(0, -1);
};

const updateCurrentHealth = async (type: string, value: number) => {
  try {
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.health}${GATEWAY_INTEGRATION_ROUTES.updateCurrent}`,
        {
          type,
          value
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`
          }
        }
    );

    if (props.character?.value) {
      if (type === "HEAL") {
        // eslint-disable-next-line vue/no-mutating-props
        props.character.value.health.currentHp = Math.min(props.character.value.health.currentHp + value, props.character.value.health.maxHp + props.character.value.health.bonusValue);
      } else if (type === "DAMAGE") {
        if (props.character.value.health.tempHp >= value) {
          // eslint-disable-next-line vue/no-mutating-props
          props.character.value.health.tempHp -= value;
        } else {
          const remainingDamage = value - props.character.value.health.tempHp;
          // eslint-disable-next-line vue/no-mutating-props
          props.character.value.health.currentHp = Math.max(0, props.character.value.health.currentHp - remainingDamage);
          // eslint-disable-next-line vue/no-mutating-props
          props.character.value.health.tempHp = 0;
        }
      } else if (type === "TEMP") {
        // eslint-disable-next-line vue/no-mutating-props
        props.character.value.health.tempHp += value;
      }

    }


  } catch (error) {
    console.error("Ошибка при обновлении данных:", error);
  }
};
</script>

<style scoped>
.calculator-display {
  font-size: 20px;
  text-align: right;
  margin-top: 15px;
  margin-bottom: 10px;
  height: 36px;
  min-height: 5px;
  background-color: var(--ion-color-dark);
  --border-color: var(--ion-color-primary);
}

.settings-button {
  margin-top: 15px;
}

.backspace {
  height: 35px;
  margin-top: 15px;
  --background: var(--ion-color-dark);
  --border-color: var(--ion-color-primary);
  --border-style: solid;
  --border-width: 1px;
  color: var(--ion-color-dark-contrast);
}

.button {
  font-size: 15px;
  height: 35px;
  --background: var(--ion-color-dark);
  --border-color: var(--ion-color-primary);
  --border-style: solid;
  --border-width: 1px;
  color: var(--ion-color-dark-contrast);
}
</style>
