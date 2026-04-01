<script setup lang="ts">
import {IonButton, IonToggle} from "@ionic/vue";
import TopModal from "@/views/common/TopModal.vue";
import {ref} from "vue";
import {useCharacterStore} from "@/stores/CharacterStore";
import {useCharacterSkillsStore} from "@/stores/CharacterSkillsStore";
import {useInventoryStore} from "@/stores/InventoryStore";
import {useMagicStore} from "@/stores/MagicStore";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import axios from "axios";
import {useRoute} from "vue-router";
import {refillRestByCharacter} from "@/api/magicApi";

const route = useRoute();


const props = defineProps({
  isOpen: Boolean,
});

const emit = defineEmits(["closeRestModal"]);
const characterStore = useCharacterStore()
const magicStore = useMagicStore()
const characterSkillsStore = useCharacterSkillsStore()
const inventoryStore = useInventoryStore()


const longRest = ref(true);

async function onSubmit() {
  try {
    await axios.post(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterStore.character.id}${GATEWAY_INTEGRATION_ROUTES.rest}/${longRest.value ? 'LONG_REST' : 'SHORT_REST'}`,
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

  try {
    const updatedSpellBook = await refillRestByCharacter(
        String(route.params.roomId),
        String(route.params.characterId),
        longRest.value ? "LONG_REST" : "SHORT_REST"
    );
    magicStore.setSpellBook(updatedSpellBook);
  } catch (error) {
    console.error("Failed to refill spell cells:", error);
    await magicStore.updateSpellBookInStore(
        String(route.params.roomId),
        String(route.params.characterId)
    );
  }

  await Promise.all([
    characterStore.updateCharacterInStoreById(route.params.roomId, route.params.characterId),
    characterSkillsStore.updateCharacterSkills(route.params.roomId, route.params.characterId),
    inventoryStore.updateInventoryInStoreById(route.params.roomId, route.params.characterId)
  ])
  emit('closeRestModal');
}

</script>


<template>
  <TopModal :isOpen="isOpen" @close="emit('closeRestModal')">
    <div class="rest">
      <div
          class="rest-bg rest-bg--long"
          :class="{ 'rest-bg--active': longRest }"
          aria-hidden="true"
      />
      <div
          class="rest-bg rest-bg--short"
          :class="{ 'rest-bg--active': !longRest }"
          aria-hidden="true"
      />
      <div class="rest-content">

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
        <span :style="longRest ? 'color:#fffba8;' : 'color:#214031;'"
        >{{ longRest ? 'Долгий отдых' : 'Короткий отдых' }}</span>
          <IonToggle mode="ios" aria-label="Toggle rest" v-model="longRest"/>
        </div>

        <!-- Кнопка -->
        <div class="rest-button">
          <IonButton shape="round" color="secondary" fill="solid" @click="onSubmit">
            Отдохнуть
          </IonButton>
        </div>

      </div>
    </div>
  </TopModal>
</template>

<style scoped>
.rest {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
  border-radius: 0 0 16px 16px;
  overflow: hidden;
}

.rest-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0;
  transition: opacity 0.4s ease-in-out;
  pointer-events: none;
}

.rest-bg--long {
  background-image: url("@/static/images/rest/REST_LONG.png");
}

.rest-bg--short {
  background-image: url("@/static/images/rest/REST_SHORT.png");
}

.rest-bg--active {
  opacity: 1;
}

.rest-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  font-weight: bolder;
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
