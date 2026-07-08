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
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  toastController,
  useIonRouter
} from "@ionic/vue";
import {computed, onBeforeUnmount, onMounted, ref} from "vue";
import {AxiosError, isAxiosError} from "axios";
import {
  closeOutline,
  diamondOutline,
  layersOutline,
  keyOutline,
  logOutOutline,
  mailOpenOutline,
  mailOutline,
  personOutline,
  shieldCheckmarkOutline,
  starOutline,
} from "ionicons/icons";

import {TEXTS} from "@/config/localisations";
import {changeEmail, getCurrentUserInfo, resetPassword, sendChangeEmailCode, sendPasswordResetCode} from "@/api/authApi";
import {clearAuthTokens} from "@/utils/authTokens";
import {mapPasswordResetErrorCodeToMessage} from "@/utils/passwordResetErrorMapper";
import type {ApiError, UserInfoResponse} from "@/api/authApi.types";
import {useSubscriptionStore} from "@/stores/SubscriptionStore";
import {useCrystalsStore} from "@/stores/CrystalsStore";

const MIN_PASSWORD_LENGTH = 8;
const RESET_CODE_COOLDOWN_SECONDS = 60;
const VERIFICATION_CODE_REGEXP = /^\d{6}$/;

const ionRouter = useIonRouter();
const subscriptionStore = useSubscriptionStore();
const crystalsStore = useCrystalsStore();
const currentUserInfo = ref<UserInfoResponse | null>(null);

const TIER_LABELS: Record<string, string> = {
  FREE: "Бесплатно",
  PLAYER_PLUS: "Игрок+",
  MASTER: "Мастер",
};

const currentTierLabel = computed(
  () => TIER_LABELS[subscriptionStore.subscription?.tier ?? "FREE"] ?? "Бесплатно"
);

const isSecurityModalOpen = ref(false);
const isEmailModalOpen = ref(false);

const verificationCode = ref("");
const newPassword = ref("");
const matchingPassword = ref("");
const sendCodeLoading = ref(false);
const resetLoading = ref(false);
const codeSent = ref(false);
const cooldownSeconds = ref(0);
const errors = ref<string[]>([]);
let cooldownIntervalId: number | null = null;
let resendController: AbortController | null = null;

const newEmail = ref("");
const emailVerificationCode = ref("");
const currentPasswordForEmailChange = ref("");
const emailCodeSent = ref(false);
const emailSendCodeLoading = ref(false);
const emailChangeLoading = ref(false);
const emailCooldownSeconds = ref(0);
const emailErrors = ref<string[]>([]);
let emailCooldownIntervalId: number | null = null;
let emailResendController: AbortController | null = null;

const profileEmail = computed(() => currentUserInfo.value?.email ?? "-");
const profileUsername = computed(() => currentUserInfo.value?.username ?? "-");
const profileInitials = computed(() => {
  const username = (profileUsername.value === "-" ? "" : profileUsername.value).trim();
  const email = (profileEmail.value === "-" ? "" : profileEmail.value).trim();
  const source = username || email;
  if (!source) return "PD";
  return source
      .replace(/[^a-zA-Zа-яА-Я0-9 ]/g, " ")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "PD";
});
const loading = computed(() => sendCodeLoading.value || resetLoading.value);
const canResendCode = computed(() => cooldownSeconds.value === 0 && !sendCodeLoading.value);
const emailLoading = computed(() => emailSendCodeLoading.value || emailChangeLoading.value);
const canResendEmailCode = computed(() => emailCooldownSeconds.value === 0 && !emailSendCodeLoading.value);
const canSendChangeEmailCode = computed(() => validateEmailStep().length === 0);
const canSubmitChangeEmail = computed(() => validateChangeEmailForm().length === 0);

function normalizeErrorCode(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined;
  const responseCode = (error.response?.data as ApiError | undefined)?.code;
  if (typeof responseCode === "string" && responseCode.trim().length > 0) {
    return responseCode.trim();
  }
  return undefined;
}

function parseErrorMessage(error: unknown): string {
  const code = normalizeErrorCode(error);
  if (code) {
    return mapPasswordResetErrorCodeToMessage(code);
  }
  return TEXTS.internalError.rus;
}

function isTransientNetworkError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  if (error.code === AxiosError.ERR_NETWORK || error.code === AxiosError.ECONNABORTED) {
    return true;
  }
  return !error.response;
}

async function requestWithSingleRetry(requestFn: () => Promise<void>): Promise<void> {
  try {
    await requestFn();
  } catch (firstError) {
    if (!isTransientNetworkError(firstError)) throw firstError;
    await requestFn();
  }
}

function clearCooldownTimer() {
  if (cooldownIntervalId !== null) {
    window.clearInterval(cooldownIntervalId);
    cooldownIntervalId = null;
  }
}

function startCooldown(seconds: number) {
  clearCooldownTimer();
  cooldownSeconds.value = seconds;
  cooldownIntervalId = window.setInterval(() => {
    if (cooldownSeconds.value <= 1) {
      clearCooldownTimer();
      cooldownSeconds.value = 0;
      return;
    }
    cooldownSeconds.value -= 1;
  }, 1000);
}

function clearEmailCooldownTimer() {
  if (emailCooldownIntervalId !== null) {
    window.clearInterval(emailCooldownIntervalId);
    emailCooldownIntervalId = null;
  }
}

function startEmailCooldown(seconds: number) {
  clearEmailCooldownTimer();
  emailCooldownSeconds.value = seconds;
  emailCooldownIntervalId = window.setInterval(() => {
    if (emailCooldownSeconds.value <= 1) {
      clearEmailCooldownTimer();
      emailCooldownSeconds.value = 0;
      return;
    }
    emailCooldownSeconds.value -= 1;
  }, 1000);
}

function resetPasswordFlowState() {
  verificationCode.value = "";
  newPassword.value = "";
  matchingPassword.value = "";
  codeSent.value = false;
  errors.value = [];
  sendCodeLoading.value = false;
  resetLoading.value = false;
  clearCooldownTimer();
  cooldownSeconds.value = 0;
  resendController?.abort();
  resendController = null;
}

function resetEmailFlowState() {
  newEmail.value = "";
  emailVerificationCode.value = "";
  currentPasswordForEmailChange.value = "";
  emailCodeSent.value = false;
  emailErrors.value = [];
  emailSendCodeLoading.value = false;
  emailChangeLoading.value = false;
  clearEmailCooldownTimer();
  emailCooldownSeconds.value = 0;
  emailResendController?.abort();
  emailResendController = null;
}

function openSecurityModal() {
  resetPasswordFlowState();
  isSecurityModalOpen.value = true;
}

function closeSecurityModal() {
  isSecurityModalOpen.value = false;
  resetPasswordFlowState();
}

function openEmailModal() {
  resetEmailFlowState();
  isEmailModalOpen.value = true;
}

function closeEmailModal() {
  isEmailModalOpen.value = false;
  resetEmailFlowState();
}

function validatePasswordForm(): string[] {
  const currentErrors: string[] = [];
  if (!verificationCode.value.trim()) {
    currentErrors.push(TEXTS.fieldCantBeEmpty.rus);
  } else if (!VERIFICATION_CODE_REGEXP.test(verificationCode.value.trim())) {
    currentErrors.push(TEXTS.codeRequiredDigits.rus);
  }
  if (!newPassword.value) {
    currentErrors.push(TEXTS.fieldCantBeEmpty.rus);
  } else if (newPassword.value.length < MIN_PASSWORD_LENGTH) {
    currentErrors.push(TEXTS.passwordTooShort.rus);
  }
  if (!matchingPassword.value) {
    currentErrors.push(TEXTS.fieldCantBeEmpty.rus);
  } else if (matchingPassword.value !== newPassword.value) {
    currentErrors.push(TEXTS.passwordsDoNotMatch.rus);
  }
  return Array.from(new Set(currentErrors));
}

function validateEmailStep(): string[] {
  const currentErrors: string[] = [];
  const normalizedNewEmail = newEmail.value.trim().toLowerCase();
  const normalizedCurrentEmail = (currentUserInfo.value?.email ?? "").trim().toLowerCase();

  if (!normalizedNewEmail) {
    currentErrors.push(TEXTS.fieldCantBeEmpty.rus);
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedNewEmail)) {
    currentErrors.push(TEXTS.invalidEmail.rus);
  } else if (normalizedCurrentEmail && normalizedNewEmail === normalizedCurrentEmail) {
    currentErrors.push(TEXTS.emailMustDiffer.rus);
  }

  return Array.from(new Set(currentErrors));
}

function validateChangeEmailForm(): string[] {
  const currentErrors = validateEmailStep();

  if (!emailVerificationCode.value.trim()) {
    currentErrors.push(TEXTS.fieldCantBeEmpty.rus);
  } else if (!VERIFICATION_CODE_REGEXP.test(emailVerificationCode.value.trim())) {
    currentErrors.push(TEXTS.codeRequiredDigits.rus);
  }

  if (!currentPasswordForEmailChange.value.trim()) {
    currentErrors.push(TEXTS.fieldCantBeEmpty.rus);
  }

  return Array.from(new Set(currentErrors));
}

async function sendCode() {
  const email = currentUserInfo.value?.email?.trim();
  if (!email) {
    errors.value = ["Не удалось определить email текущего пользователя"];
    return;
  }
  if (codeSent.value && cooldownSeconds.value > 0) {
    return;
  }

  resendController?.abort();
  resendController = new AbortController();
  const signal = resendController.signal;

  sendCodeLoading.value = true;
  try {
    await requestWithSingleRetry(() => sendPasswordResetCode(email, signal));
    codeSent.value = true;
    errors.value = [];
    startCooldown(RESET_CODE_COOLDOWN_SECONDS);
  } catch (error) {
    if (isAxiosError(error) && error.code === AxiosError.ERR_CANCELED) {
      return;
    }
    errors.value = [parseErrorMessage(error)];
  } finally {
    sendCodeLoading.value = false;
  }
}

async function submitChangePassword() {
  errors.value = validatePasswordForm();
  if (errors.value.length > 0) return;

  const email = currentUserInfo.value?.email?.trim();
  if (!email) {
    errors.value = ["Не удалось определить email текущего пользователя"];
    return;
  }

  resetLoading.value = true;
  try {
    await requestWithSingleRetry(() =>
        resetPassword({
          email,
          verificationCode: verificationCode.value.trim(),
          password: newPassword.value,
          matchingPassword: matchingPassword.value
        })
    );
    closeSecurityModal();
    const toast = await toastController.create({
      message: TEXTS.passwordChangedSuccess.rus,
      duration: 1800,
      position: "top"
    });
    await toast.present();
  } catch (error) {
    errors.value = [parseErrorMessage(error)];
  } finally {
    resetLoading.value = false;
  }
}

async function sendChangeEmailVerificationCode() {
  emailErrors.value = validateEmailStep();
  if (emailErrors.value.length > 0) return;
  if (emailCodeSent.value && emailCooldownSeconds.value > 0) return;

  emailResendController?.abort();
  emailResendController = new AbortController();
  const signal = emailResendController.signal;

  emailSendCodeLoading.value = true;
  try {
    await requestWithSingleRetry(() => sendChangeEmailCode(newEmail.value.trim().toLowerCase(), signal));
    emailCodeSent.value = true;
    emailErrors.value = [];
    startEmailCooldown(RESET_CODE_COOLDOWN_SECONDS);
  } catch (error) {
    if (isAxiosError(error) && error.code === AxiosError.ERR_CANCELED) {
      return;
    }
    emailErrors.value = [parseErrorMessage(error)];
  } finally {
    emailSendCodeLoading.value = false;
  }
}

async function submitChangeEmail() {
  emailErrors.value = validateChangeEmailForm();
  if (emailErrors.value.length > 0) return;

  emailChangeLoading.value = true;
  try {
    await requestWithSingleRetry(() =>
      changeEmail({
        newEmail: newEmail.value.trim().toLowerCase(),
        verificationCode: emailVerificationCode.value.trim(),
        currentPassword: currentPasswordForEmailChange.value
      })
    );
    closeEmailModal();
    clearAuthTokens();
    const toast = await toastController.create({
      message: TEXTS.emailChangedReauth.rus,
      duration: 2400,
      position: "top"
    });
    await toast.present();
    ionRouter.replace({
      path: "/welcome/login/",
      query: {email: newEmail.value.trim().toLowerCase()}
    });
  } catch (error) {
    emailErrors.value = [parseErrorMessage(error)];
  } finally {
    emailChangeLoading.value = false;
  }
}

function logout() {
  closeSecurityModal();
  closeEmailModal();
  clearAuthTokens();
  ionRouter.replace("/welcome");
}

onBeforeUnmount(() => {
  resetPasswordFlowState();
  resetEmailFlowState();
});

onMounted(async () => {
  try {
    currentUserInfo.value = await getCurrentUserInfo();
  } catch {
    // keep placeholders when profile endpoint is unavailable
  }
  await Promise.all([subscriptionStore.load(), crystalsStore.load()]);
});
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button default-href="/rooms"/>
        </ion-buttons>
        <ion-title>{{ TEXTS.profile.rus }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="profile-content" color="dark">

      <div class="wrapper">
        <div class="profile-shell">
          <section class="hero-card">
            <div class="hero-avatar">{{ profileInitials }}</div>
            <div class="hero-copy">
              <p class="hero-label">Аккаунт</p>
              <h2 class="hero-title">{{ profileUsername }}</h2>
              <p class="hero-subtitle">{{ profileEmail }}</p>
            </div>
          </section>

          <ion-list lines="none" class="profile-info-card">
            <ion-item class="profile-info-row">
              <ion-icon slot="start" :icon="mailOutline"/>
              <ion-label>
                <h3>{{ TEXTS.currentEmail.rus }}</h3>
                <p>{{ profileEmail }}</p>
              </ion-label>
            </ion-item>
            <ion-item class="profile-info-row">
              <ion-icon slot="start" :icon="personOutline"/>
              <ion-label>
                <h3>{{ TEXTS.currentUsername.rus }}</h3>
                <p>{{ profileUsername }}</p>
              </ion-label>
            </ion-item>
          </ion-list>

          <section class="profile-extra-card">
            <div class="extra-row" @click="ionRouter.navigate('/subscription', 'forward', 'push')">
              <div class="extra-icon-wrap extra-icon-wrap--sub">
                <ion-icon :icon="starOutline"/>
              </div>
              <div class="extra-body">
                <div class="extra-label">Подписка</div>
                <div class="extra-value">{{ currentTierLabel }}</div>
              </div>
              <div class="extra-action">Управлять</div>
            </div>
            <div class="extra-divider"/>
            <div class="extra-row" @click="ionRouter.navigate('/crystals', 'forward', 'push')">
              <div class="extra-icon-wrap extra-icon-wrap--gem">
                <ion-icon :icon="diamondOutline"/>
              </div>
              <div class="extra-body">
                <div class="extra-label">Кристаллы</div>
                <div class="extra-value">{{ crystalsStore.loading ? "…" : crystalsStore.balance }}</div>
              </div>
              <div class="extra-action">Купить</div>
            </div>
            <div class="extra-divider"/>
            <div class="extra-row" @click="ionRouter.navigate('/my-bundles', 'forward', 'push')">
              <div class="extra-icon-wrap extra-icon-wrap--content">
                <ion-icon :icon="layersOutline"/>
              </div>
              <div class="extra-body">
                <div class="extra-label">Мой контент</div>
                <div class="extra-value">Наборы предметов</div>
              </div>
              <div class="extra-action">Открыть</div>
            </div>
          </section>

          <section class="password-card">
            <div class="section-header">
              <ion-icon :icon="shieldCheckmarkOutline"/>
              <h3>Безопасность</h3>
            </div>
            <div class="button-block">
              <ion-button
                  shape="round"
                  class="button-list-element secondary-action"
                  color="secondary"
                  @click="openEmailModal"
              >
                <ion-icon slot="start" :icon="mailOpenOutline"/>
                {{ TEXTS.changeEmail.rus }}
              </ion-button>

              <ion-button
                  shape="round"
                  class="button-list-element primary-action"
                  color="primary"
                  @click="openSecurityModal"
              >
                <ion-icon slot="start" :icon="keyOutline"/>
                {{ TEXTS.changePassword.rus }}
              </ion-button>

              <ion-button shape="round" class="button-list-element logout-btn" color="medium" @click="logout">
                <ion-icon slot="start" :icon="logOutOutline"/>
                {{ TEXTS.logout.rus }}
              </ion-button>
            </div>
          </section>
        </div>
      </div>

      <ion-modal :is-open="isSecurityModalOpen" class="security-modal" @didDismiss="closeSecurityModal">
        <div class="modal-shell">
          <div class="modal-header">
            <div>
              <p class="modal-overline">Security</p>
              <h2>{{ TEXTS.changePassword.rus }}</h2>
            </div>
            <ion-button fill="clear" color="light" @click="closeSecurityModal">
              <ion-icon slot="icon-only" :icon="closeOutline"/>
            </ion-button>
          </div>

          <p class="password-flow-hint">
            Код подтверждения отправим на {{ profileEmail }}. После получения введите код и новый пароль.
          </p>

          <div class="modal-form">
            <ion-button
                shape="round"
                class="button-list-element primary-action"
                color="primary"
                :disabled="loading || (codeSent && !canResendCode)"
                @click="sendCode"
            >
              <ion-spinner v-if="sendCodeLoading" name="crescent"/>
              <template v-else-if="codeSent && !canResendCode">
                {{ TEXTS.resendAfterSeconds.rus }} {{ cooldownSeconds }} c
              </template>
              <template v-else-if="codeSent && canResendCode">
                {{ TEXTS.sendCodeAgain.rus }}
              </template>
              <template v-else>
                {{ TEXTS.sendVerificationCode.rus }}
              </template>
            </ion-button>

            <ion-input
                v-if="codeSent"
                v-model="verificationCode"
                fill="outline"
                color="primary"
                inputmode="numeric"
                maxlength="6"
                :disabled="loading"
                :placeholder="TEXTS.code.rus"
            />
            <ion-input
                v-if="codeSent"
                v-model="newPassword"
                type="password"
                fill="outline"
                color="primary"
                :disabled="loading"
                :placeholder="TEXTS.newPassword.rus"
            />
            <ion-input
                v-if="codeSent"
                v-model="matchingPassword"
                type="password"
                fill="outline"
                color="primary"
                :disabled="loading"
                :placeholder="TEXTS.confirmPassword.rus"
            />

            <div class="alerts" v-if="errors.length > 0">
              <ion-chip color="danger" v-for="(error, index) in errors" :key="index">
                {{ error }}
              </ion-chip>
            </div>

            <ion-button
                shape="round"
                class="button-list-element primary-action"
                color="primary"
                :disabled="loading || !codeSent"
                @click="submitChangePassword"
            >
              <ion-icon slot="start" :icon="keyOutline" v-if="!loading"/>
              <ion-spinner v-if="loading" name="crescent"/>
              <template v-else>{{ TEXTS.savePassword.rus }}</template>
            </ion-button>
          </div>
        </div>
      </ion-modal>

      <ion-modal :is-open="isEmailModalOpen" class="security-modal" @didDismiss="closeEmailModal">
        <div class="modal-shell">
          <div class="modal-header">
            <div>
              <p class="modal-overline">Security</p>
              <h2>{{ TEXTS.changeEmail.rus }}</h2>
            </div>
            <ion-button fill="clear" color="light" @click="closeEmailModal">
              <ion-icon slot="icon-only" :icon="closeOutline"/>
            </ion-button>
          </div>

          <p class="password-flow-hint">
            {{ TEXTS.emailCodeSentHint.rus }}.
          </p>

          <div class="modal-form">
            <ion-input
                v-model="newEmail"
                type="email"
                fill="outline"
                color="primary"
                :disabled="emailLoading"
                :placeholder="TEXTS.newEmail.rus"
            />

            <ion-button
                shape="round"
                class="button-list-element primary-action"
                color="primary"
                :disabled="emailLoading || !canSendChangeEmailCode || (emailCodeSent && !canResendEmailCode)"
                @click="sendChangeEmailVerificationCode"
            >
              <ion-spinner v-if="emailSendCodeLoading" name="crescent"/>
              <template v-else-if="emailCodeSent && !canResendEmailCode">
                {{ TEXTS.resendAfterSeconds.rus }} {{ emailCooldownSeconds }} c
              </template>
              <template v-else-if="emailCodeSent && canResendEmailCode">
                {{ TEXTS.sendCodeAgain.rus }}
              </template>
              <template v-else>
                {{ TEXTS.sendVerificationCode.rus }}
              </template>
            </ion-button>

            <ion-input
                v-if="emailCodeSent"
                v-model="emailVerificationCode"
                fill="outline"
                color="primary"
                inputmode="numeric"
                maxlength="6"
                :disabled="emailLoading"
                :placeholder="TEXTS.code.rus"
            />
            <ion-input
                v-if="emailCodeSent"
                v-model="currentPasswordForEmailChange"
                type="password"
                fill="outline"
                color="primary"
                :disabled="emailLoading"
                :placeholder="TEXTS.currentPassword.rus"
            />

            <div class="alerts" v-if="emailErrors.length > 0">
              <ion-chip color="danger" v-for="(error, index) in emailErrors" :key="index">
                {{ error }}
              </ion-chip>
            </div>

            <ion-button
                shape="round"
                class="button-list-element primary-action"
                color="primary"
                :disabled="emailLoading || !emailCodeSent || !canSubmitChangeEmail"
                @click="submitChangeEmail"
            >
              <ion-icon slot="start" :icon="mailOpenOutline" v-if="!emailLoading"/>
              <ion-spinner v-if="emailLoading" name="crescent"/>
              <template v-else>{{ TEXTS.confirmEmailChange.rus }}</template>
            </ion-button>
          </div>
        </div>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.profile-content {
  --profile-bg-base: var(--ion-color-dark-shade);
  --profile-surface: rgba(var(--ion-color-medium-rgb), 0.28);
  --profile-surface-strong: rgba(var(--ion-color-medium-rgb), 0.4);
  --profile-border: rgba(var(--ion-color-primary-rgb), 0.2);
  --profile-shadow: rgba(0, 0, 0, 0.36);
  --profile-text-primary: var(--ion-color-light);
  --profile-text-secondary: rgba(var(--ion-color-light-rgb), 0.78);
  --profile-text-muted: rgba(var(--ion-color-light-rgb), 0.72);
  --profile-accent: rgba(var(--ion-color-primary-rgb), 0.9);
  --profile-accent-soft: rgba(var(--ion-color-primary-rgb), 0.2);
  --profile-secondary-soft: rgba(var(--ion-color-secondary-rgb), 0.28);
  --padding-top: calc(8px + var(--sat, 0px));
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-bottom: calc(16px + var(--sab, 0px));
}

.profile-content::part(background) {
  background:
    radial-gradient(circle at 12% -8%, rgba(var(--ion-color-primary-rgb), 0.18), transparent 44%),
    radial-gradient(circle at 90% 18%, rgba(var(--ion-color-tertiary-rgb), 0.12), transparent 40%),
    var(--profile-bg-base) !important;
}

.wrapper {
  width: 100%;
  min-height: 100%;
  display: flex;
  justify-content: flex-start;
  padding: 10px 0 22px;
}

.profile-shell {
  width: min(680px, 100%);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hero-card,
.profile-info-card,
.password-card {
  border: 1px solid var(--profile-border);
  background: linear-gradient(155deg, var(--profile-surface-strong), var(--profile-surface));
  box-shadow: 0 14px 36px var(--profile-shadow),
  inset 0 1px 0 rgba(var(--ion-color-light-rgb), 0.12);
  border-radius: 20px;
  backdrop-filter: blur(6px);
}

.hero-card {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.hero-avatar {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ion-color-primary-contrast);
  font-weight: 700;
  letter-spacing: 0.06em;
  background: linear-gradient(145deg, var(--ion-color-tertiary), var(--ion-color-primary));
  box-shadow: 0 10px 24px rgba(var(--ion-color-primary-rgb), 0.38);
}

.hero-label {
  margin: 0 0 4px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--profile-text-muted);
}

.hero-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
  font-weight: 700;
  color: var(--profile-text-primary);
}

.hero-subtitle {
  margin: 6px 0 0;
  color: rgba(var(--ion-color-light-rgb), 0.92);
  font-size: 14px;
}

.profile-info-card {
  margin: 0;
  padding: 4px 0;
}

.profile-info-row {
  --background: transparent;
  --padding-start: 14px;
  --inner-padding-end: 14px;
  --min-height: 58px;
}

.profile-info-row ion-icon {
  color: var(--profile-accent);
}

.profile-info-row h3 {
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--profile-text-secondary);
}

.profile-info-row p {
  margin: 0;
  color: var(--profile-text-primary);
  font-size: 15px;
  font-weight: 600;
}

.profile-extra-card {
  border: 1px solid var(--profile-border);
  background: linear-gradient(155deg, var(--profile-surface-strong), var(--profile-surface));
  box-shadow: 0 14px 36px var(--profile-shadow),
  inset 0 1px 0 rgba(var(--ion-color-light-rgb), 0.12);
  border-radius: 20px;
  backdrop-filter: blur(6px);
  overflow: hidden;
}

.extra-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.extra-row:active {
  background: rgba(var(--ion-color-primary-rgb), 0.06);
}

.extra-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  font-size: 20px;
}

.extra-icon-wrap--sub {
  background: rgba(var(--ion-color-tertiary-rgb), 0.18);
  color: var(--ion-color-tertiary);
}

.extra-icon-wrap--gem {
  background: rgba(139, 110, 240, 0.18);
  color: #b39df5;
}

.extra-icon-wrap--content {
  background: rgba(110, 200, 240, 0.15);
  color: #7fd0f0;
}

.extra-body {
  flex: 1;
}

.extra-label {
  font-size: 12px;
  color: var(--profile-text-muted);
  margin-bottom: 2px;
}

.extra-value {
  font-size: 16px;
  font-weight: 650;
  color: var(--profile-text-primary);
}

.extra-action {
  font-size: 13px;
  font-weight: 600;
  color: var(--profile-accent);
  flex: 0 0 auto;
}

.extra-divider {
  height: 1px;
  background: var(--profile-border);
  margin: 0 16px;
}

.password-card {
  padding: 14px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 10px;
}

.section-header ion-icon {
  color: var(--profile-accent);
  font-size: 19px;
}

.section-header h3 {
  margin: 0;
  font-size: 17px;
  color: var(--profile-text-primary);
  font-weight: 650;
}

.button-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.password-flow-hint {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--profile-text-muted);
  line-height: 1.4;
}

.modal-form ion-input {
  --background: rgba(var(--ion-color-dark-rgb), 0.36);
  --border-color: rgba(var(--ion-color-primary-rgb), 0.22);
  --color: var(--profile-text-primary);
  --placeholder-color: rgba(var(--ion-color-light-rgb), 0.56);
  --highlight-color-focused: var(--ion-color-primary);
  --border-radius: 14px;
}

.button-list-element {
  width: 100%;
  min-height: 46px;
  font-weight: 620;
  letter-spacing: 0.015em;
  text-transform: none;
}

.primary-action {
  margin-top: 0;
  --box-shadow: 0 6px 14px rgba(var(--ion-color-primary-rgb), 0.22);
}

.secondary-action {
  --box-shadow: 0 4px 10px rgba(var(--ion-color-secondary-rgb), 0.18);
}

.logout-btn {
  margin-top: 4px;
  --background: var(--profile-secondary-soft);
  --background-hover: rgba(var(--ion-color-secondary-rgb), 0.45);
  --color: rgba(var(--ion-color-light-rgb), 0.94);
  position: relative;
  z-index: 1;
}

:deep(.security-modal) {
  --width: min(560px, 96vw);
  --height: auto;
  --border-radius: 20px;
  --background: rgba(var(--ion-color-dark-rgb), 0.96);
  --box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
}

.modal-shell {
  padding: 16px 14px 16px;
  border-radius: 20px;
  background: radial-gradient(circle at top right, rgba(var(--ion-color-primary-rgb), 0.2), transparent 42%),
  rgba(var(--ion-color-dark-rgb), 0.96);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 6px;
}

.modal-overline {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  color: var(--profile-text-muted);
}

.modal-header h2 {
  margin: 4px 0 0;
  font-size: 20px;
  color: var(--profile-text-primary);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (min-width: 768px) {
  .profile-content {
    --padding-top: calc(14px + var(--sat, 0px));
    --padding-start: 16px;
    --padding-end: 16px;
    --padding-bottom: calc(20px + var(--sab, 0px));
  }

  .wrapper {
    justify-content: center;
    padding: 28px 0 42px;
  }

  .hero-card {
    padding: 22px;
  }

  .hero-title {
    font-size: 22px;
  }

  .password-card {
    padding: 20px 18px;
  }

  .modal-shell {
    padding: 20px 20px 22px;
  }
}
</style>
