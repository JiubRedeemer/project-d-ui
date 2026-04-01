<script setup lang="ts">
import {IonButton, IonIcon, IonInput, IonModal} from "@ionic/vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {ref} from "vue";
import {checkmarkOutline} from "ionicons/icons";
import {HEADERS} from "@/config/localisations";
import {useCharacterStore} from "@/stores/CharacterStore";

const route = useRoute();
const characterStore = useCharacterStore()

const props = defineProps({
  url: String,
  isOpen: Boolean, // Принимаем видимость модалки
});


const emit = defineEmits(["closeBonusValueHpModal"]); // Добавляем событие закрытия
const inputValue = ref();
const inputMaxValue = ref();
inputValue.value = characterStore.character.health.bonusValue;
inputMaxValue.value = characterStore.character.health.maxHp;

async function onSubmit() {
  try {
    console.log(inputValue.value)
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
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterStore.character.id}${props.url}${GATEWAY_INTEGRATION_ROUTES.max}`,
        {
          bonusValue: inputMaxValue.value,
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
  characterStore.updateCharacterInStoreById(route.params.roomId, characterStore.character.id);
  console.log(inputValue);
  emit('closeBonusValueHpModal');
}

</script>

<template>
  <ion-modal
      :is-open="isOpen"
      @didDismiss="emit('closeBonusValueHpModal')"
      :initial-breakpoint="1"
      :breakpoints="[0, 0.5, 1]"
  >
    <div class="block">
      <div class="header">
        <div class="name">{{
            HEADERS.health.rus + " (" + (characterStore.character.health!.maxHp! + characterStore.character.health!.bonusValue!) + ")"
          }}
        </div>
      </div>
      <div class="input-block">
        <ion-input
            type="number"
            fill="outline"
            color="primary"
            :clear-input="false"
            v-model="inputMaxValue"
            :value="characterStore.character.health!.maxHp"
            label-placement="floating"
            label="Максимальное значение"
            class="input-block"
            shape="round"/>
      </div>
      <div class="input-block">
        <ion-input
            type="number"
            fill="outline"
            color="primary"
            :clear-input="false"
            v-model="inputValue"
            :value="characterStore.character.health!.bonusValue"
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
