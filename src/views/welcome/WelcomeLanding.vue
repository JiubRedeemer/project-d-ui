<script setup lang="ts">
import { IonButton, IonIcon } from "@ionic/vue";
import {
  bookOutline,
  peopleOutline,
  personOutline,
  phonePortraitOutline,
  sparklesOutline,
  shieldCheckmarkOutline,
} from "ionicons/icons";
import { TEXTS } from "@/config/localisations";

const emit = defineEmits<{
  (e: "login"): void;
  (e: "register"): void;
}>();

const t = TEXTS.welcomeLanding;

const features = [
  { icon: peopleOutline, title: t.roomsTitle.rus, text: t.roomsText.rus },
  { icon: personOutline, title: t.charactersTitle.rus, text: t.charactersText.rus },
  { icon: bookOutline, title: t.masterTitle.rus, text: t.masterText.rus },
  { icon: phonePortraitOutline, title: t.pwaTitle.rus, text: t.pwaText.rus },
];
</script>

<template>
  <div class="landing">

    <!-- Hero -->
    <section class="landing-hero">
      <span class="landing-badge">
        <ion-icon :icon="sparklesOutline" class="badge-icon" />
        {{ t.heroEyebrow.rus }}
      </span>

      <h1 class="landing-title">{{ t.heroTitle.rus }}</h1>
      <p class="landing-subtitle">{{ t.heroSubtitle.rus }}</p>

      <blockquote class="landing-pull">{{ t.heroTagline.rus }}</blockquote>

      <div class="landing-cta landing-cta--hero">
        <ion-button shape="round" expand="block" color="primary" class="landing-btn" @click="emit('login')">
          {{ TEXTS.login.rus }}
        </ion-button>
        <ion-button
            shape="round"
            expand="block"
            fill="outline"
            color="light"
            class="landing-btn landing-btn--outline"
            @click="emit('register')"
        >
          {{ TEXTS.register.rus }}
        </ion-button>
      </div>

      <!-- Social proof strip -->
      <div class="landing-trust">
        <ion-icon :icon="shieldCheckmarkOutline" class="trust-icon" />
        <span>{{ t.trustNote?.rus ?? 'Бесплатно · Без рекламы · Работает в браузере' }}</span>
      </div>
    </section>

    <!-- Features -->
    <section class="landing-features">
      <p class="landing-features__eyebrow">{{ t.featuresHeading.rus }}</p>
      <div class="landing-features__grid">
        <article v-for="(feature, index) in features" :key="index" class="feature-card">
          <div class="feature-card__icon-wrap">
            <ion-icon :icon="feature.icon" class="feature-card__icon" />
          </div>
          <div class="feature-card__body">
            <h3 class="feature-card__title">{{ feature.title }}</h3>
            <p class="feature-card__text">{{ feature.text }}</p>
          </div>
        </article>
      </div>
    </section>

    <!-- Footer CTA -->
    <section class="landing-footer">
      <div class="landing-footer__card">
        <p class="footer-card__headline">{{ t.footerHeadline?.rus ?? 'Начните прямо сейчас' }}</p>
        <div class="landing-cta landing-cta--footer">
          <ion-button shape="round" expand="block" color="primary" class="landing-btn" @click="emit('login')">
            {{ TEXTS.login.rus }}
          </ion-button>
          <ion-button
              shape="round"
              expand="block"
              fill="outline"
              color="light"
              class="landing-btn landing-btn--outline"
              @click="emit('register')"
          >
            {{ TEXTS.register.rus }}
          </ion-button>
        </div>
        <p class="landing-footer__note">{{ t.footerNote.rus }}</p>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* ─── Layout ──────────────────────────────────────── */
.landing {
  width: min(960px, 100%);
  margin: 0 auto;
  padding: 28px 16px calc(40px + var(--sab, 0px));
  box-sizing: border-box;
  position: relative;
  z-index: 1;
}

/* ─── Hero ────────────────────────────────────────── */
.landing-hero {
  padding: 28px 20px 32px;
  border-radius: 24px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  background:
      linear-gradient(160deg,
      rgba(var(--ion-color-primary-rgb), 0.14) 0%,
      rgba(var(--ion-color-light-rgb), 0.04) 55%,
      rgba(var(--ion-color-dark-rgb), 0.18) 100%);
  box-shadow:
      0 1px 0 rgba(var(--ion-color-light-rgb), 0.1) inset,
      0 24px 56px rgba(0, 0, 0, 0.36);
  backdrop-filter: blur(12px);
  position: relative;
  overflow: hidden;
}

/* subtle top-right glow */
.landing-hero::before {
  content: '';
  position: absolute;
  top: -60px;
  right: -40px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--ion-color-primary-rgb), 0.22) 0%, transparent 70%);
  pointer-events: none;
}

.landing-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px 4px 8px;
  border-radius: 100px;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.4);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-primary-rgb), 1);
}

.badge-icon {
  font-size: 13px;
}

.landing-title {
  margin: 16px 0 12px;
  font-size: clamp(28px, 6vw, 42px);
  line-height: 1.12;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--ion-color-light);
}

.landing-subtitle {
  margin: 0;
  font-size: 15px;
  line-height: 1.65;
  color: rgba(var(--ion-color-light-rgb), 0.82);
  max-width: 46ch;
}

.landing-pull {
  margin: 18px 0 0;
  padding: 12px 14px;
  border-left: 3px solid rgba(var(--ion-color-primary-rgb), 0.7);
  border-radius: 0 10px 10px 0;
  background: rgba(var(--ion-color-primary-rgb), 0.08);
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 1.5;
  color: rgba(var(--ion-color-primary-rgb), 1);
}

.landing-trust {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 18px;
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.48);
}

.trust-icon {
  font-size: 14px;
  flex-shrink: 0;
}

/* ─── CTAs ────────────────────────────────────────── */
.landing-cta {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 24px;
}

.landing-btn {
  min-height: 50px;
  font-weight: 650;
  font-size: 15px;
  --border-radius: 14px;
}

.landing-btn--outline {
  --border-color: rgba(var(--ion-color-light-rgb), 0.3);
  --color: var(--ion-color-light);
}

/* ─── Features ────────────────────────────────────── */
.landing-features {
  margin-top: 32px;
}

.landing-features__eyebrow {
  margin: 0 0 16px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(var(--ion-color-light-rgb), 0.4);
}

.landing-features__grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feature-card {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
  background: rgba(var(--ion-color-light-rgb), 0.045);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.feature-card:hover {
  background: rgba(var(--ion-color-light-rgb), 0.075);
  border-color: rgba(var(--ion-color-light-rgb), 0.16);
}

.feature-card__icon-wrap {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--ion-color-primary-rgb), 0.16);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.28);
}

.feature-card__icon {
  font-size: 22px;
  color: rgba(var(--ion-color-primary-rgb), 0.95);
}

.feature-card__body {
  flex: 1;
  min-width: 0;
}

.feature-card__title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 650;
  color: var(--ion-color-light);
  line-height: 1.3;
}

.feature-card__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(var(--ion-color-light-rgb), 0.72);
}

/* ─── Footer CTA ──────────────────────────────────── */
.landing-footer {
  margin-top: 32px;
}

.landing-footer__card {
  padding: 24px 20px;
  border-radius: 20px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  background: linear-gradient(145deg,
  rgba(var(--ion-color-primary-rgb), 0.1) 0%,
  rgba(var(--ion-color-dark-rgb), 0.2) 100%);
  text-align: center;
}

.footer-card__headline {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: var(--ion-color-light);
  letter-spacing: -0.01em;
}

.landing-cta--footer {
  margin-top: 18px;
}

.landing-footer__note {
  margin: 16px 0 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: rgba(var(--ion-color-light-rgb), 0.42);
}

/* ─── Responsive ──────────────────────────────────── */
@media (min-width: 480px) {
  .landing-cta {
    flex-direction: row;
  }

  .landing-btn {
    flex: 1;
  }

  .landing-features__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .feature-card {
    flex-direction: column;
    gap: 12px;
  }
}

@media (min-width: 768px) {
  .landing {
    padding: 36px 28px calc(48px + var(--sab, 0px));
  }

  .landing-hero {
    padding: 36px 36px 40px;
  }

  .landing-footer__card {
    padding: 32px 36px;
  }

  .landing-cta--footer {
    max-width: 420px;
    margin-left: auto;
    margin-right: auto;
  }
}
</style>