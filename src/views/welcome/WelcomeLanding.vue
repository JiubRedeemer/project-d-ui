<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useIonRouter } from "@ionic/vue";
import { TEXTS } from "@/config/localisations";

import logo from "@/assets/landing/logo.png";
import avatarPlayer from "@/assets/landing/avatar-player.jpg";
import avatarMaster from "@/assets/landing/avatar-master.jpg";
import featureSheet from "@/assets/landing/feature-sheet.jpg";
import featureCombat from "@/assets/landing/feature-combat.jpg";
import featureGuidebook from "@/assets/landing/feature-guidebook.jpg";
import featurePlanner from "@/assets/landing/feature-planner.jpg";
import sheetMockup from "@/assets/landing/sheet-mockup.jpg";
import combatMockup from "@/assets/landing/combat-mockup.jpg";
import guidebookMockup from "@/assets/landing/guidebook-mockup.jpg";
import showcaseBg from "@/assets/landing/showcase-bg.jpg";
import offlineBg from "@/assets/landing/offline-bg.jpg";
import finalBg from "@/assets/landing/final-bg.jpg";

const emit = defineEmits<{
  (e: "login"): void;
  (e: "register"): void;
}>();

const NAV_LINKS = [
  { key: "for-whom", label: "Для кого" },
  { key: "features", label: "Возможности" },
  { key: "showcase", label: "Скриншоты" },
  { key: "offline", label: "Офлайн" },
];

const PLAYER_BULLETS = [
  "Лист персонажа под рукой",
  "Отслеживание HP и ресурсов",
  "Заклинания и умения",
  "Инвентарь без бумаги",
  "Броски кубиков в один тап",
];

const MASTER_BULLETS = [
  "Обзор всей партии",
  "Боевой трекер в реальном времени",
  "NPC и справочник кампании",
  "Планировщик сессий",
];

const FEATURES = [
  {
    key: "feature0",
    title: "Лист персонажа",
    desc: "7 вкладок для полного контроля: характеристики, инвентарь, заклинания, заметки.",
    image: featureSheet,
    accent: "gold",
    radius: "10px",
  },
  {
    key: "feature1",
    title: "Боевой трекер",
    desc: "Инициатива, HP и состояния всей партии — в реальном времени, у всех на экране.",
    image: featureCombat,
    accent: "secondary",
    radius: "50%",
  },
  {
    key: "feature2",
    title: "Справочник мастера",
    desc: "Свои NPC, локации и лор кампании — под рукой в любой момент сессии.",
    image: featureGuidebook,
    accent: "gold",
    radius: "50%",
  },
  {
    key: "feature3",
    title: "Планировщик сессий",
    desc: "Расписание и подготовка к игре без хаоса в переписках.",
    image: featurePlanner,
    accent: "secondary",
    radius: "10px",
  },
  {
    key: "feature4",
    title: "Офлайн-режим",
    desc: "Работает без связи, синхронизация — как только сеть появится снова.",
    image: null,
    accent: "gold",
    radius: "10px",
  },
  {
    key: "feature5",
    title: "PWA + Android",
    desc: "Открывайте в браузере или установите как отдельное приложение.",
    image: null,
    accent: "secondary",
    radius: "50%",
  },
];

const SHOWCASE_SCREENS = [
  { key: "screen0", image: sheetMockup, caption: "Лист персонажа" },
  { key: "screen1", image: combatMockup, caption: "Боевой трекер" },
  { key: "screen2", image: guidebookMockup, caption: "Справочник мастера" },
];

const ionRouter = useIonRouter();

const rootEl = ref<HTMLElement | null>(null);
const heroIn = ref(false);
const showLegal = ref(false);
const revealed = reactive<Record<string, boolean>>({});
let observer: IntersectionObserver | null = null;

function isRevealed(key: string) {
  return !!revealed[key];
}

function scrollToSection(key: string) {
  rootEl.value
    ?.querySelector(`#${key}`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

onMounted(() => {
  requestAnimationFrame(() => {
    heroIn.value = true;
  });

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const key = entry.target.getAttribute("data-reveal");
          if (key) revealed[key] = true;
          observer?.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -60px 0px" }
  );

  rootEl.value
    ?.querySelectorAll("[data-reveal]")
    .forEach((el) => observer?.observe(el));
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<template>
  <div ref="rootEl" class="myth">
    <div class="myth-grain" aria-hidden="true"></div>
    <!-- NAV -->
    <div class="myth-nav-bar">
      <div class="myth-nav">
        <div class="myth-nav__brand">
          <span class="myth-nav__logo-ring">
            <img :src="logo" alt="Mythrill" class="myth-nav__logo" />
          </span>
          <span class="myth-nav__name">Mythrill</span>
        </div>
        <div class="myth-nav__links">
          <span
            v-for="link in NAV_LINKS"
            :key="link.key"
            class="myth-nav__link"
            @click="scrollToSection(link.key)"
          >
            {{ link.label }}
          </span>
          <span class="myth-nav__cta" @click="emit('login')">{{ TEXTS.login.rus }}</span>
        </div>
      </div>
    </div>

    <!-- HERO -->
    <div class="myth-hero">
      <div class="myth-hero__sparks" aria-hidden="true"></div>
      <div class="myth-hero__ember myth-hero__ember--1" aria-hidden="true"></div>
      <div class="myth-hero__ember myth-hero__ember--2" aria-hidden="true"></div>
      <div class="myth-hero__ember myth-hero__ember--3" aria-hidden="true"></div>

      <div class="myth-hero__text" :class="{ 'is-visible': heroIn }">
        <div class="myth-eyebrow">
          <span class="myth-eyebrow__mark"></span>
          <span>Для настольных РПГ</span>
        </div>
        <h1 class="myth-hero__title">
          Цифровой лист персонажа для
          <span class="myth-hero__title-accent">настольных&nbsp;РПГ</span>
        </h1>
        <p class="myth-hero__subtitle">
          Один инструмент для игрока и мастера — лист персонажа, боевой трекер и
          справочник кампании, всегда под рукой за столом.
        </p>
        <div class="myth-hero__cta">
          <span class="myth-btn myth-btn--primary" @click="emit('login')">{{ TEXTS.login.rus }}</span>
          <span class="myth-btn myth-btn--outline" @click="emit('register')">{{ TEXTS.register.rus }}</span>
        </div>
      </div>

      <div class="myth-hero__phone" :class="{ 'is-visible': heroIn }">
        <div class="myth-phone-frame myth-phone-frame--hero">
          <img :src="sheetMockup" alt="Лист персонажа Mythrill" />
        </div>
      </div>
    </div>

    <!-- ДЛЯ КОГО -->
    <div id="for-whom" class="myth-section myth-section--muted">
      <div class="myth-section__inner">
        <div
          class="myth-section__head reveal"
          :class="{ 'is-visible': isRevealed('forWhomHead') }"
          data-reveal="forWhomHead"
        >
          <span class="myth-rule" aria-hidden="true"></span>
          <span class="myth-eyebrow-label">Для кого</span>
          <h2 class="myth-section__title">Один инструмент — две роли</h2>
        </div>

        <div class="myth-role-grid">
          <div
            class="myth-role-card reveal"
            :class="{ 'is-visible': isRevealed('playerCard') }"
            data-reveal="playerCard"
          >
            <div class="myth-role-card__avatar myth-role-card__avatar--gold">
              <img :src="avatarPlayer" alt="Игрок" />
            </div>
            <h3 class="myth-role-card__title">Игрок</h3>
            <div class="myth-role-card__list">
              <div v-for="line in PLAYER_BULLETS" :key="line">{{ line }}</div>
            </div>
          </div>

          <div
            class="myth-role-card reveal"
            :class="{ 'is-visible': isRevealed('masterCard') }"
            data-reveal="masterCard"
            style="transition-delay: 0.1s"
          >
            <div class="myth-role-card__avatar myth-role-card__avatar--secondary">
              <img :src="avatarMaster" alt="Мастер" />
            </div>
            <h3 class="myth-role-card__title">Мастер</h3>
            <div class="myth-role-card__list">
              <div v-for="line in MASTER_BULLETS" :key="line">{{ line }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ФИЧИ -->
    <div id="features" class="myth-section">
      <div class="myth-section__inner">
        <div
          class="myth-section__head reveal"
          :class="{ 'is-visible': isRevealed('featuresHead') }"
          data-reveal="featuresHead"
        >
          <span class="myth-rule" aria-hidden="true"></span>
          <span class="myth-eyebrow-label">Возможности</span>
          <h2 class="myth-section__title">Всё для стола, в одном приложении</h2>
        </div>

        <div class="myth-feature-grid">
          <div
            v-for="(f, i) in FEATURES"
            :key="f.key"
            class="myth-feature-card reveal"
            :class="{ 'is-visible': isRevealed(f.key) }"
            :style="{ transitionDelay: `${(i % 3) * 0.09}s` }"
            :data-reveal="f.key"
          >
            <div v-if="f.image" class="myth-feature-card__image">
              <img :src="f.image" alt="" />
            </div>
            <div class="myth-feature-card__body">
              <div
                class="myth-feature-card__swatch"
                :class="`myth-feature-card__swatch--${f.accent}`"
                :style="{ borderRadius: f.radius }"
              ></div>
              <h3 class="myth-feature-card__title">{{ f.title }}</h3>
              <p class="myth-feature-card__desc">{{ f.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ВИТРИНА -->
    <div
      id="showcase"
      class="myth-section myth-section--showcase"
      :style="{ backgroundImage: `url(${showcaseBg})` }"
    >
      <div class="myth-section__inner">
        <div
          class="myth-section__head reveal"
          :class="{ 'is-visible': isRevealed('showcaseHead') }"
          data-reveal="showcaseHead"
        >
          <span class="myth-rule" aria-hidden="true"></span>
          <span class="myth-eyebrow-label">Интерфейс</span>
          <h2 class="myth-section__title">От листа до боя — один взгляд</h2>
        </div>

        <div class="myth-showcase-grid">
          <div
            v-for="(s, i) in SHOWCASE_SCREENS"
            :key="s.key"
            class="myth-showcase-item reveal reveal--scale"
            :class="{ 'is-visible': isRevealed(s.key) }"
            :style="{ transitionDelay: `${i * 0.12}s` }"
            :data-reveal="s.key"
          >
            <div class="myth-phone-frame myth-phone-frame--showcase">
              <img :src="s.image" alt="" />
            </div>
            <span class="myth-showcase-item__caption">{{ s.caption }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ОФЛАЙН -->
    <div class="myth-section">
      <div
        class="myth-offline reveal"
        :class="{ 'is-visible': isRevealed('offline') }"
        data-reveal="offline"
        :style="{ backgroundImage: `url(${offlineBg})` }"
      >
        <div class="myth-offline__glow" aria-hidden="true"></div>
        <div class="myth-offline__icon" aria-hidden="true">
          <span class="myth-offline__icon-inner"></span>
          <span class="myth-offline__icon-slash"></span>
        </div>
        <div class="myth-offline__text">
          <h3 class="myth-offline__title">Работает без интернета</h3>
          <p class="myth-offline__desc">
            Все изменения — HP, заряды, заклинания — сохраняются на устройстве и
            синхронизируются сами, как только появится связь. Играйте где угодно,
            не думая об этом.
          </p>
        </div>
      </div>
    </div>

    <!-- ФИНАЛ CTA -->
    <div
      class="myth-final reveal"
      :class="{ 'is-visible': isRevealed('final') }"
      data-reveal="final"
      :style="{ backgroundImage: `url(${finalBg})` }"
    >
      <div class="myth-final__glow" aria-hidden="true"></div>
      <h2 class="myth-final__title">Готов к приключению?</h2>
      <p class="myth-final__desc">
        Открой Mythrill в браузере — бесплатно, без регистрации карты.
      </p>
      <div class="myth-final__cta">
        <span class="myth-btn myth-btn--primary myth-btn--lg" @click="emit('login')">
          {{ TEXTS.login.rus }}
        </span>
        <span class="myth-btn myth-btn--outline myth-btn--lg" @click="emit('register')">
          {{ TEXTS.register.rus }}
        </span>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="myth-footer">
      <span>© 2026 Mythrill</span>
      <div class="myth-footer__links">
        <span
          class="myth-footer__link"
          @click="ionRouter.navigate('/welcome/terms', 'forward', 'push')"
        >
          Условия
        </span>
        <span class="myth-footer__legal-btn" @click="showLegal = true">Правовая информация</span>
        <span class="myth-footer__contacts">
          <span class="myth-footer__contacts-label">Контакты:</span>
          <a href="mailto:support@mythrill.ru" class="myth-footer__link">support@mythrill.ru</a>
          <a
            href="https://t.me/jiubredeemer_job"
            target="_blank"
            rel="noopener noreferrer"
            class="myth-footer__link"
          >
            @jiubredeemer_job
          </a>
        </span>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showLegal" class="legal-overlay" @click.self="showLegal = false">
        <div class="legal-modal">
          <button class="legal-modal__close" @click="showLegal = false" aria-label="Закрыть">✕</button>
          <h2 class="legal-modal__title">Правовая информация</h2>
          <p class="legal-modal__text">Материалы представлены для ознакомления. Права на материалы Wizards of the Coast принадлежат Wizards of the Coast.</p>
          <p class="legal-modal__text">Данная работа включает материалы из System Reference Document 5.2.1 («SRD 5.2.1») и System Reference Document 5.1 («SRD 5.1») от Wizards of the Coast LLC, доступных по адресам <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noopener noreferrer" class="legal-modal__link">https://www.dndbeyond.com/srd</a> и <a href="https://dnd.wizards.com/resources/systems-reference-document" target="_blank" rel="noopener noreferrer" class="legal-modal__link">https://dnd.wizards.com/resources/systems-reference-document</a>. Материалы SRD 5.2.1 и SRD 5.1 лицензированы по лицензии Creative Commons Attribution 4.0 International, доступной по адресу: <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener noreferrer" class="legal-modal__link">https://creativecommons.org/licenses/by/4.0/legalcode</a>.</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.myth {
  --myth-bg0: #121016;
  --myth-bg1: #1a1721;
  --myth-text-light: #f6f1e6;
  --myth-text-muted: rgba(246, 241, 230, 0.6);
  --myth-gold: #c9a24b;
  --myth-gold-light: #eccd85;
  --myth-gold-deep: #9c7a34;
  --myth-secondary: #8a5cc2;
  --myth-radius: 999px;

  width: 100%;
  background:
    radial-gradient(ellipse 900px 500px at 12% -8%, rgba(201, 162, 75, 0.1), transparent 60%),
    radial-gradient(ellipse 800px 480px at 90% 8%, rgba(138, 92, 194, 0.12), transparent 60%),
    var(--myth-bg0);
  font-family: "Manrope", sans-serif;
  color: var(--myth-text-muted);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
  letter-spacing: 0.1px;
}

.myth :is(h1, h2, h3) {
  margin: 0;
  font-family: "Fraunces", serif;
  color: var(--myth-text-light);
}

/* ─── Grain texture (adds a premium, tactile finish) ── */
.myth-grain {
  position: fixed;
  inset: 0;
  z-index: 30;
  opacity: 0.035;
  mix-blend-mode: overlay;
  pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}

/* ─── Decorative rule above eyebrows ─────────────── */
.myth-rule {
  width: 44px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--myth-gold), transparent);
}

/* ─── Reveal transitions ─────────────────────── */
.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.reveal.reveal--scale {
  transform: translateY(40px) scale(0.96);
}

.reveal.is-visible {
  opacity: 1;
  transform: none;
}

.myth-hero__text,
.myth-hero__phone {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.05s,
    transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.05s;
}

.myth-hero__phone {
  transform: translateY(24px) scale(0.97);
  transition-delay: 0.2s;
}

.myth-hero__text.is-visible,
.myth-hero__phone.is-visible {
  opacity: 1;
  transform: none;
}

@keyframes myth-twinkle {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}

@keyframes myth-ember {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(-140px) translateX(12px);
    opacity: 0;
  }
}

@keyframes myth-pulse-glow {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.08);
  }
}

/* ─── Nav ─────────────────────────────────────── */
.myth-nav-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(18, 16, 22, 0.66);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.myth-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px 5%;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.myth-nav__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.myth-nav__logo-ring {
  display: flex;
  border-radius: 11px;
  padding: 1px;
  background: linear-gradient(135deg, var(--myth-gold-light), var(--myth-secondary));
  box-shadow: 0 0 16px -4px rgba(201, 162, 75, 0.55);
}

.myth-nav__logo {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: block;
}

.myth-nav__name {
  font-family: "Fraunces", serif;
  font-size: 22px;
  font-weight: 600;
  color: var(--myth-text-light);
  letter-spacing: 0.5px;
}

.myth-nav__links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  font-size: 14px;
  color: var(--myth-text-muted);
}

.myth-nav__link {
  cursor: pointer;
  transition: color 0.2s ease;
}

.myth-nav__link:hover {
  color: var(--myth-text-light);
}

@media (max-width: 640px) {
  .myth-nav__link {
    display: none;
  }
}

.myth-nav__cta {
  border: 1px solid rgba(201, 162, 75, 0.5);
  color: var(--myth-gold-light);
  padding: 9px 20px;
  border-radius: var(--myth-radius);
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.25s ease;
}

.myth-nav__cta:hover {
  background: linear-gradient(135deg, var(--myth-gold-light), var(--myth-gold-deep));
  border-color: transparent;
  color: var(--myth-bg0);
  box-shadow: 0 0 24px -4px rgba(201, 162, 75, 0.75);
}

/* ─── Buttons ─────────────────────────────────── */
.myth-btn {
  display: inline-block;
  padding: 15px 30px;
  border-radius: var(--myth-radius);
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease,
    border-color 0.3s ease, color 0.3s ease;
}

.myth-btn--primary {
  background: linear-gradient(160deg, var(--myth-gold-light), var(--myth-gold) 55%, var(--myth-gold-deep));
  color: #1c1608;
  box-shadow: 0 10px 24px -8px rgba(201, 162, 75, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.myth-btn--primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 34px -8px rgba(201, 162, 75, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.myth-btn--outline {
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: var(--myth-text-light);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(6px);
}

.myth-btn--outline:hover {
  border-color: var(--myth-gold);
  color: var(--myth-gold-light);
  background: rgba(201, 162, 75, 0.08);
  transform: translateY(-3px);
}

.myth-btn--lg {
  padding: 18px 40px;
  font-size: 16px;
}

/* ─── Hero ────────────────────────────────────── */
.myth-hero {
  position: relative;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  box-sizing: border-box;
  padding: 60px 5% 100px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 56px;
}

.myth-hero__sparks {
  position: absolute;
  top: 60px;
  right: 60px;
  width: 2px;
  height: 2px;
  box-shadow: 120px 40px 0 0 var(--myth-gold), 260px 160px 0 0 rgba(255, 255, 255, 0.5),
    60px 220px 0 0 var(--myth-gold), 340px 30px 0 0 rgba(255, 255, 255, 0.4);
  animation: myth-twinkle 3s ease-in-out infinite;
  pointer-events: none;
}

.myth-hero__ember {
  position: absolute;
  bottom: 0;
  border-radius: 50%;
  pointer-events: none;
}

.myth-hero__ember--1 {
  left: 38%;
  width: 6px;
  height: 6px;
  background: var(--myth-gold);
  box-shadow: 0 0 8px 2px rgba(201, 162, 75, 0.53);
  animation: myth-ember 6s ease-in infinite;
}

.myth-hero__ember--2 {
  left: 52%;
  bottom: 10px;
  width: 4px;
  height: 4px;
  background: var(--myth-gold);
  box-shadow: 0 0 6px 2px rgba(201, 162, 75, 0.53);
  animation: myth-ember 7.5s ease-in infinite 1.5s;
}

.myth-hero__ember--3 {
  left: 44%;
  bottom: 30px;
  width: 5px;
  height: 5px;
  background: var(--myth-secondary);
  box-shadow: 0 0 6px 2px rgba(122, 79, 163, 0.53);
  animation: myth-ember 8.5s ease-in infinite 3s;
}

.myth-hero__text {
  flex: 1;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 26px;
  z-index: 1;
}

.myth-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--myth-gold);
  font-weight: 600;
}

.myth-eyebrow__mark {
  width: 7px;
  height: 7px;
  background: var(--myth-gold);
  transform: rotate(45deg);
  flex-shrink: 0;
}

.myth-hero__title {
  font-size: clamp(32px, 5vw, 56px);
  line-height: 1.1;
  font-weight: 600;
  max-width: 15ch;
}

.myth-hero__title-accent {
  background: linear-gradient(100deg, var(--myth-gold-light), var(--myth-gold) 60%, var(--myth-secondary));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.myth-hero__subtitle {
  margin: 0;
  font-size: 17px;
  line-height: 1.6;
  color: var(--myth-text-muted);
  max-width: 460px;
}

.myth-hero__cta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
}

.myth-hero__phone {
  flex: none;
  width: min(300px, 100%);
  z-index: 1;
}

.myth-phone-frame {
  border-radius: 44px;
  background:
    linear-gradient(var(--myth-bg1), var(--myth-bg1)) padding-box,
    linear-gradient(155deg, rgba(201, 162, 75, 0.65), rgba(138, 92, 194, 0.5) 60%, rgba(255, 255, 255, 0.08)) border-box;
  border: 6px solid transparent;
  box-shadow: 0 50px 100px rgba(0, 0, 0, 0.55), 0 0 70px -14px rgba(201, 162, 75, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.03);
  position: relative;
  overflow: hidden;
}

.myth-phone-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  display: block;
}

.myth-phone-frame--hero {
  width: min(300px, 100%);
  height: 610px;
  max-height: 610px;
}

.myth-phone-frame--showcase {
  width: 220px;
  height: 450px;
  border-radius: 34px;
  border-width: 5px;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.4);
  transition: box-shadow 0.35s ease, transform 0.35s ease;
}

.myth-showcase-item:hover .myth-phone-frame--showcase {
  transform: translateY(-6px);
  box-shadow: 0 30px 60px -10px rgba(201, 162, 75, 0.27);
}

/* ─── Sections (shared) ───────────────────────── */
.myth-section {
  padding: 96px 5%;
  box-sizing: border-box;
}

.myth-section--muted {
  background: var(--myth-bg1);
}

.myth-section__inner {
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 56px;
}

.myth-section__head {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
}

.myth-eyebrow-label {
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--myth-gold);
  font-weight: 600;
}

.myth-section__title {
  font-size: 34px;
  font-weight: 600;
}

/* ─── Для кого ────────────────────────────────── */
.myth-role-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
}

.myth-role-card {
  flex: 1;
  min-width: 280px;
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0) 40%), var(--myth-bg0);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 20px;
  padding: 40px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease,
    border-color 0.35s ease;
}

.myth-role-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 24px 48px -14px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  border-color: rgba(201, 162, 75, 0.35);
}

.myth-role-card__avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 0 4px var(--myth-bg0);
}

.myth-role-card__avatar--gold {
  background:
    linear-gradient(var(--myth-bg0), var(--myth-bg0)) padding-box,
    linear-gradient(155deg, var(--myth-gold-light), var(--myth-gold-deep)) border-box;
  border: 2px solid transparent;
  box-shadow: 0 0 0 4px var(--myth-bg0), 0 8px 20px -6px rgba(201, 162, 75, 0.45);
}

.myth-role-card__avatar--secondary {
  background:
    linear-gradient(var(--myth-bg0), var(--myth-bg0)) padding-box,
    linear-gradient(155deg, #b491df, var(--myth-secondary)) border-box;
  border: 2px solid transparent;
  box-shadow: 0 0 0 4px var(--myth-bg0), 0 8px 20px -6px rgba(122, 79, 163, 0.45);
}

.myth-role-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.myth-role-card__title {
  font-size: 24px;
  font-weight: 600;
}

.myth-role-card__list {
  display: flex;
  flex-direction: column;
  gap: 11px;
  font-size: 15px;
  color: var(--myth-text-muted);
}

/* ─── Фичи ────────────────────────────────────── */
.myth-feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}

.myth-feature-card {
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0) 45%), var(--myth-bg1);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease,
    border-color 0.35s ease;
}

.myth-feature-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 24px 48px -16px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  border-color: rgba(201, 162, 75, 0.28);
}

.myth-feature-card__image {
  height: 110px;
  position: relative;
  overflow: hidden;
}

.myth-feature-card__image::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(20, 20, 26, 0) 0%, var(--myth-bg1) 96%);
}

.myth-feature-card__image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.myth-feature-card__body {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.myth-feature-card__swatch {
  width: 36px;
  height: 36px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.myth-feature-card__swatch--gold {
  background: linear-gradient(155deg, var(--myth-gold-light), var(--myth-gold-deep));
}

.myth-feature-card__swatch--secondary {
  background: linear-gradient(155deg, #b491df, var(--myth-secondary) 70%);
}

.myth-feature-card__title {
  font-size: 19px;
  font-weight: 600;
}

.myth-feature-card__desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--myth-text-muted);
}

/* ─── Витрина ─────────────────────────────────── */
.myth-section--showcase {
  background-size: cover;
  background-position: center 35%;
  background-repeat: no-repeat;
  position: relative;
}

.myth-section--showcase::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(27, 27, 35, 0.96),
    rgba(27, 27, 35, 0.96)
  );
}

.myth-section--showcase .myth-section__inner {
  position: relative;
  z-index: 1;
}

.myth-showcase-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  justify-content: center;
}

.myth-showcase-item {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.myth-showcase-item__caption {
  font-size: 14px;
  font-weight: 600;
  color: var(--myth-text-light);
}

/* ─── Офлайн ──────────────────────────────────── */
.myth-offline {
  max-width: 1120px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  padding: 64px 5%;
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 40px;
  background-size: cover;
  background-position: center 25%;
}

.myth-offline::after {
  content: "";
  position: absolute;
  inset: 0;
  background: #232330;
  opacity: 0.92;
}

.myth-offline__glow {
  position: absolute;
  left: -40px;
  top: -40px;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 162, 75, 0.13), transparent 70%);
  animation: myth-pulse-glow 5s ease-in-out infinite;
  pointer-events: none;
}

.myth-offline__icon {
  flex: none;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background:
    linear-gradient(#232330, #232330) padding-box,
    linear-gradient(155deg, var(--myth-gold-light), var(--myth-secondary)) border-box;
  border: 2px solid transparent;
  box-shadow: 0 0 24px -6px rgba(201, 162, 75, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.myth-offline__icon-inner {
  width: 40px;
  height: 56px;
  border: 2px solid var(--myth-gold);
  border-radius: 8px;
}

.myth-offline__icon-slash {
  position: absolute;
  width: 70px;
  height: 2px;
  background: var(--myth-gold);
  transform: rotate(45deg);
}

.myth-offline__text {
  display: flex;
  flex-direction: column;
  gap: 14px;
  z-index: 1;
}

.myth-offline__title {
  font-size: 28px;
  font-weight: 600;
}

.myth-offline__desc {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: var(--myth-text-muted);
  max-width: 560px;
}

/* ─── Финал CTA ───────────────────────────────── */
.myth-final {
  position: relative;
  overflow: hidden;
  padding: 120px 5%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  text-align: center;
  background-size: cover;
  background-position: center 20%;
}

.myth-final::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--myth-bg1);
  opacity: 0.92;
}

.myth-final__glow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 520px;
  height: 520px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 162, 75, 0.1), transparent 65%);
  animation: myth-pulse-glow 6s ease-in-out infinite;
  pointer-events: none;
}

.myth-final__title {
  font-size: 44px;
  font-weight: 600;
  position: relative;
  z-index: 1;
}

.myth-final__desc {
  margin: 0;
  font-size: 16px;
  color: var(--myth-text-muted);
  max-width: 420px;
  position: relative;
  z-index: 1;
}

.myth-final__cta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.myth-final .myth-btn--primary:hover {
  transform: translateY(-4px) scale(1.03);
  box-shadow: 0 16px 36px -8px rgba(201, 162, 75, 0.67);
}

/* ─── Footer ──────────────────────────────────── */
.myth-footer {
  padding: 36px 5% calc(36px + var(--sab, 0px));
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  font-size: 13px;
  color: var(--myth-text-muted);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.myth-footer__links {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.myth-footer__contacts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.myth-footer__contacts-label {
  color: var(--myth-text-muted);
}

.myth-footer__link {
  color: var(--myth-text-muted);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.myth-footer__link:hover {
  color: var(--myth-gold-light);
}

.myth-footer__legal-btn {
  cursor: pointer;
  transition: color 0.2s ease;
}

.myth-footer__legal-btn:hover {
  color: var(--myth-gold-light);
}

.legal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  backdrop-filter: blur(4px);
}

.legal-modal {
  position: relative;
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.legal-modal__close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  padding: 4px;
  transition: color 0.2s;
}

.legal-modal__close:hover {
  color: #fff;
}

.legal-modal__title {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.legal-modal__text {
  font-size: 14px;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 16px;
}

.legal-modal__text:last-child {
  margin-bottom: 0;
}

.legal-modal__link {
  color: var(--myth-gold-light, #c9a84c);
  word-break: break-all;
  text-decoration: none;
}

.legal-modal__link:hover {
  text-decoration: underline;
}
</style>
