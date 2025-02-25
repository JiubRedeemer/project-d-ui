<script setup lang="ts">
import {IonButton, IonIcon, IonModal} from "@ionic/vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {ref} from "vue";
import {checkmarkOutline} from "ionicons/icons";
import {Character} from "@/components/models/response/Character";
import {HEADERS} from "@/config/localisations";
import HpEditBlock from "@/views/character/tabs/HpEditBlock.vue";
import EditHpValueModal from "@/views/character/tabs/bonus/EditHpValueModal.vue";

const route = useRoute();

const props = defineProps({
  character: ref<Character>,
  url: String,
  isOpen: Boolean, // Принимаем видимость модалки
});


const emit = defineEmits(["closeHpModal"]); // Добавляем событие закрытия
const showEditHpModal = ref(false); // Управляем видимостью модалки
const inputValue = ref();
inputValue.value = props.character?.value?.bonusSpeed;

async function onSubmit() {
  try {
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${props.character?.value?.id}${props.url}${GATEWAY_INTEGRATION_ROUTES.bonus}`,
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
  props.character!.value!.bonusSpeed! = Number(inputValue.value);
  console.log(inputValue);
  emit('closeHpModal');
}

const openEditHpModal = () => {
  showEditHpModal.value = true;
};
const closeEditHpModal = () => {
  showEditHpModal.value = false;
};

</script>

<template>
  <ion-modal
      :is-open="isOpen"
      @didDismiss="emit('closeHpModal')"
      :initial-breakpoint="1"
      :breakpoints="[0, 0.5, 1]"
  >
    <div class="block">
      <div class="header">
        <div class="name">{{ HEADERS.health.rus }}
        </div>
        <div class="value">
          {{ character?.value?.health.currentHp }}/{{
            character?.value?.health.maxHp + character?.value?.health.bonusValue
          }}({{ character?.value?.health.tempHp }})
        </div>
      </div>
      <div class="input-block">
        <HpEditBlock :character="character" @editHpSelect="openEditHpModal()"/>
      </div>
      <div class="footer">
        <ion-button size="large" shape="round" @click="onSubmit">
          <ion-icon slot="icon-only" :icon="checkmarkOutline" color="onPrimary"></ion-icon>
        </ion-button>
      </div>
    </div>
    <EditHpValueModal v-if="showEditHpModal"
                      :character="character"
                      :isOpen="showEditHpModal"
                      :character-id="String(route.params.characterId)"
                      :url="String(GATEWAY_INTEGRATION_ROUTES.health)"
                      @closeHpModal="closeEditHpModal"/>
  </ion-modal>
</template>


<style scoped>
.block {
  width: 100%;
  height: 70vh;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
}

.header {
  padding: 10px;
  font-size: 1.5rem;
  width: 100%;
  display: flex;
  justify-content: space-between;
  flex-direction: row;
}

.input-block {
  padding: 10px;
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
