import { Capacitor } from "@capacitor/core";

export const PWA_HINT_STORAGE_KEY = "pwaInstallHintDismissed";

export type PwaInstallPlatform = "ios" | "android" | "desktop" | "unknown";

/** Chromium BeforeInstallPromptEvent (not in all TS libs). */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function isRunningAsPwa(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) {
    return true;
  }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

export function getPwaInstallPlatform(): PwaInstallPlatform {
  if (typeof navigator === "undefined") {
    return "unknown";
  }
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Android/i.test(ua)) {
    return "android";
  }
  if (/Mobi|Android/i.test(ua)) {
    return "android";
  }
  return "desktop";
}

export function isPwaHintDismissed(): boolean {
  try {
    return localStorage.getItem(PWA_HINT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissPwaHint(): void {
  try {
    localStorage.setItem(PWA_HINT_STORAGE_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function shouldShowPwaHintOnEnter(): boolean {
  return !isPwaHintDismissed() && !isRunningAsPwa() && !isNativeApp();
}

export function captureBeforeInstallPrompt(event: Event): void {
  event.preventDefault();
  deferredInstallPrompt = event as BeforeInstallPromptEvent;
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredInstallPrompt;
}

export function clearDeferredInstallPrompt(): void {
  deferredInstallPrompt = null;
}

export async function triggerPwaInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const promptEvent = deferredInstallPrompt;
  if (!promptEvent) {
    return "unavailable";
  }
  await promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  if (outcome === "accepted") {
    clearDeferredInstallPrompt();
  }
  return outcome;
}

export function canShowNativeInstallButton(): boolean {
  return deferredInstallPrompt !== null;
}

export function bindBeforeInstallPromptListener(): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const handler = (event: Event) => captureBeforeInstallPrompt(event);
  window.addEventListener("beforeinstallprompt", handler);
  return () => window.removeEventListener("beforeinstallprompt", handler);
}
