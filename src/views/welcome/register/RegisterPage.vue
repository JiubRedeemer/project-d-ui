<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonPage,
  IonToolbar,
  toastController,
  useIonRouter
} from "@ionic/vue";

import {TEXTS} from "@/config/localisations";
import {computed, onMounted, ref, watch} from "vue";
import {useRoute} from "vue-router";
import 'swiper/css';
import '@ionic/vue/css/ionic-swiper.css';
import {arrowBack} from "ionicons/icons";
import axios, {isAxiosError} from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

const ROOM_INVITE_TOKEN_STORAGE = "roomInviteToken";

const ionRouter = useIonRouter();
const route = useRoute();

const roomInviteToken = ref<string | null>(null);

const hasRoomInvite = computed(() => Boolean(roomInviteToken.value));

const step = ref(0);
const sendingCode = ref(false);

const inputValue = ref("");
const email = ref("");
const verificationCode = ref("");
const username = ref("");
const password = ref("");
const matchingPassword = ref("");

const errors = ref<{ color: string; text: string }[]>([]);

const maxStepIndex = computed(() => (hasRoomInvite.value ? 3 : 4));

const isPasswordStep = computed(() => {
  const s = step.value;
  if (hasRoomInvite.value) return s === 2 || s === 3;
  return s === 3 || s === 4;
});

const showVerificationSentHint = computed(
  () => !hasRoomInvite.value && step.value === 1
);

const primaryButtonLabel = computed(() => {
  if (step.value === maxStepIndex.value) return TEXTS.register.rus;
  if (!hasRoomInvite.value && step.value === 0) return TEXTS.sendVerificationCode.rus;
  return TEXTS.next.rus;
});

const currentPlaceholder = computed(() => {
  if (hasRoomInvite.value) {
    switch (step.value) {
      case 0:
        return TEXTS.email.rus;
      case 1:
        return TEXTS.username.rus;
      case 2:
      case 3:
        return TEXTS.password.rus;
      default:
        return "";
    }
  }
  switch (step.value) {
    case 0:
      return TEXTS.email.rus;
    case 1:
      return TEXTS.verificationCodePlaceholder.rus;
    case 2:
      return TEXTS.username.rus;
    case 3:
    case 4:
      return TEXTS.password.rus;
    default:
      return "";
  }
});

const currentLabel = computed(() => {
  if (hasRoomInvite.value) {
    switch (step.value) {
      case 0:
        return TEXTS.enterEmail.rus;
      case 1:
        return TEXTS.enterUsername.rus;
      case 2:
        return TEXTS.enterPassword.rus;
      case 3:
        return TEXTS.enterPasswordAlready.rus;
      default:
        return "";
    }
  }
  switch (step.value) {
    case 0:
      return TEXTS.enterEmail.rus;
    case 1:
      return TEXTS.enterVerificationCode.rus;
    case 2:
      return TEXTS.enterUsername.rus;
    case 3:
      return TEXTS.enterPassword.rus;
    case 4:
      return TEXTS.enterPasswordAlready.rus;
    default:
      return "";
  }
});

function pickQueryToken(q: unknown): string | undefined {
  if (q == null) return undefined;
  const s = Array.isArray(q) ? q[0] : String(q);
  return s ? s : undefined;
}

function decodeTokenParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function readTokenFromLocationSearch(): string | undefined {
  const params = new URLSearchParams(window.location.search);
  const v = params.get("roomInviteToken");
  return v ? decodeTokenParam(v) : undefined;
}

function syncRoomInviteTokenFromRoute(): void {
  const fromRoute = pickQueryToken(route.query.roomInviteToken);
  const fromUrl =
    (fromRoute ? decodeTokenParam(fromRoute) : undefined) ??
    readTokenFromLocationSearch();

  if (fromUrl) {
    roomInviteToken.value = fromUrl;
    sessionStorage.setItem(ROOM_INVITE_TOKEN_STORAGE, fromUrl);
    return;
  }

  const stored = sessionStorage.getItem(ROOM_INVITE_TOKEN_STORAGE);
  if (stored) {
    roomInviteToken.value = stored;
  }
}

function parseRegistrationErrorBody(data: unknown): string {
  if (data == null) return TEXTS.internalError.rus;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.trim()) return o.message;
    if (typeof o.error === "string" && o.error.trim()) return o.error;
    if (typeof o.code === "string" && o.code.trim()) return o.code;
  }
  return TEXTS.internalError.rus;
}

function getErrorResponseCode(data: unknown): string | undefined {
  if (typeof data === "object" && data !== null) {
    const c = (data as Record<string, unknown>).code;
    if (typeof c === "string" && c.trim()) return c;
  }
  return undefined;
}

function formatSendCodeError(data: unknown): string {
  const message = parseRegistrationErrorBody(data);
  const code = getErrorResponseCode(data);
  if (code === "VERIFICATION_CODE_COOLDOWN") {
    return `${message} ${TEXTS.verificationCooldownHint.rus}`;
  }
  return message;
}

function createAuthHttp() {
  return axios.create({
    baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
    headers: {
      "Content-type": "application/json",
    },
  });
}

async function handleAxiosRegistrationError(error: unknown): Promise<void> {
  if (!isAxiosError(error)) {
    await showInternalErrorToast();
    return;
  }
  const status = error.response?.status;
  const data = error.response?.data;
  if (status === 400) {
    await showMessageToast(parseRegistrationErrorBody(data), 4000);
  } else if (status === 406) {
    await showMessageToast(parseRegistrationErrorBody(data), 3500);
  } else {
    await showInternalErrorToast();
  }
}

async function trySendVerificationCode(): Promise<void> {
  if (sendingCode.value) return;
  sendingCode.value = true;
  try {
    const http = createAuthHttp();
    await http.post(GATEWAY_INTEGRATION_ROUTES.registrationSendVerificationCode, {
      email: inputValue.value.trim(),
    });
    email.value = inputValue.value.trim();
    inputValue.value = "";
    step.value++;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      await showMessageToast(
        formatSendCodeError(data),
        status === 406 || status === 400 ? 4000 : 4500
      );
    } else {
      await showInternalErrorToast();
    }
    console.error("Send verification code failed:", error);
  } finally {
    sendingCode.value = false;
  }
}

function validate() {
  errors.value = [];
  const raw = String(inputValue.value ?? "").trim();
  if (!raw) {
    errors.value.push({
      color: "danger",
      text: TEXTS.fieldCantBeEmpty.rus,
    });
    return;
  }
  if (!hasRoomInvite.value && step.value === 1 && !/^\d{6}$/.test(raw)) {
    errors.value.push({
      color: "danger",
      text: TEXTS.verificationCodeInvalidFormat.rus,
    });
  }
}

async function nextStep() {
  validate();
  if (errors.value.length > 0) return;

  if (!hasRoomInvite.value && step.value === 0) {
    await trySendVerificationCode();
    return;
  }

  const last = maxStepIndex.value;

  if (hasRoomInvite.value) {
    switch (step.value) {
      case 0:
        email.value = inputValue.value.trim();
        break;
      case 1:
        username.value = inputValue.value;
        break;
      case 2:
        password.value = inputValue.value;
        break;
      case 3:
        matchingPassword.value = inputValue.value;
        if (await register()) {
          inputValue.value = "";
        }
        return;
      default:
        return;
    }
  } else {
    switch (step.value) {
      case 1:
        verificationCode.value = inputValue.value.trim();
        break;
      case 2:
        username.value = inputValue.value;
        break;
      case 3:
        password.value = inputValue.value;
        break;
      case 4:
        matchingPassword.value = inputValue.value;
        if (await register()) {
          inputValue.value = "";
        }
        return;
      default:
        return;
    }
  }

  inputValue.value = "";
  if (step.value < last) step.value++;
}

function previousStep() {
  if (step.value <= 0) return;
  step.value--;

  if (hasRoomInvite.value) {
    switch (step.value) {
      case 0:
        inputValue.value = email.value;
        break;
      case 1:
        inputValue.value = username.value;
        break;
      case 2:
        inputValue.value = password.value;
        break;
      default:
        inputValue.value = "";
    }
  } else {
    switch (step.value) {
      case 0:
        inputValue.value = email.value;
        break;
      case 1:
        inputValue.value = verificationCode.value;
        break;
      case 2:
        inputValue.value = username.value;
        break;
      case 3:
        inputValue.value = password.value;
        break;
      default:
        inputValue.value = "";
    }
  }
}

const register = async (): Promise<boolean> => {
  try {
    const http = createAuthHttp();

    const body: Record<string, string> = {
      username: username.value,
      email: email.value,
      password: password.value,
      matchingPassword: matchingPassword.value,
    };
    if (roomInviteToken.value) {
      body.roomInviteToken = roomInviteToken.value;
    } else {
      body.verificationCode = verificationCode.value;
    }

    const res = await http.post(GATEWAY_INTEGRATION_ROUTES.registration, body);

    if (res.status === 200) {
      localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("refreshToken", res.data.refreshToken);
      sessionStorage.setItem("accessToken", res.data.accessToken);
      sessionStorage.setItem("refreshToken", res.data.refreshToken);

      sessionStorage.removeItem(ROOM_INVITE_TOKEN_STORAGE);
      roomInviteToken.value = null;

      if (body.roomInviteToken) {
        const toast = await toastController.create({
          message: TEXTS.registrationCompleteAddedToRoom.rus,
          duration: 2800,
          position: "top",
        });
        await toast.present();
      }

      ionRouter.navigate("/rooms", "forward", "replace");
      return true;
    }
  } catch (error: unknown) {
    await handleAxiosRegistrationError(error);
    console.error("Registration failed:", error);
  }
  return false;
};

async function showMessageToast(message: string, duration: number) {
  const toast = await toastController.create({
    message,
    duration,
    position: "top",
  });
  await toast.present();
}

async function showInternalErrorToast() {
  const toast = await toastController.create({
    message: TEXTS.internalError.rus,
    duration: 1500,
    position: "top",
  });
  await toast.present();
}

onMounted(() => {
  syncRoomInviteTokenFromRoute();
});

watch(
  () => route.query.roomInviteToken,
  () => {
    syncRoomInviteTokenFromRoute();
  }
);
</script>

<template>
  <ion-page>
    <ion-content class="ion-padding" color="dark">
      <ion-header>
        <ion-toolbar style="--background: transparent">
          <ion-buttons slot="start">
            <ion-back-button v-show="step === 0"></ion-back-button>
            <ion-button v-show="step !== 0" size="small" @click="previousStep">
              <ion-icon slot="icon-only" :icon="arrowBack"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <div class="wrapper">
        <div class="input-block">
          <p v-if="hasRoomInvite" class="invite-hint">{{ TEXTS.roomInviteRegisterHint.rus }}</p>
          <p v-if="showVerificationSentHint" class="invite-hint">{{ TEXTS.verificationCodeSentHint.rus }}</p>
          <h1 class="input-header">{{ currentLabel }}</h1>
          <div class="button-block">
            <ion-input
                :key="(hasRoomInvite ? 'inv' : 'std') + '-' + step"
                :type="isPasswordStep ? 'password' : 'text'"
                :inputmode="!hasRoomInvite && step === 1 ? 'numeric' : undefined"
                :maxlength="!hasRoomInvite && step === 1 ? 6 : undefined"
                fill="outline"
                color="primary"
                :placeholder="currentPlaceholder"
                :clear-input="true"
                v-model="inputValue"
            ></ion-input>
            <div class="alerts" v-if="errors.length > 0">
              <ion-chip :color="error.color" v-for="(error, index) in errors" :key="index">
                {{ error.text }}
              </ion-chip>
            </div>
            <ion-button
                shape="round"
                class="button-list-element"
                color="primary"
                :disabled="sendingCode"
                @click="nextStep"
            >
              {{ primaryButtonLabel }}
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-back-button {
  display: block;
}

.wrapper {
  background: black;
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  align-content: center;
  flex-direction: column;
  justify-content: center;
  overflow: auto;
}

.input-block {
  margin-top: -100%;
  width: 80%;
}

.invite-hint {
  font-size: 13px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.75);
  text-align: center;
  margin: 0 0 16px;
  max-width: 100%;
}

.input-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30%;
  font-size: 16px;
}


.button-list-element {
  width: 100%;
  height: 20%;
  min-width: fit-content;
  margin-top: 30px;
}

@media (min-width: 768px) {
  .wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-direction: row;
  }

  .input-block {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 80%;
    margin-top: 0;
  }

  .input-header {
    width: 45%;
    margin-bottom: 0;
    text-align: left;
  }

  .button-block {
    display: flex;
    flex-direction: column;
    width: 45%;
    border-left: 1px solid white;
    padding-left: 10%;
  }

  .button-list-element {
    width: 100%;
    height: auto;
    margin-top: 20px;
  }
}
</style>
