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
import {useCrystalsStore} from "@/stores/CrystalsStore";
import {useSubscriptionStore} from "@/stores/SubscriptionStore";

const ionRouter = useIonRouter();
const crystalsStore = useCrystalsStore();
const subscriptionStore = useSubscriptionStore();

const selectedPack = ref<string>("30");
const buying = ref(false);

const PACK_ICONS: Record<string, string> = {
    "10": "💠",
    "30": "💎",
    "100": "👑",
};

const selectedPackData = computed(() =>
    crystalsStore.packs.find((p) => p.id === selectedPack.value)
);

const ctaLabel = computed(() => {
    const pack = selectedPackData.value;
    if (!pack) return "Купить кристаллы";
    return `Купить ${pack.amount} кристаллов — ${pack.price} ₽`;
});

const monthlyBonus = computed(() => {
    const tier = subscriptionStore.subscription?.tier;
    if (tier === "MASTER") return 40;
    if (tier === "PLAYER_PLUS") return 15;
    return null;
});

async function buy() {
    buying.value = true;
    try {
        await crystalsStore.buyPack(selectedPack.value);
        const pack = selectedPackData.value;
        const toast = await toastController.create({
            message: `+${pack?.amount ?? ""} кристаллов зачислено!`,
            duration: 1800,
            position: "top",
            color: "success",
        });
        await toast.present();
    } catch (e: unknown) {
        const toast = await toastController.create({
            message: "Ошибка покупки",
            duration: 2000,
            position: "top",
            color: "danger",
        });
        await toast.present();
    } finally {
        buying.value = false;
    }
}

onMounted(async () => {
    await Promise.all([crystalsStore.load(), subscriptionStore.load()]);
    if (crystalsStore.packs.length) selectedPack.value = crystalsStore.packs[1]?.id ?? crystalsStore.packs[0].id;
});
</script>

<template>
    <ion-page>
        <ion-header>
            <ion-toolbar color="dark">
                <ion-buttons slot="start">
                    <ion-back-button default-href="/rooms"/>
                </ion-buttons>
                <span class="toolbar-title">Кристаллы творения</span>
            </ion-toolbar>
        </ion-header>

        <ion-content color="dark" class="crystals-content">
            <div class="crystals-scroll">

                <!-- Balance card -->
                <div class="balance-card">
                    <span class="balance-crystal">🔮</span>
                    <div class="balance-num">{{ crystalsStore.loading ? "…" : crystalsStore.balance }}</div>
                    <div class="balance-cap">кристаллов на балансе · 1 кристалл = 1 генерация арта</div>
                    <span v-if="monthlyBonus" class="balance-sub-hint">
                        ✦ По подписке — {{ monthlyBonus }} кристаллов каждый месяц
                    </span>
                </div>

                <!-- Section title -->
                <div class="section-title">Пакеты</div>

                <!-- Packs -->
                <div v-if="crystalsStore.loading" class="loading-wrap">
                    <ion-spinner name="crescent" color="primary"/>
                </div>
                <template v-else>
                    <div
                        v-for="pack in crystalsStore.packs"
                        :key="pack.id"
                        :class="['pack-card', {selected: selectedPack === pack.id}]"
                        @click="selectedPack = pack.id"
                    >
                        <span v-if="pack.tag" :class="['pack-tag', pack.id === '100' ? 'pack-tag--best' : 'pack-tag--pop']">
                            {{ pack.tag }}
                        </span>
                        <div class="pack-gem">{{ PACK_ICONS[pack.id] ?? "💠" }}</div>
                        <div class="pack-info">
                            <div class="pack-amt">{{ pack.amount }} кристаллов</div>
                            <div class="pack-per">{{ pack.pricePerCrystal.toFixed(1) }} ₽ за кристалл</div>
                        </div>
                        <div class="pack-price">{{ pack.price }} ₽</div>
                    </div>
                </template>

                <!-- Usage note -->
                <div class="usage-note">
                    <span class="usage-note__icon">✦</span>
                    <span>Кристаллы тратятся на портреты персонажей, NPC, предметы и питомцев. Каждая перегенерация — 1 кристалл. Купленные кристаллы не сгорают.</span>
                </div>
            </div>

            <!-- CTA -->
            <div class="cta-wrap">
                <button class="cta-btn" :disabled="buying || !selectedPackData" @click="buy">
                    <ion-spinner v-if="buying" name="crescent" color="dark" style="width:20px;height:20px"/>
                    <template v-else>{{ ctaLabel }}</template>
                </button>
            </div>
        </ion-content>
    </ion-page>
</template>

<style scoped>
.crystals-content {
    --background: #0d0b12;
}

.toolbar-title {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.01em;
}

.crystals-scroll {
    padding: 16px 16px 100px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* Balance */
.balance-card {
    border-radius: 20px;
    border: 1px solid #2c2540;
    background:
        radial-gradient(130% 100% at 50% -20%, rgba(139,110,240,.30), transparent 65%),
        #1f1a2b;
    padding: 24px 20px;
    text-align: center;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.balance-crystal {
    font-size: 40px;
    display: block;
    filter: drop-shadow(0 0 14px rgba(179,157,245,.8));
    animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
    0%,100% { filter: drop-shadow(0 0 10px rgba(179,157,245,.55)); }
    50%      { filter: drop-shadow(0 0 22px rgba(179,157,245,.95)); }
}

@media (prefers-reduced-motion: reduce) {
    .balance-crystal { animation: none; }
}

.balance-num {
    font-size: 52px;
    font-weight: 700;
    line-height: 1;
    color: #f0edf7;
}

.balance-cap {
    color: #9a91b5;
    font-size: 13px;
    margin-top: 4px;
}

.balance-sub-hint {
    display: inline-block;
    margin-top: 10px;
    font-size: 12px;
    color: #b39df5;
    background: rgba(139,110,240,.12);
    border: 1px solid rgba(139,110,240,.3);
    padding: 5px 12px;
    border-radius: 999px;
}

/* Section title */
.section-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: #9a91b5;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 4px 2px 0;
}

.section-title::after {
    content: "";
    flex: 1;
    height: 1px;
    background: #2c2540;
}

/* Packs */
.pack-card {
    display: flex;
    align-items: center;
    gap: 14px;
    border-radius: 18px;
    border: 1px solid #2c2540;
    background: #17141f;
    padding: 16px;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
    position: relative;
}

.pack-card.selected {
    border-color: #b39df5;
    box-shadow: 0 0 0 1px #b39df5, 0 10px 34px rgba(139,110,240,.2);
    background: linear-gradient(180deg, rgba(139,110,240,.10), rgba(139,110,240,.02)), #17141f;
}

.pack-tag {
    position: absolute;
    top: -10px;
    right: 14px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 999px;
}

.pack-tag--pop  { background: linear-gradient(135deg,#cfc0fa,#8b6ef0); color: #14101f; }
.pack-tag--best { background: linear-gradient(135deg,#f0d689,#d8a944); color: #241a05; }

.pack-gem {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    background: rgba(139,110,240,.12);
    border: 1px solid rgba(139,110,240,.25);
}

.pack-info { flex: 1; }

.pack-amt {
    font-size: 16px;
    font-weight: 700;
    color: #f0edf7;
}

.pack-per {
    font-size: 12px;
    color: #9a91b5;
    margin-top: 2px;
}

.pack-price {
    font-size: 17px;
    font-weight: 700;
    color: #f0edf7;
    text-align: right;
}

/* Usage note */
.usage-note {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    border-radius: 14px;
    background: rgba(232,193,90,.07);
    border: 1px solid rgba(232,193,90,.18);
    padding: 12px 14px;
    font-size: 12.5px;
    color: #d9c485;
    line-height: 1.45;
    margin-top: 4px;
}

.usage-note__icon { flex: 0 0 auto; }

.loading-wrap {
    display: flex;
    justify-content: center;
    padding: 32px;
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
    box-shadow: 0 10px 30px rgba(139,110,240,.35);
    transition: transform 0.15s, opacity 0.15s;
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.cta-btn:active  { transform: scale(.98); }
.cta-btn:disabled { opacity: 0.7; cursor: not-allowed; }
</style>
