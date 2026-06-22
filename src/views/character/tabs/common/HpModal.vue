<script setup lang="ts">
import {IonButton, IonIcon, IonModal} from "@ionic/vue";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {computed, onMounted, onUnmounted, ref} from "vue";
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
const isDesktop = ref<boolean>(window.innerWidth >= 1024);

const modalBreakpoints = computed(() => (isDesktop.value ? undefined : [0, 1]));
const modalInitialBreakpoint = computed(() => (isDesktop.value ? undefined : 1));

const currentHp = computed(() => characterStore.character?.health?.currentHp ?? 0);
const maxHp = computed(() =>
    (characterStore.character?.health?.maxHp ?? 0)
    + (characterStore.character?.health?.bonusValue ?? 0)
);
const tempHp = computed(() => characterStore.character?.health?.tempHp ?? 0);

async function onSubmit() {
  emit('closeHpModal');
}

const openEditHpModal = () => {
  showEditHpModal.value = true;
};
const closeEditHpModal = () => {
  showEditHpModal.value = false;
};

const onResize = () => {
  isDesktop.value = window.innerWidth >= 1024;
};

onMounted(() => {
  window.addEventListener("resize", onResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});

</script>

<template>
  <ion-modal
      :is-open="isOpen"
      @didDismiss="emit('closeHpModal')"
      :initial-breakpoint="modalInitialBreakpoint"
      :breakpoints="modalBreakpoints"
      :class="{ 'desktop-modal': isDesktop }"
  >
    <div class="block">
      <div class="header">
        <div class="name">{{ HEADERS.health.rus }}
        </div>
        <div class="value">
          {{ currentHp }}/{{ maxHp }}<span v-if="tempHp > 0" class="temp-hp"> +{{ tempHp }}</span>
        </div>
      </div>
      <div class="input-block">
        <HpEditBlock @editHpSelect="openEditHpModal()"/>
      </div>
      <div class="footer" v-if="isDesktop">
        <ion-button size="large" shape="round" @click="onSubmit">
          <ion-icon slot="icon-only" :icon="checkmarkOutline" color="onPrimary"></ion-icon>
        </ion-button>
      </div>
      <div class="safe-bottom" v-else aria-hidden="true"></div>
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

.temp-hp {
  margin-left: 4px;
  font-size: 0.9em;
  font-weight: 700;
  color: var(--ion-color-primary);
}

.input-block {
  padding: 10px;
  justify-content: center;
}

.footer {
  padding: 10px;
  margin-bottom: 50px;
  display: flex;
  justify-content: end;
}

.safe-bottom {
  flex-shrink: 0;
  height: 50px;
}

ion-modal {
  --border-radius: 10px;
  --height: auto;
  --width: 90%;
  --background: var(--ion-color-dark);
}

@media (min-width: 1024px) {
  .block {
    height: auto;
    min-height: 420px;
    max-height: min(80vh, 760px);
    padding: 8px;
  }

  .header {
    padding: 14px 16px 10px 16px;
    font-size: 1.25rem;
    align-items: center;
    border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  }

  .name {
    font-weight: 600;
  }

  .value {
    font-size: 1.05rem;
    color: var(--ion-color-light);
  }

  .input-block {
    padding: 16px;
    overflow-y: auto;
  }

  .footer {
    padding: 12px 16px 14px 16px;
    border-top: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  }

  ion-modal.desktop-modal {
    --width: min(860px, 88vw);
    --height: auto;
    --max-height: 86vh;
    --border-radius: 14px;
  }
}
</style>
