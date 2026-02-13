<script setup lang="ts">
import {IonButton, IonIcon, IonModal} from "@ionic/vue";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {ref} from "vue";
import {checkmarkOutline} from "ionicons/icons";
import {HEADERS} from "@/config/localisations";
import HpEditBlock from "@/views/character/tabs/common/HpEditBlock.vue";
import EditHpBonusValueModal from "@/views/character/tabs/common/bonus/EditHpBonusValueModal.vue";
import {useCharacterStore} from "@/stores/CharacterStore";

const route = useRoute();
const characterStore = useCharacterStore()

const props = defineProps({
  url: String,
  isOpen: Boolean, // Принимаем видимость модалки
});


const emit = defineEmits(["closeHpModal"]); // Добавляем событие закрытия
const showEditHpModal = ref(false); // Управляем видимостью модалки
const inputValue = ref();
inputValue.value = characterStore.character.bonusSpeed;

async function onSubmit() {
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
      :breakpoints="[0, 1]"
  >
    <div class="block">
      <div class="header">
        <div class="name">{{ HEADERS.health.rus }}
        </div>
        <div class="value">
          {{ characterStore.character.health.currentHp }}/{{
            characterStore.character.health.maxHp + characterStore.character.health.bonusValue
          }}({{ characterStore.character.health.tempHp }})
        </div>
      </div>
      <div class="input-block">
        <HpEditBlock @editHpSelect="openEditHpModal()"/>
      </div>
      <div class="footer">
        <ion-button size="large" shape="round" @click="onSubmit">
          <ion-icon slot="icon-only" :icon="checkmarkOutline" color="onPrimary"></ion-icon>
        </ion-button>
      </div>
    </div>
    <EditHpBonusValueModal v-if="showEditHpModal"
                      :isOpen="showEditHpModal"
                      :character-id="String(route.params.characterId)"
                      :url="String(GATEWAY_INTEGRATION_ROUTES.health)"
                      @closeBonusValueHpModal="closeEditHpModal"/>
  </ion-modal>
</template>


<style scoped>
.block {
  width: 100%;
  height: 75vh;
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
