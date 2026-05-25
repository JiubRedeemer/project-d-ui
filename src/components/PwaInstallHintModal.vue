<script setup lang="ts">
import { IonButton, IonModal } from "@ionic/vue";
import { computed, ref, watch } from "vue";
import { TEXTS } from "@/config/localisations";
import {
  canShowNativeInstallButton,
  getPwaInstallPlatform,
  triggerPwaInstall,
  type PwaInstallPlatform,
} from "@/utils/pwaInstall";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "dismiss"): void;
}>();

const platform = ref<PwaInstallPlatform>(getPwaInstallPlatform());
const showInstallButton = ref(canShowNativeInstallButton());
const isInstalling = ref(false);

const t = TEXTS.pwaInstallHint;

const platformSteps = computed(() => {
  const p = platform.value;
  if (p === "ios") {
    return t.iosSteps.rus;
  }
  if (p === "android") {
    return showInstallButton.value ? t.androidStepsWithInstallButton.rus : t.androidSteps.rus;
  }
  if (p === "desktop") {
    return t.desktopSteps.rus;
  }
  return t.unknownSteps.rus;
});

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      platform.value = getPwaInstallPlatform();
      showInstallButton.value = canShowNativeInstallButton();
    }
  }
);

function onDidDismiss() {
  emit("close");
}

function close() {
  emit("close");
}

function dismissForever() {
  emit("dismiss");
}

async function onInstallClick() {
  if (isInstalling.value) {
    return;
  }
  isInstalling.value = true;
  try {
    await triggerPwaInstall();
    showInstallButton.value = canShowNativeInstallButton();
  } finally {
    isInstalling.value = false;
  }
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="onDidDismiss"
    :initial-breakpoint="1"
    :breakpoints="[0, 0.65, 1]"
    class="pwa-hint-modal"
  >
    <div class="pwa-hint">
      <h2 class="pwa-hint__title">{{ t.title.rus }}</h2>
      <p class="pwa-hint__benefits">{{ t.benefits.rus }}</p>
      <p class="pwa-hint__steps-label">Как установить:</p>
      <p class="pwa-hint__steps">{{ platformSteps }}</p>

      <ion-button
        v-if="showInstallButton"
        expand="block"
        shape="round"
        color="primary"
        class="pwa-hint__install-btn"
        :disabled="isInstalling"
        @click="onInstallClick"
      >
        {{ t.installButton.rus }}
      </ion-button>

      <div class="pwa-hint__actions">
        <ion-button fill="outline" color="medium" shape="round" @click="close">
          {{ t.gotIt.rus }}
        </ion-button>
        <ion-button fill="clear" color="light" shape="round" @click="dismissForever">
          {{ t.dontShowAgain.rus }}
        </ion-button>
      </div>
    </div>
  </ion-modal>
</template>

<style scoped>
.pwa-hint {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 18px 24px;
  min-height: 280px;
}

.pwa-hint__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ion-color-light);
  line-height: 1.3;
}

.pwa-hint__benefits {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: rgba(var(--ion-color-light-rgb), 0.88);
}

.pwa-hint__steps-label {
  margin: 4px 0 0;
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(var(--ion-color-primary-rgb), 0.95);
}

.pwa-hint__steps {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: rgba(var(--ion-color-light-rgb), 0.9);
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.14);
  background: linear-gradient(
    150deg,
    rgba(var(--ion-color-light-rgb), 0.08),
    rgba(var(--ion-color-light-rgb), 0.03)
  );
}

.pwa-hint__install-btn {
  margin-top: 4px;
}

.pwa-hint__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}

ion-modal.pwa-hint-modal {
  --border-radius: 14px;
  --height: auto;
  --width: min(92%, 420px);
  --background: var(--ion-color-dark);
}
</style>
