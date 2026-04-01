<script setup lang="ts">
import {IonButton, IonIcon, IonInput, IonProgressBar} from "@ionic/vue";
import {add, close, remove} from "ionicons/icons";
import {computed, ref, watch} from "vue";
import TopModal from "@/views/common/TopModal.vue";
import {useCharacterStore} from "@/stores/CharacterStore";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";

const props = defineProps({
  isOpen: Boolean,
});

const emit = defineEmits(["closeLevelUpModal"]);
const characterStore = useCharacterStore();
const route = useRoute();
const inputValue = ref<number | null>(null);
const isSubmitting = ref(false);

const currentXp = computed(() => Number(characterStore.character?.level?.xp ?? 0));
const nextLevelXp = computed(() => Number(characterStore.character?.level?.nextLevelXp ?? 1));
const currentLevel = computed(() => Number(characterStore.character?.level?.level ?? 1));

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      inputValue.value = null;
    }
  }
);

const addedXp = computed(() => {
  const raw = Number(inputValue.value ?? 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.floor(raw));
});

const canLevelUp = computed(() => currentXp.value >= nextLevelXp.value);
const hasInput = computed(() => addedXp.value > 0);
const levelUpButtonText = computed(() => canLevelUp.value ? "Повысить уровень" : "Повысить уровень принудительно");
const progressValue = computed(() => {
  if (nextLevelXp.value <= 0) return 0;
  return Math.min(1, Math.max(0, currentXp.value / nextLevelXp.value));
});

const authHeaders = computed(() => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`
}));

const buildLevelUrl = () => {
  const roomId = String(route.params.roomId ?? "");
  const characterId = String(route.params.characterId ?? "");

  return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterId}/level`;
};

const refreshCharacter = async () => {
  await characterStore.updateCharacterInStoreById(route.params.roomId, route.params.characterId);
};

const updateCurrentXp = async (value: number) => {
  if (!Number.isFinite(value) || value === 0) return;

  isSubmitting.value = true;
  try {
    await axios.patch(
      `${buildLevelUrl()}/updateCurrent`,
      {value},
      {headers: authHeaders.value}
    );
    inputValue.value = null;
    await refreshCharacter();
  } catch (error) {
    console.error("Ошибка при обновлении опыта:", error);
  } finally {
    isSubmitting.value = false;
  }
};

const levelUp = async (force = false) => {
  isSubmitting.value = true;
  try {
    await axios.post(
      `${buildLevelUrl()}/up`,
      null,
      {
        headers: authHeaders.value,
        params: {force}
      }
    );
    await refreshCharacter();
  } catch (error) {
    console.error("Ошибка при повышении уровня:", error);
  } finally {
    isSubmitting.value = false;
  }
};

const levelDown = async (force = false) => {
  isSubmitting.value = true;
  try {
    await axios.post(
      `${buildLevelUrl()}/down`,
      null,
      {
        headers: authHeaders.value,
        params: {force}
      }
    );
    await refreshCharacter();
  } catch (error) {
    console.error("Ошибка при понижении уровня:", error);
  } finally {
    isSubmitting.value = false;
  }
};

const decreaseXp = () => {
  if (!hasInput.value || isSubmitting.value) return;
  void updateCurrentXp(-addedXp.value);
};

const increaseXp = () => {
  if (!hasInput.value || isSubmitting.value) return;
  void updateCurrentXp(addedXp.value);
};

const handleLevelUpClick = () => {
  if (isSubmitting.value) return;
  void levelUp(!canLevelUp.value);
};

const closeModal = () => emit("closeLevelUpModal");
</script>

<template>
  <TopModal :isOpen="isOpen" @close="closeModal">
    <div class="levelup">
      <div class="levelup-content">
        <div class="levelup-header">
          <div class="levelup-title">Уровень {{ currentLevel }}</div>
          <button type="button" class="levelup-dismiss" aria-label="Закрыть" @click="closeModal">
            <IonIcon :icon="close"/>
          </button>
        </div>

        <div class="levelup-progress">
          <IonProgressBar :value="progressValue" :class="{ ready: canLevelUp }"/>
          <div class="levelup-progress__text">{{ characterStore.character?.level?.xp }} / {{ characterStore.character?.level?.nextLevelXp }}</div>
          <div class="levelup-progress__meta">
          </div>
        </div>

        <div class="levelup-label">Изменить текущий опыт</div>

        <div class="levelup-input-wrap">
          <IonInput
            type="number"
            fill="outline"
            color="primary"
            :clear-input="true"
            v-model.number="inputValue"
            :min="0"
            inputmode="numeric"
            placeholder="0"
          />
        </div>
        <div class="levelup-hint">
          Введите значение опыта и примените: добавить или списать.
        </div>

        <IonButton
          shape="round"
          fill="outline"
          expand="block"
          class="levelup-main-btn"
          :class="{ 'levelup-main-btn--ready': canLevelUp }"
          :disabled="isSubmitting"
          @click="handleLevelUpClick"
        >
          {{ levelUpButtonText }}
        </IonButton>

        <IonButton
          shape="round"
          fill="outline"
          expand="block"
          class="levelup-main-btn"
          :disabled="isSubmitting"
          @click="levelDown(false)"
        >
          Понизить уровень
        </IonButton>

        <div class="levelup-actions">
          <IonButton
            shape="round"
            fill="solid"
            class="levelup-side-btn"
            :disabled="!hasInput || isSubmitting"
            @click="decreaseXp"
          >
            <IonIcon slot="start" :icon="remove"/>
            Списать опыт
          </IonButton>

          <IonButton
            shape="round"
            fill="solid"
            class="levelup-side-btn"
            :disabled="!hasInput || isSubmitting"
            @click="increaseXp"
          >
            <IonIcon slot="start" :icon="add"/>
            Добавить опыт
          </IonButton>
        </div>
      </div>
    </div>
  </TopModal>
</template>

<style scoped>
.levelup {
  background: var(--ion-color-medium);
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 0 0 16px 16px;
  overflow: hidden;
  padding: 16px;
}

.levelup-content {
  display: flex;
  flex-direction: column;
  min-height: 400px;
  gap: 10px;
}

.levelup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.levelup-title {
  text-align: left;
  font-size: 22px;
  line-height: 1.1;
  color: var(--ion-color-medium-contrast);
  font-weight: 700;
}

.levelup-dismiss {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  color: #d8ceff;
  background: rgba(255, 255, 255, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.levelup-dismiss:focus-visible,
.levelup-clear:focus-visible {
  outline: 2px solid #cbb8ff;
  outline-offset: 2px;
}

.levelup-progress {
  margin-bottom: 8px;
}

.levelup-progress ion-progress-bar {
  --background: rgba(210, 199, 255, 0.2);
  --progress-background: #8f78ff;
  height: 14px;
  border-radius: 99px;
}

.levelup-progress ion-progress-bar.ready {
  --progress-background: #ffc938;
}

.levelup-progress__text {
  margin-top: 8px;
  text-align: left;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
}

.levelup-progress__meta {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
}

.levelup-ready {
  color: #ffc938;
  font-weight: 700;
}

.levelup-label {
  color: #ffffff;
  font-size: 15px;
  margin-top: 4px;
}

.levelup-input-wrap {
  position: relative;
  margin-bottom: 0;
}

.levelup-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.levelup-hint {
  color: rgba(255, 255, 255, 0.66);
  font-size: 12px;
  margin-top: 2px;
}

.levelup-main-btn {
  --border-width: 2px;
  --border-color: #cabaff;
  --color: #e8dcff;
  margin: 6px 0 2px;
  font-weight: 700;
  text-transform: none;
}

.levelup-main-btn--ready {
  --border-color: #ffc938;
  --color: #ffc938;
}

.levelup-actions {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.levelup-side-btn {
  --background: #cbb8ff;
  --color: #3e2d77;
  --border-radius: 22px;
  text-transform: none;
  font-weight: 700;
  flex: 1;
}

@media (max-width: 420px) {
  .levelup {
    padding: 14px;
  }

  .levelup-content {
    min-height: 360px;
  }

  .levelup-title {
    font-size: 20px;
  }
}
</style>
