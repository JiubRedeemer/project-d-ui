<script setup lang="ts">
import {IonButton, IonIcon, IonInput, IonModal} from "@ionic/vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {ref} from "vue";
import {checkmarkOutline} from "ionicons/icons";
import {HEADERS} from "@/config/localisations";
import {useCharacterStore} from "@/stores/CharacterStore";
import {EquippedItemsStatsResponse} from "@/components/models/response/Character";
import {useInventoryStore} from "@/stores/InventoryStore";

const route = useRoute();
const characterStore = useCharacterStore()
const inventoryStore = useInventoryStore();

const props = defineProps({
  url: String,
  isOpen: Boolean, // Принимаем видимость модалки
});


const emit = defineEmits(["closeEditArmoryClassModal"]); // Добавляем событие закрытия
const inputValue = ref();
inputValue.value = characterStore.character.bonusArmoryClass;

async function onSubmit() {
  try {
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterStore.character.id}${props.url}${GATEWAY_INTEGRATION_ROUTES.bonus}`,
        {
          bonusValue: inputValue.value,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
  characterStore.character.bonusArmoryClass! = Number(inputValue.value);
  console.log(inputValue);
  emit('closeEditArmoryClassModal');
}

function getArmoryClassBonusSum(itemStats: EquippedItemsStatsResponse | null): number {
  if(!itemStats) return 0;
  if (!itemStats.armoryClassBonus) return 0;

  return itemStats.armoryClassBonus.reduce((sum, stat) => {
    const value = typeof stat.value === 'number' ? stat.value : Number(stat.value);
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
}

const getBaseArmoryClass = () : number => {
  if (characterStore.character != null && inventoryStore.inventory != null) {
    const equippedArmor = inventoryStore.inventory.items.filter(item => item.inUse && item.item.type === 'ARMOR')[0];
    if (equippedArmor)
      return Number(equippedArmor.item.stats.armorClass)
    else return characterStore.character?.armoryClass;
  }
  return 0;
}

function calculateCheckValue(value: any) {
  return Math.floor((value - 10) / 2);
}

const getDexArmoryClass = () : number => {
  const equippedArmor = inventoryStore.inventory.items.filter(item => item.inUse && item.item.type === 'ARMOR')[0];
  const dexAbility = characterStore.character.abilities.filter(ability => ability.code == 'DEX')[0];
  const dexAbilityCheck = calculateCheckValue(dexAbility.value + dexAbility.bonusValue)
  if(equippedArmor && equippedArmor.item.subtype == 'HEAVY_ARMOR') return 0;
  else if (equippedArmor && equippedArmor.item.subtype == 'MEDIUM_ARMOR') {
    return dexAbilityCheck >= 2 ? 2 : dexAbilityCheck
  }
  else if (equippedArmor && equippedArmor.item.subtype == 'LIGHT_ARMOR') return dexAbilityCheck
  else return 0;
}
</script>

<template>
  <ion-modal
      :is-open="isOpen"
      @didDismiss="emit('closeEditArmoryClassModal')"
      :initial-breakpoint="1"
      :breakpoints="[0, 0.5, 1]"
  >
    <div class="block">
      <div class="header">
        <div class="name">{{
            HEADERS.armoryClass.rus + " (" + (getBaseArmoryClass()! + characterStore.character.bonusArmoryClass!) + (getDexArmoryClass() != 0 ? (" + " + getDexArmoryClass()) : "") + (getArmoryClassBonusSum(characterStore.character.itemStats) > 0 ? (") + " + getArmoryClassBonusSum(characterStore.character.itemStats)) : ")")
          }}
        </div>
        <div class="description">

        </div>
      </div>
      <div class="input-block">
        <ion-input
            type="number"
            fill="outline"
            color="primary"
            :clear-input="false"
            v-model="inputValue"
            :value="characterStore.character.bonusArmoryClass!"
            label-placement="floating"
            label="Бонусное значение"
            class="input-block"
            shape="round"/>
      </div>
      <div class="footer">
        <ion-button size="large" shape="round" @click="onSubmit">
          <ion-icon slot="icon-only" :icon="checkmarkOutline" color="onPrimary"></ion-icon>
        </ion-button>
      </div>
    </div>
  </ion-modal>
</template>


<style scoped>
.block {
  width: 100%;
  height: 300px;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
}

.header {
  padding: 10px;
  font-size: 1.5rem;
  width: 100%;
  display: flex;
  justify-content: start;
  flex-direction: row;
}

.input-block {
  padding: 10px;
  display: flex;
  justify-content: center;
}

.footer {
  padding: 10px;
  display: flex;
  justify-content: end;
}

ion-modal {
  --border-radius: 10px;
  --height: auto;
  --width: 90%;
  --background: var(--ion-color-dark);
}
</style>
