<script setup lang="ts">
import { IonButton, IonRange, createAnimation, IonToggle } from "@ionic/vue";
import TopModal from "@/views/common/TopModal.vue";
import { onMounted, ref } from "vue";
import { useCharacterStore } from "@/stores/CharacterStore";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import axios from "axios";
import { useRoute } from "vue-router";

const route = useRoute();


const props = defineProps({
  isOpen: Boolean,
});

const emit = defineEmits(["closeRestModal"]);
const characterStore = useCharacterStore()


const longRest = ref(true);

async function onSubmit() {
  try {
    await axios.post(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterStore.character.id}${GATEWAY_INTEGRATION_ROUTES.rest}/${longRest ? 'LONG_REST' : 'SHORT_REST'}`,
      {},
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


  characterStore.updateCharacterInStoreById(route.params.roomId, route.params.characterId)
  emit('closeRestModal');
}

</script>


<template>
  <TopModal :isOpen="isOpen" @close="emit('closeRestModal')">
    <div class="rest">

      <!-- Блок с кубами здоровья 
      <div v-if="!longRest" class="rest-section">
        <div class="rest-section__title">
          Использовать кубов здоровья
        </div>

        <div class="dice-row">
          <IonRange aria-label="Rest counter" :ticks="true" :snaps="true" :min="0" :max="characterStore.character.currentHpDiceCount" />
          <div class="dice-label">3d4</div>
        </div>
      </div>-->

      <!-- Переключатель отдыха -->
      <div class="rest-toggle">
        <span>{{ longRest ? 'Долгий отдых' : 'Короткий отдых' }}</span>
        <IonToggle mode="ios" aria-label="Toggle rest" color="primary" v-model="longRest" />
      </div>

      <!-- Кнопка -->
      <div class="rest-button">
        <IonButton shape="round" color="secondary" fill="solid" @click="onSubmit">
          Отдохнуть
        </IonButton>
      </div>

    </div>
  </TopModal>
</template>

<style scoped>
.rest {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
}

/* Общая секция */
.rest-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rest-section__title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

/* Кубы здоровья */
.dice-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dice-row ion-range {
  flex: 1;
}


.dice-label {
  padding: 6px 12px;
  border-radius: 12px;
  background: #7b6cf6;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
}

/* Toggle */
.rest-toggle {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  font-size: 15px;
  color: #ffffff;
}

/* Кнопка */
.rest-button {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.rest-button ion-button {
  width: 100%;
  max-width: 102px;
  height: 48px;
  font-size: 12px;
}
</style>
