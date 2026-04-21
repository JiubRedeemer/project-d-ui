<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  toastController
} from "@ionic/vue";
import {computed, onBeforeUnmount, ref} from "vue";
import {useRouter} from "vue-router";
import {AxiosError, isAxiosError} from "axios";

import {TEXTS} from "@/config/localisations";
import {resetPassword, sendPasswordResetCode} from "@/api/authApi";
import type {ApiError} from "@/api/authApi.types";
import {mapPasswordResetErrorCodeToMessage} from "@/utils/passwordResetErrorMapper";

const RESET_CODE_COOLDOWN_SECONDS = 60;
const MIN_PASSWORD_LENGTH = 8;
const VERIFICATION_CODE_REGEXP = /^\d{6}$/;
const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = useRouter();

const email = ref("");
const verificationCode = ref("");
const password = ref("");
const matchingPassword = ref("");
const errors = ref<string[]>([]);

const sendCodeLoading = ref(false);
const resetLoading = ref(false);
const codeSent = ref(false);
const cooldownSeconds = ref(0);

let cooldownIntervalId: number | null = null;
let resendController: AbortController | null = null;

const loading = computed(() => sendCodeLoading.value || resetLoading.value);
const canResendCode = computed(() => cooldownSeconds.value === 0 && !sendCodeLoading.value);

function normalizeErrorCode(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined;
  const responseCode = (error.response?.data as ApiError | undefined)?.code;
  if (typeof responseCode === "string" && responseCode.trim()) {
    return responseCode.trim();
  }
  return undefined;
}

function parseErrorMessage(error: unknown): string {
  const code = normalizeErrorCode(error);
  if (code) return mapPasswordResetErrorCodeToMessage(code);
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

function validateEmailStep(): string[] {
  const currentErrors: string[] = [];
  const value = email.value.trim();
  if (!value) {
    currentErrors.push(TEXTS.fieldCantBeEmpty.rus);
  } else if (!EMAIL_REGEXP.test(value)) {
    currentErrors.push(TEXTS.invalidEmail.rus);
  }
  return currentErrors;
}

function validateResetStep(): string[] {
  const currentErrors: string[] = [];
  if (!verificationCode.value.trim()) {
    currentErrors.push(TEXTS.fieldCantBeEmpty.rus);
  } else if (!VERIFICATION_CODE_REGEXP.test(verificationCode.value.trim())) {
    currentErrors.push(TEXTS.codeRequiredDigits.rus);
  }
  if (!password.value) {
    currentErrors.push(TEXTS.fieldCantBeEmpty.rus);
  } else if (password.value.length < MIN_PASSWORD_LENGTH) {
    currentErrors.push(TEXTS.passwordTooShort.rus);
  }
  if (!matchingPassword.value) {
    currentErrors.push(TEXTS.fieldCantBeEmpty.rus);
  } else if (matchingPassword.value !== password.value) {
    currentErrors.push(TEXTS.passwordsDoNotMatch.rus);
  }
  return Array.from(new Set(currentErrors));
}

async function sendCode() {
  errors.value = validateEmailStep();
  if (errors.value.length > 0) return;
  if (codeSent.value && cooldownSeconds.value > 0) return;

  resendController?.abort();
  resendController = new AbortController();
  const signal = resendController.signal;

  sendCodeLoading.value = true;
  try {
    const normalizedEmail = email.value.trim().toLowerCase();
    await requestWithSingleRetry(() => sendPasswordResetCode(normalizedEmail, signal));
    codeSent.value = true;
    errors.value = [];
    startCooldown(RESET_CODE_COOLDOWN_SECONDS);
  } catch (error) {
    if (isAxiosError(error) && error.code === AxiosError.ERR_CANCELED) return;
    errors.value = [parseErrorMessage(error)];
  } finally {
    sendCodeLoading.value = false;
  }
}

async function submitResetPassword() {
  errors.value = validateResetStep();
  if (errors.value.length > 0) return;

  resetLoading.value = true;
  try {
    await requestWithSingleRetry(() =>
      resetPassword({
        email: email.value.trim().toLowerCase(),
        verificationCode: verificationCode.value.trim(),
        password: password.value,
        matchingPassword: matchingPassword.value
      })
    );

    const toast = await toastController.create({
      message: TEXTS.passwordUpdatedSuccess.rus,
      duration: 1800,
      position: "top"
    });
    await toast.present();
    await router.replace("/welcome");
  } catch (error) {
    errors.value = [parseErrorMessage(error)];
  } finally {
    resetLoading.value = false;
  }
}

onBeforeUnmount(() => {
  clearCooldownTimer();
  resendController?.abort();
});
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button default-href="/welcome" />
        </ion-buttons>
        <ion-title>{{ TEXTS.forgotPassword.rus }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="forgot-content" color="dark">
      <div class="wrapper">
        <div class="forgot-card">
          <h2 class="title">{{ TEXTS.resetPassword.rus }}</h2>
          <p class="subtitle">Укажите email, получите код и задайте новый пароль.</p>

          <div class="form-block">
            <ion-input
              v-model="email"
              fill="outline"
              color="primary"
              type="email"
              :disabled="loading"
              :placeholder="TEXTS.email.rus"
            />

            <ion-button
              shape="round"
              class="action-btn"
              color="primary"
              :disabled="loading || (codeSent && !canResendCode)"
              @click="sendCode"
            >
              <ion-spinner v-if="sendCodeLoading" name="crescent" />
              <template v-else-if="codeSent && !canResendCode">
                {{ TEXTS.resendAfterSeconds.rus }} {{ cooldownSeconds }} c
              </template>
              <template v-else-if="codeSent && canResendCode">
                {{ TEXTS.sendCodeAgain.rus }}
              </template>
              <template v-else>{{ TEXTS.sendVerificationCode.rus }}</template>
            </ion-button>

            <template v-if="codeSent">
              <ion-input
                v-model="verificationCode"
                fill="outline"
                color="primary"
                inputmode="numeric"
                maxlength="6"
                :disabled="loading"
                :placeholder="TEXTS.code.rus"
              />
              <ion-input
                v-model="password"
                fill="outline"
                color="primary"
                type="password"
                :disabled="loading"
                :placeholder="TEXTS.newPassword.rus"
              />
              <ion-input
                v-model="matchingPassword"
                fill="outline"
                color="primary"
                type="password"
                :disabled="loading"
                :placeholder="TEXTS.confirmPassword.rus"
              />
              <ion-button
                shape="round"
                class="action-btn"
                color="primary"
                :disabled="loading"
                @click="submitResetPassword"
              >
                <ion-spinner v-if="resetLoading" name="crescent" />
                <template v-else>{{ TEXTS.changePassword.rus }}</template>
              </ion-button>
            </template>

            <div class="alerts" v-if="errors.length > 0">
              <ion-chip color="danger" v-for="(error, index) in errors" :key="index">{{ error }}</ion-chip>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.forgot-content {
  --padding-top: 12px;
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-bottom: 18px;
}

.wrapper {
  width: 100%;
  min-height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 12px;
}

.forgot-card {
  width: min(560px, 100%);
  border-radius: 20px;
  padding: 18px 16px;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.18);
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.38), rgba(var(--ion-color-medium-rgb), 0.24));
}

.title {
  margin: 0;
  font-size: 22px;
}

.subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  color: rgba(var(--ion-color-light-rgb), 0.76);
}

.form-block {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  width: 100%;
  min-height: 46px;
}

.alerts {
  margin-top: 2px;
}
</style>
