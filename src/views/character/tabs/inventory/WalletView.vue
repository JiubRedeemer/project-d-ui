<script setup lang="ts">
import {IonButton, IonIcon, IonInput, IonSelect, IonSelectOption} from "@ionic/vue";
import goldenCoinIcon from "@/static/icons/GoldenCoin.svg";
import silverCoinIcon from "@/static/icons/SilverCoin.svg";
import copperCoinIcon from "@/static/icons/CopperCoin.svg";
import electrumCoinIcon from "@/static/icons/ElectrumCoin.svg";
import platinumCoinIcon from "@/static/icons/PlatinumCoin.svg";
import {useWalletStore} from "@/stores/WalletStore";
import {computed, ref, watch} from "vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";

const route = useRoute();

const walletStore = useWalletStore();

// Ссылка на элемент IonInput
const inputRef = ref<InstanceType<typeof IonInput> | null>(null);

// Отслеживание изменения moneyExpanded
watch(
    () => walletStore.moneyExpanded,
    (newValue) => {
      if (newValue && inputRef.value) {
        // Устанавливаем фокус на input
        inputRef.value.$el.setFocus();
      }
    }
);

type CoinType = "copper_coin" | "silver_coin" | "electrum_coin" | "golden_coin" | "platinum_coin";

// Стоимость монеты в золотых (GP)
const COIN_VALUE_GP: Record<CoinType, number> = {
  copper_coin: 0.01,
  silver_coin: 0.1,
  electrum_coin: 0.5,
  golden_coin: 1,
  platinum_coin: 10,
};

const COINS: { type: CoinType; label: string; short: string; icon: string; field: keyof NonNullable<typeof walletStore.userMoney> }[] = [
  {type: "copper_coin", label: "медные монеты", short: "мм.", icon: copperCoinIcon, field: "copperCount"},
  {type: "silver_coin", label: "серебряные монеты", short: "см.", icon: silverCoinIcon, field: "silverCount"},
  {type: "golden_coin", label: "золотые монеты", short: "зм.", icon: goldenCoinIcon, field: "goldenCount"},
  {type: "electrum_coin", label: "электрумовые монеты", short: "эм.", icon: electrumCoinIcon, field: "electrumCount"},
  {type: "platinum_coin", label: "платиновые монеты", short: "пм.", icon: platinumCoinIcon, field: "platinumCount"},
];

const exchangeCount = computed(() => Number(walletStore.wallet.count) || 0);

const sourceType = computed<CoinType>(() => (walletStore.wallet.type as CoinType) ?? "golden_coin");

// Кол-во монет-источника у пользователя
const sourceOwnedCount = computed(() => {
  if (!walletStore.userMoney) return 0;
  const field = COINS.find(c => c.type === sourceType.value)?.field;
  return field ? Number((walletStore.userMoney as any)[field]) || 0 : 0;
});

const hasEnoughSourceCoins = computed(() =>
    exchangeCount.value > 0 && sourceOwnedCount.value >= exchangeCount.value
);

// Сколько получится монет targetType из exchangeCount монет sourceType
function convertTo(targetType: CoinType): number {
  return exchangeCount.value * COIN_VALUE_GP[sourceType.value] / COIN_VALUE_GP[targetType];
}

function isIntegerResult(targetType: CoinType): boolean {
  return Number.isInteger(convertTo(targetType));
}

// Целевые монеты для кнопок обмена (все, кроме источника)
const exchangeTargets = computed(() => COINS.filter(c => c.type !== sourceType.value));

async function exchangeCoins(targetType: CoinType) {
  if (!walletStore.userMoney || !hasEnoughSourceCoins.value || !isIntegerResult(targetType)) return;

  const source = COINS.find(c => c.type === sourceType.value)!;
  const target = COINS.find(c => c.type === targetType)!;
  const gained = convertTo(targetType);

  const money = walletStore.userMoney as any;
  money[source.field] = Number(money[source.field]) - exchangeCount.value;
  money[target.field] = Number(money[target.field]) + gained;

  await exchangeMoneyRequest();
}

async function exchangeMoneyRequest() {
  if (!walletStore.userMoney) return;
  const money = walletStore.userMoney as any;
  try {
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.money}`,
        {
          "id": money.id ?? "",
          "inventoryId": money.inventoryId ?? "",
          "goldenCount": money.goldenCount,
          "silverCount": money.silverCount,
          "copperCount": money.copperCount,
          "electrumCount": money.electrumCount,
          "platinumCount": money.platinumCount,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
    walletStore.wallet.count = undefined;
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
}
</script>

<template>
  <div class="input-block">
    <ion-input
        ref="inputRef"
        class="ion-text-right input-string"
        fill="outline"
        inputmode="numeric"
        v-model="walletStore.wallet.count"
    >
      <ion-select slot="start" aria-label="Coin" interface="popover" v-model="walletStore.wallet.type">
        <ion-select-option v-for="coin in COINS" :key="coin.type" :value="coin.type">{{ coin.short }}</ion-select-option>
      </ion-select>
    </ion-input>
    <div class="exchange-buttons">
      <ion-button
          v-for="target in exchangeTargets"
          :key="target.type"
          class="exchange-button"
          fill="outline"
          shape="default"
          expand="block"
          size="small"
          :disabled="!isIntegerResult(target.type) || !hasEnoughSourceCoins"
          @click="exchangeCoins(target.type)"
      >
        <span class="ion-text-left exchange-button-name">Обменять на {{ target.label }}</span>
        <div class="exchange-end">
          <div class="exchange-button-value">={{ convertTo(target.type).toFixed(1) }}</div>
          <ion-icon class="exchange-button-icon" size="small" slot="end" :src="target.icon"></ion-icon>
        </div>
      </ion-button>
    </div>
  </div>
</template>

<style scoped>
.input-block {
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 10px;
}

ion-button {
  text-transform: none;
}

.input-string {
  width: 100%;
  height: 1px;
}

.exchange-buttons {
  width: 85%;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.exchange-button {
  --border-radius: 15px;
}

.exchange-to-person-button {
  margin-top: 15px;
  --border-radius: 15px;
  --border-width: 1px;
  width: 50%;
}

ion-button {
  span {
    text-align: left;
    width: 100%;
  }
}

.exchange-button-name {
  font-size: 10px;
  display: flex;
  flex-direction: row;
  justify-content: start;
}

.exchange-button-value {
  font-size: 10px;
}

.exchange-button-icon {
  width: 10px;
}

.exchange-end {
  display: flex;
  flex-direction: row;
  align-items: center;
}

ion-popover:not(.overlay-hidden) {
  aria-hidden: false !important;
}
</style>
