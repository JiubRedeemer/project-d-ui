<script setup lang="ts">
import {IonButton, IonIcon, IonInput, IonModal} from "@ionic/vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {ref} from "vue";
import {checkmarkOutline} from "ionicons/icons";
import {useCharacterStore} from "@/stores/CharacterStore";

const route = useRoute();

const props = defineProps({
  ability: ref<AbilityDto>,
  // characterId: String,
  url: String,
  isOpen: Boolean, // Принимаем видимость модалки
});

const characterStore = useCharacterStore()



const emit = defineEmits(["closeEditAbilityModal"]); // Добавляем событие закрытия
const inputValue = ref();
inputValue.value = props.ability?.value?.bonusValue

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
  props.ability!.value!.bonusValue! = Number(inputValue.value);
  console.log(inputValue);
  emit('closeEditAbilityModal')
}

</script>

<template>
  <ion-modal
      :is-open="isOpen"
      @didDismiss="emit('closeEditAbilityModal')"
      :initial-breakpoint="1"
      :breakpoints="[0, 0.5, 1]"
  >
    <div class="block">
      <div class="header">
        <div class="name">{{
            props.ability?.value?.name + " (" + (props.ability?.value?.value!! + props.ability?.value?.bonusValue!!) + ")"
          }}
        </div>
      </div>
      <div class="input-block">
        <ion-input
            type="number"
            fill="outline"
            color="primary"
            :clear-input="false"
            v-model="inputValue"
            :value="props.ability?.value?.bonusValue"
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
