<script setup lang="ts">
import {
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonPage,
    IonSpinner,
    IonToolbar,
    toastController,
    useIonRouter,
} from "@ionic/vue";
import {computed, onMounted, ref} from "vue";
import {useSubscriptionStore} from "@/stores/SubscriptionStore";
import type {SubscriptionTier} from "@/api/subscriptionApi.types";

const ionRouter = useIonRouter();
const store = useSubscriptionStore();

const period = ref<"month" | "year">("month");
const selectedPlan = ref<SubscriptionTier>("MASTER");
const purchasing = ref(false);

const TIER_LABELS: Record<SubscriptionTier, string> = {
    FREE: "Бесплатно",
    PLAYER_PLUS: "Игрок+",
    MASTER: "Мастер",
};

const plans = computed(() =>
    store.plans.filter((p) => p.tier !== "FREE")
);

function planPrice(tier: SubscriptionTier): string {
    const plan = store.plans.find((p) => p.tier === tier);
    if (!plan) return "";
    const price = period.value === "month" ? plan.priceMonthly : plan.priceYearly;
    return `${price} ₽`;
}

function planPriceSuffix(tier: SubscriptionTier): string {
    return period.value === "month" ? "/мес" : "/год";
}

const ctaLabel = computed(() => {
    const name = TIER_LABELS[selectedPlan.value] ?? selectedPlan.value;
    return `Оформить ${name} — ${planPrice(selectedPlan.value)}${planPriceSuffix(selectedPlan.value)}`;
});

async function purchase() {
    purchasing.value = true;
    try {
        await store.purchase(selectedPlan.value);
        const toast = await toastController.create({
            message: "Подписка активирована!",
            duration: 1800,
            position: "top",
            color: "success",
        });
        await toast.present();
        ionRouter.back();
    } catch {
        const toast = await toastController.create({
            message: "Ошибка оформления подписки",
            duration: 2000,
            position: "top",
            color: "danger",
        });
        await toast.present();
    } finally {
        purchasing.value = false;
    }
}

onMounted(() => store.load());
</script>

<template>
    <ion-page>
        <ion-header>
            <ion-toolbar color="dark">
                <ion-buttons slot="start">
                    <ion-back-button default-href="/rooms"/>
                </ion-buttons>
                <span class="toolbar-title">Свиток покровителя</span>
            </ion-toolbar>
        </ion-header>

        <ion-content color="dark" class="paywall-content">
            <div class="paywall-scroll">

                <!-- Hero -->
                <div class="hero">
                    <span class="hero__rune">✦</span>
                    <h2 class="hero__title">Ведите кампанию<br>без ограничений</h2>
                    <p class="hero__sub">Комнаты, безлимитный хомбрю, файлы и кристаллы для генерации артов — в одной подписке.</p>
                </div>

                <!-- Period toggle -->
                <div class="period-toggle">
                    <button
                        :class="['period-btn', {active: period === 'month'}]"
                        @click="period = 'month'"
                    >Месяц</button>
                    <button
                        :class="['period-btn', {active: period === 'year'}]"
                        @click="period = 'year'"
                    >Год <span class="save-pill">−17%</span></button>
                </div>

                <!-- Current tier banner -->
                <div v-if="store.subscription" class="current-tier-banner">
                    Текущий тариф: <strong>{{ TIER_LABELS[store.subscription.tier] ?? store.subscription.tier }}</strong>
                </div>

                <!-- Plan cards -->
                <div v-if="store.loading" class="loading-wrap">
                    <ion-spinner name="crescent" color="primary"/>
                </div>
                <template v-else>
                    <!-- Мастер -->
                    <div
                        :class="['plan-card', {selected: selectedPlan === 'MASTER'}]"
                        @click="selectedPlan = 'MASTER'"
                    >
                        <span class="plan-badge">Для мастера</span>
                        <div class="plan-head">
                            <span class="plan-name">Мастер</span>
                            <span class="plan-price">{{ planPrice('MASTER') }}<small>{{ planPriceSuffix('MASTER') }}</small></span>
                        </div>
                        <div class="plan-sub">Всё для ведения кампаний</div>
                        <ul class="plan-features">
                            <li><span class="tick">✓</span>Неограниченное кол-во комнат</li>
                            <li><span class="tick">✓</span>Публичные комнаты</li>
                            <li><span class="tick">✓</span>Безлимитные персонажи</li>
                            <li><span class="tick">✓</span>Хомбрю без ограничений</li>
                            <li><span class="tick">✓</span>Экспорт и импорт кампаний</li>
                            <li class="gold"><span class="tick gold-tick">✦</span>40 кристаллов каждый месяц</li>
                        </ul>
                    </div>

                    <!-- Игрок+ -->
                    <div
                        :class="['plan-card', {selected: selectedPlan === 'PLAYER_PLUS'}]"
                        @click="selectedPlan = 'PLAYER_PLUS'"
                    >
                        <div class="plan-head">
                            <span class="plan-name">Игрок+</span>
                            <span class="plan-price">{{ planPrice('PLAYER_PLUS') }}<small>{{ planPriceSuffix('PLAYER_PLUS') }}</small></span>
                        </div>
                        <div class="plan-sub">Для игрока с несколькими героями</div>
                        <ul class="plan-features">
                            <li><span class="tick">✓</span>1 приватная комната</li>
                            <li><span class="tick">✓</span>Безлимитные персонажи</li>
                            <li class="gold"><span class="tick gold-tick">✦</span>15 кристаллов каждый месяц</li>
                        </ul>
                    </div>
                </template>
            </div>

            <!-- CTA footer -->
            <div class="cta-wrap">
                <button class="cta-btn" :disabled="purchasing" @click="purchase">
                    <ion-spinner v-if="purchasing" name="crescent" color="dark" style="width:20px;height:20px"/>
                    <template v-else>{{ ctaLabel }}</template>
                </button>
                <p class="cta-note">Отмена в любой момент. Кристаллы обновляются ежемесячно и не переносятся.</p>
            </div>
        </ion-content>
    </ion-page>
</template>

<style scoped>
.paywall-content {
    --background: #0d0b12;
}

.toolbar-title {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.01em;
}

.paywall-scroll {
    padding: 16px 16px 120px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

/* Hero */
.hero {
    position: relative;
    border-radius: 20px;
    padding: 24px 20px 20px;
    background:
        radial-gradient(120% 90% at 80% -10%, rgba(139,110,240,.35), transparent 60%),
        radial-gradient(100% 80% at 10% 110%, rgba(232,193,90,.12), transparent 55%),
        #1f1a2b;
    border: 1px solid #2c2540;
    overflow: hidden;
}

.hero__rune {
    position: absolute;
    right: -14px;
    top: -18px;
    font-size: 100px;
    opacity: .08;
    transform: rotate(12deg);
    pointer-events: none;
}

.hero__title {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.15;
    margin-bottom: 8px;
    color: #f0edf7;
}

.hero__sub {
    color: #9a91b5;
    font-size: 13.5px;
    line-height: 1.5;
}

/* Period toggle */
.period-toggle {
    display: flex;
    background: #17141f;
    border: 1px solid #2c2540;
    border-radius: 999px;
    padding: 4px;
    align-self: center;
    gap: 0;
}

.period-btn {
    border: none;
    background: transparent;
    color: #9a91b5;
    font-size: 14px;
    font-weight: 600;
    padding: 8px 20px;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
}

.period-btn.active {
    background: linear-gradient(135deg, #cfc0fa, #a78bfa);
    color: #14101f;
}

.save-pill {
    font-size: 10px;
    font-weight: 700;
    color: #e8c15a;
    background: rgba(232, 193, 90, .14);
    border: 1px solid rgba(232, 193, 90, .35);
    padding: 1px 6px;
    border-radius: 999px;
}

/* Current tier banner */
.current-tier-banner {
    text-align: center;
    font-size: 13px;
    color: #9a91b5;
    padding: 8px;
    border-radius: 12px;
    border: 1px solid #2c2540;
    background: #17141f;
}

/* Plan cards */
.plan-card {
    border-radius: 20px;
    border: 1px solid #2c2540;
    background: #17141f;
    padding: 20px 18px 18px;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
    position: relative;
}

.plan-card.selected {
    border-color: #b39df5;
    box-shadow: 0 0 0 1px #b39df5, 0 12px 40px rgba(139,110,240,.22);
    background: linear-gradient(180deg, rgba(139,110,240,.10), rgba(139,110,240,.02)), #17141f;
}

.plan-badge {
    position: absolute;
    top: -11px;
    left: 18px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    background: linear-gradient(135deg, #cfc0fa, #8b6ef0);
    color: #14101f;
    padding: 4px 12px;
    border-radius: 999px;
}

.plan-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 4px;
}

.plan-name {
    font-size: 22px;
    font-weight: 700;
    color: #f0edf7;
}

.plan-price {
    font-size: 19px;
    font-weight: 700;
    color: #f0edf7;
}

.plan-price small {
    font-size: 12px;
    color: #9a91b5;
    font-weight: 500;
}

.plan-sub {
    color: #9a91b5;
    font-size: 13px;
    margin-bottom: 14px;
}

.plan-features {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.plan-features li {
    display: flex;
    gap: 10px;
    font-size: 13.5px;
    line-height: 1.35;
    color: #f0edf7;
    align-items: flex-start;
}

.plan-features li.gold {
    color: #f4e3b0;
}

.tick {
    flex: 0 0 auto;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(179, 157, 245, .16);
    color: #b39df5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    margin-top: 1px;
}

.gold-tick {
    background: rgba(232, 193, 90, .15);
    color: #e8c15a;
}

.loading-wrap {
    display: flex;
    justify-content: center;
    padding: 40px;
}

/* CTA */
.cta-wrap {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 16px max(16px, env(safe-area-inset-bottom));
    background: linear-gradient(180deg, transparent, #0d0b12 30%);
    border-top: 1px solid #2c2540;
}

.cta-btn {
    width: 100%;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 16px;
    font-weight: 700;
    color: #14101f;
    padding: 16px;
    border-radius: 16px;
    background: linear-gradient(135deg, #d8ccfa, #a78bfa);
    box-shadow: 0 10px 30px rgba(139, 110, 240, .35);
    transition: transform 0.15s, opacity 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 52px;
}

.cta-btn:active {
    transform: scale(.98);
}

.cta-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.cta-note {
    text-align: center;
    color: #9a91b5;
    font-size: 11px;
    margin-top: 8px;
    line-height: 1.4;
}
</style>
