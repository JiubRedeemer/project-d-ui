<script setup lang="ts">
import {IonButton, IonModal, IonToggle} from "@ionic/vue";
import {computed, onMounted, onUnmounted, ref, watch} from "vue";
import {useCharacterRest} from "@/composables/useCharacterRest";

const props = defineProps({
  isOpen: Boolean,
  initialLongRest: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["closeRestModal"]);
const {performRest, isResting} = useCharacterRest();

const longRest = ref(true);
const isDesktop = ref<boolean>(window.innerWidth >= 1024);

const modalBreakpoints = computed(() => (isDesktop.value ? undefined : [0, 0.5, 1]));
const modalInitialBreakpoint = computed(() => (isDesktop.value ? undefined : 1));

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    longRest.value = props.initialLongRest;
  }
});

const onResize = () => {
  isDesktop.value = window.innerWidth >= 1024;
};

onMounted(() => {
  window.addEventListener("resize", onResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});

async function onSubmit() {
  await performRest(longRest.value);
  emit('closeRestModal');
}

</script>


<template>
  <ion-modal
      :is-open="isOpen"
      @didDismiss="emit('closeRestModal')"
      :initial-breakpoint="modalInitialBreakpoint"
      :breakpoints="modalBreakpoints"
      :class="{ 'desktop-modal': isDesktop }"
  >
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
        <div class="rest-toggle">
          <span :style="longRest ? 'color:#fffba8;' : 'color:#214031;'">
            {{ longRest ? 'Долгий отдых' : 'Короткий отдых' }}
          </span>
          <IonToggle mode="ios" aria-label="Toggle rest" v-model="longRest"/>
        </div>

        <div class="rest-button">
          <IonButton shape="round" color="secondary" fill="solid" :disabled="isResting" @click="onSubmit">
            Отдохнуть
          </IonButton>
        </div>
      </div>
    </div>
  </ion-modal>
</template>

<style scoped>
.rest {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 220px;
  padding: 16px;
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
  min-height: 180px;
  justify-content: center;
}

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

ion-modal {
  --border-radius: 10px;
  --height: auto;
  --width: 90%;
  --background: var(--ion-color-dark);
}

@media (min-width: 1024px) {
  .rest {
    min-height: 260px;
    padding: 20px;
  }

  ion-modal.desktop-modal {
    --width: min(520px, 88vw);
    --height: auto;
    --max-height: 86vh;
    --border-radius: 14px;
  }
}
</style>
