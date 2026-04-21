<script setup lang="ts">
import {IonButton, IonContent, IonInput, IonPage, IonSpinner, toastController, useIonRouter} from "@ionic/vue";
import {TEXTS} from "@/config/localisations";
import {computed, onBeforeMount, ref} from "vue";
import axios, {isAxiosError} from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {persistAuthTokens} from "@/utils/authTokens";

type Stage =
  | "welcome"
  | "loginEmail"
  | "loginPassword"
  | "registerEmail"
  | "registerCode"
  | "registerUsername"
  | "registerPassword"
  | "registerConfirm";

const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFICATION_CODE_REGEXP = /^\d{6}$/;
const MIN_PASSWORD_LENGTH = 8;
const FLIP_HALF_MS = 220;

const ionRouter = useIonRouter();

// UI state
const stage = ref<Stage>("welcome");
const isFlipping = ref(false);
const flipTurns = ref(0);
const stageInput = ref("");
const errors = ref<string[]>([]);

// Flow data state
const loginEmail = ref("");
const loginPassword = ref("");
const registerEmail = ref("");
const registerCode = ref("");
const registerUsername = ref("");
const registerPassword = ref("");
const registerConfirm = ref("");

// Loading state
const loginLoading = ref(false);
const registerLoading = ref(false);
const sendRegisterCodeLoading = ref(false);

const STAGE_LABELS: Record<Stage, string> = {
  welcome: "Добро пожаловать!",
  loginEmail: TEXTS.enterEmail.rus,
  loginPassword: TEXTS.enterPassword.rus,
  registerEmail: TEXTS.enterEmail.rus,
  registerCode: TEXTS.enterVerificationCode.rus,
  registerUsername: TEXTS.enterUsername.rus,
  registerPassword: TEXTS.enterPassword.rus,
  registerConfirm: TEXTS.enterPasswordAlready.rus,
};

const STAGE_PLACEHOLDERS: Record<Stage, string> = {
  welcome: "",
  loginEmail: TEXTS.email.rus,
  loginPassword: TEXTS.password.rus,
  registerEmail: TEXTS.email.rus,
  registerCode: TEXTS.verificationCodePlaceholder.rus,
  registerUsername: TEXTS.username.rus,
  registerPassword: TEXTS.password.rus,
  registerConfirm: TEXTS.password.rus,
};

const STAGE_PRIMARY_LABELS: Record<Stage, string> = {
  welcome: TEXTS.login.rus,
  loginEmail: TEXTS.next.rus,
  loginPassword: TEXTS.login.rus,
  registerEmail: TEXTS.sendVerificationCode.rus,
  registerCode: TEXTS.next.rus,
  registerUsername: TEXTS.next.rus,
  registerPassword: TEXTS.next.rus,
  registerConfirm: TEXTS.register.rus,
};

const isWelcomeStage = computed(() => stage.value === "welcome");
const isLoginEmailStage = computed(() => stage.value === "loginEmail");
const isLoginPasswordStage = computed(() => stage.value === "loginPassword");
const isRegisterEmailStage = computed(() => stage.value === "registerEmail");
const isRegisterCodeStage = computed(() => stage.value === "registerCode");
const isRegisterUsernameStage = computed(() => stage.value === "registerUsername");
const isRegisterPasswordStage = computed(() => stage.value === "registerPassword");
const isRegisterConfirmStage = computed(() => stage.value === "registerConfirm");
const isBusy = computed(
  () => loginLoading.value || registerLoading.value || sendRegisterCodeLoading.value
);
const stageLabel = computed(() => STAGE_LABELS[stage.value]);
const stagePlaceholder = computed(() => STAGE_PLACEHOLDERS[stage.value]);
const primaryLabel = computed(() => STAGE_PRIMARY_LABELS[stage.value]);
const stageInputType = computed(() => {
  if (isLoginPasswordStage.value || isRegisterPasswordStage.value || isRegisterConfirmStage.value) {
    return "password";
  }
  return "text";
});
const stageInputMode = computed(() => (isRegisterCodeStage.value ? "numeric" : undefined));
const stageInputMaxLength = computed(() => (isRegisterCodeStage.value ? 6 : undefined));
const stageClearInput = computed(() => stageInputType.value !== "password");

const setupRooms = async () => {
  try {
    const http = createHttpClient({
      "Authorization": "Bearer " + localStorage.getItem("accessToken")
    });

    const res = await http.get(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.rooms);

    if (res.status === 200) {
      ionRouter.replace('/rooms');
    }
  } catch (error) {
    console.debug("No auth:", error);
  }
}

onBeforeMount(() => {
  setupRooms()
})

function createHttpClient(extraHeaders: Record<string, string> = {}) {
  return axios.create({
    baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
    headers: {
      "Content-type": "application/json",
      ...extraHeaders
    },
  });
}

function getApiErrorMessage(error: unknown): string {
  if (
    isAxiosError(error) &&
    typeof error.response?.data === "object" &&
    error.response?.data &&
    typeof (error.response.data as Record<string, unknown>).message === "string"
  ) {
    return String((error.response.data as Record<string, unknown>).message);
  }
  return TEXTS.internalError.rus;
}

function getInputForStage(nextStage: Stage): string {
  switch (nextStage) {
    case "loginEmail":
      return loginEmail.value;
    case "loginPassword":
      return loginPassword.value;
    case "registerEmail":
      return registerEmail.value;
    case "registerCode":
      return registerCode.value;
    case "registerUsername":
      return registerUsername.value;
    case "registerPassword":
      return registerPassword.value;
    case "registerConfirm":
      return registerConfirm.value;
    default:
      return "";
  }
}

async function flipTo(nextStage: Stage) {
  if (isFlipping.value) return;
  isFlipping.value = true;
  flipTurns.value += 1;
  await new Promise((resolve) => setTimeout(resolve, FLIP_HALF_MS));
  stage.value = nextStage;
  stageInput.value = getInputForStage(nextStage);
  await new Promise((resolve) => setTimeout(resolve, FLIP_HALF_MS));
  isFlipping.value = false;
}

async function startLoginFlow() {
  errors.value = [];
  stageInput.value = loginEmail.value;
  await flipTo("loginEmail");
}

async function startRegisterFlow() {
  errors.value = [];
  stageInput.value = registerEmail.value;
  await flipTo("registerEmail");
}

async function goBackStage() {
  errors.value = [];
  switch (stage.value) {
    case "loginPassword":
      await flipTo("loginEmail");
      return;
    case "loginEmail":
      stageInput.value = "";
      await flipTo("welcome");
      return;
    case "registerConfirm":
      await flipTo("registerPassword");
      return;
    case "registerPassword":
      await flipTo("registerUsername");
      return;
    case "registerUsername":
      await flipTo("registerCode");
      return;
    case "registerCode":
      await flipTo("registerEmail");
      return;
    case "registerEmail":
      stageInput.value = "";
      await flipTo("welcome");
      return;
    default:
      return;
  }
}

function validateCurrentStage(): boolean {
  errors.value = [];
  const value = String(stageInput.value ?? "").trim();

  if (!value) {
    errors.value = [TEXTS.fieldCantBeEmpty.rus];
    return false;
  }

  if ((isLoginEmailStage.value || isRegisterEmailStage.value) && !EMAIL_REGEXP.test(value)) {
    errors.value = [TEXTS.invalidEmail.rus];
    return false;
  }

  if (isRegisterCodeStage.value && !VERIFICATION_CODE_REGEXP.test(value)) {
    errors.value = [TEXTS.verificationCodeInvalidFormat.rus];
    return false;
  }

  if ((isRegisterPasswordStage.value || isLoginPasswordStage.value) && value.length < MIN_PASSWORD_LENGTH) {
    errors.value = [TEXTS.passwordTooShort.rus];
    return false;
  }

  if (isRegisterConfirmStage.value && value !== registerPassword.value) {
    errors.value = [TEXTS.passwordsDoNotMatch.rus];
    return false;
  }

  return true;
}

async function submitStage() {
  if (!validateCurrentStage()) return;

  switch (stage.value) {
    case "loginEmail":
      loginEmail.value = stageInput.value.trim();
      stageInput.value = loginPassword.value;
      await flipTo("loginPassword");
      return;
    case "loginPassword":
      loginPassword.value = stageInput.value;
      await login();
      return;
    case "registerEmail":
      registerEmail.value = stageInput.value.trim();
      await sendRegistrationVerificationCode();
      return;
    case "registerCode":
      registerCode.value = stageInput.value.trim();
      await flipTo("registerUsername");
      return;
    case "registerUsername":
      registerUsername.value = stageInput.value.trim();
      await flipTo("registerPassword");
      return;
    case "registerPassword":
      registerPassword.value = stageInput.value;
      await flipTo("registerConfirm");
      return;
    case "registerConfirm":
      registerConfirm.value = stageInput.value;
      await register();
      return;
    default:
      return;
  }
}

async function login() {
  loginLoading.value = true;
  try {
    const http = createHttpClient({
      "Access-Control-Allow-Origin": "*",
    });

    const res = await http.post(GATEWAY_INTEGRATION_ROUTES.auth, {
      email: loginEmail.value.trim(),
      password: loginPassword.value,
    });

    if (res.status >= 200 && res.status < 300) {
      persistAuthTokens(res.data.accessToken, res.data.refreshToken);
      await ionRouter.replace("/rooms");
    }
  } catch (error: unknown) {
    const isInvalidPassword =
      isAxiosError(error) &&
      ([401, 403, 406].includes(error.response?.status ?? 0) ||
        ["INVALID_PASSWORD", "INVALID_CREDENTIALS"].includes(String(error.response?.data?.code)));

    const toast = await toastController.create({
      message: isInvalidPassword ? TEXTS.invalidPassword.rus : TEXTS.internalError.rus,
      duration: 1600,
      position: "top"
    });
    await toast.present();
  } finally {
    loginLoading.value = false;
  }
}

async function sendRegistrationVerificationCode() {
  sendRegisterCodeLoading.value = true;
  try {
    const http = createHttpClient();
    await http.post(GATEWAY_INTEGRATION_ROUTES.registrationSendVerificationCode, {
      email: registerEmail.value.trim(),
    });
    stageInput.value = registerCode.value;
    await flipTo("registerCode");
  } catch (error: unknown) {
    const message = getApiErrorMessage(error);

    const toast = await toastController.create({
      message,
      duration: 2200,
      position: "top"
    });
    await toast.present();
  } finally {
    sendRegisterCodeLoading.value = false;
  }
}

async function register() {
  registerLoading.value = true;
  try {
    const http = createHttpClient();
    const res = await http.post(GATEWAY_INTEGRATION_ROUTES.registration, {
      email: registerEmail.value.trim(),
      verificationCode: registerCode.value.trim(),
      username: registerUsername.value.trim(),
      password: registerPassword.value,
      matchingPassword: registerConfirm.value,
    });

    if (res.status >= 200 && res.status < 300) {
      persistAuthTokens(res.data.accessToken, res.data.refreshToken);
      await ionRouter.replace("/rooms");
    }
  } catch (error: unknown) {
    const message = getApiErrorMessage(error);
    const toast = await toastController.create({
      message,
      duration: 2400,
      position: "top"
    });
    await toast.present();
  } finally {
    registerLoading.value = false;
  }
}
</script>

<template>
  <ion-page>
    <ion-content :fullscreen="true" class="welcome-content" :scroll-y="false">
      <div class="wrapper">
        <div class="glow glow-top"></div>
        <div class="glow glow-mid"></div>
        <div class="glow glow-bottom"></div>
        <div
          class="card-shell"
          :style="{ transform: `rotateY(${flipTurns * 180}deg)` }"
        >
          <div class="welcome-card">
            <div class="card-content" :style="{ transform: `rotateY(${-flipTurns * 180}deg)` }">
              <template v-if="isFlipping">
                <div class="skeleton-line skeleton-eyebrow"></div>
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-subtitle"></div>
                <div class="button-block">
                  <div class="skeleton-line skeleton-input"></div>
                  <div class="skeleton-line skeleton-button"></div>
                  <div class="skeleton-line skeleton-link"></div>
                </div>
              </template>
              <template v-else>
                <p class="eyebrow">Project-D</p>
                <h1 class="title">{{ stageLabel }}</h1>
                <p v-if="isWelcomeStage" class="subtitle">
                  Современное приложение для управления персонажами и комнатами в настольных ролевых играх.
                </p>

                <div class="button-block" v-if="isWelcomeStage">
                  <ion-button
                    shape="round"
                    class="button-list-element"
                    color="primary"
                    @click="startLoginFlow"
                  >
                    {{ TEXTS.login.rus }}
                  </ion-button>
                  <ion-button
                    shape="round"
                    class="button-list-element"
                    color="primary"
                    @click="startRegisterFlow"
                  >
                    {{ TEXTS.register.rus }}
                  </ion-button>
                </div>

                <div class="button-block" v-else>
                  <ion-input
                    v-model="stageInput"
                    class="auth-input"
                    fill="outline"
                    color="primary"
                    :type="stageInputType"
                    :inputmode="stageInputMode"
                    :maxlength="stageInputMaxLength"
                    :placeholder="stagePlaceholder"
                    :clear-input="stageClearInput"
                    :disabled="isBusy"
                  />
                  <div class="alerts" v-if="errors.length > 0">
                    <p v-for="(error, index) in errors" :key="index" class="error-text">{{ error }}</p>
                  </div>
                  <ion-button
                    shape="round"
                    class="button-list-element"
                    color="primary"
                    :disabled="isBusy"
                    @click="submitStage"
                  >
                    <ion-spinner v-if="isBusy" name="crescent" />
                    <template v-else>{{ primaryLabel }}</template>
                  </ion-button>
                  <ion-button fill="clear" color="primary" @click="goBackStage">
                    Назад
                  </ion-button>
                  <ion-button
                    v-if="isLoginEmailStage"
                    fill="clear"
                    color="primary"
                    @click="ionRouter.navigate('/welcome/forgot-password', 'forward', 'push')"
                  >
                    {{ TEXTS.forgotPassword.rus }}
                  </ion-button>
                </div>

                <p v-if="isRegisterCodeStage" class="subtitle subtitle-tight">
                  {{ TEXTS.verificationCodeSentHint.rus }}
                </p>
              </template>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.welcome-content {
  --background: radial-gradient(circle at 14% 16%, rgba(var(--ion-color-primary-rgb), 0.22), transparent 48%),
    radial-gradient(circle at 86% 4%, rgba(var(--ion-color-tertiary-rgb), 0.18), transparent 52%),
    linear-gradient(165deg, var(--ion-color-dark) 0%, var(--ion-color-medium-shade) 58%, var(--ion-color-medium) 100%);
}

.wrapper {
  width: 100%;
  min-height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 32px 20px;
  box-sizing: border-box;
}

.glow {
  position: absolute;
  width: 340px;
  height: 340px;
  border-radius: 50%;
  filter: blur(58px);
  opacity: 0.34;
  pointer-events: none;
}

.glow-top {
  top: -80px;
  right: -40px;
  background: rgba(var(--ion-color-primary-rgb), 0.75);
  animation: float-glow-top 16s ease-in-out infinite alternate;
}

.glow-mid {
  top: 28%;
  left: 18%;
  width: 260px;
  height: 260px;
  background: rgba(var(--ion-color-secondary-rgb), 0.38);
  animation: float-glow-mid 18s ease-in-out infinite;
}

.glow-bottom {
  bottom: -120px;
  left: -60px;
  background: rgba(var(--ion-color-tertiary-rgb), 0.55);
  animation: float-glow-bottom 20s ease-in-out infinite alternate;
}

.welcome-card {
  width: min(520px, 100%);
  padding: 28px;
  border-radius: 24px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.14);
  background: linear-gradient(145deg, rgba(var(--ion-color-light-rgb), 0.12), rgba(var(--ion-color-light-rgb), 0.03));
  backdrop-filter: blur(14px);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.card-shell {
  width: min(520px, 100%);
  transition: transform 440ms cubic-bezier(.2, .65, .2, 1);
  transform-style: preserve-3d;
}

.card-content {
  transform-style: preserve-3d;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--ion-color-light-rgb), 0.68);
}

.title {
  margin: 14px 0 10px;
  font-size: clamp(26px, 5vw, 36px);
  line-height: 1.16;
  font-weight: 700;
}

.subtitle {
  margin: 0;
  color: rgba(var(--ion-color-light-rgb), 0.82);
  font-size: 14px;
  line-height: 1.55;
}

.subtitle-tight {
  margin-top: 12px;
}

.button-block {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.button-list-element {
  width: 100%;
  min-height: 46px;
  font-weight: 600;
  --border-radius: 14px;
}

.auth-input {
  --border-radius: 12px;
  --background: rgba(var(--ion-color-dark-rgb), 0.45);
  --padding-top: 13px;
  --padding-bottom: 13px;
}

.alerts {
  margin-top: 8px;
}

.error-text {
  margin: 0;
  font-size: 13px;
  color: var(--ion-color-danger);
}

.skeleton-line {
  border-radius: 12px;
  background: linear-gradient(
    100deg,
    rgba(var(--ion-color-light-rgb), 0.08) 20%,
    rgba(var(--ion-color-light-rgb), 0.18) 35%,
    rgba(var(--ion-color-light-rgb), 0.08) 50%
  );
  background-size: 220% 100%;
  animation: skeleton-shimmer 1s linear infinite;
}

.skeleton-eyebrow {
  width: 94px;
  height: 12px;
}

.skeleton-title {
  width: 68%;
  height: 34px;
  margin-top: 16px;
}

.skeleton-subtitle {
  width: 92%;
  height: 16px;
  margin-top: 12px;
}

.skeleton-input {
  width: 100%;
  height: 48px;
}

.skeleton-button {
  width: 100%;
  height: 46px;
}

.skeleton-link {
  width: 84px;
  height: 18px;
  align-self: center;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -20% 0;
  }
}

@keyframes float-glow-top {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translate3d(-18px, 16px, 0) scale(1.08);
    opacity: 0.4;
  }
  100% {
    transform: translate3d(14px, 34px, 0) scale(0.96);
    opacity: 0.28;
  }
}

@keyframes float-glow-mid {
  0% {
    transform: translate3d(0, 0, 0) scale(0.95);
    opacity: 0.2;
  }
  40% {
    transform: translate3d(20px, -12px, 0) scale(1.04);
    opacity: 0.3;
  }
  70% {
    transform: translate3d(-14px, 20px, 0) scale(1);
    opacity: 0.24;
  }
  100% {
    transform: translate3d(8px, -10px, 0) scale(1.07);
    opacity: 0.32;
  }
}

@keyframes float-glow-bottom {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.28;
  }
  50% {
    transform: translate3d(24px, -18px, 0) scale(1.1);
    opacity: 0.36;
  }
  100% {
    transform: translate3d(-12px, -36px, 0) scale(0.94);
    opacity: 0.24;
  }
}

@media (min-width: 768px) {
  .welcome-card {
    padding: 34px;
  }

  .button-block {
    margin-top: 34px;
  }
}

</style>
