<script setup lang="ts">
import {IonButton, IonIcon, IonInput, IonSelect, IonSelectOption} from "@ionic/vue";
import goldenCoinIcon from "@/static/icons/GoldenCoin.svg";
import silverCoinIcon from "@/static/icons/SilverCoin.svg";
import copperCoinIcon from "@/static/icons/CopperCoin.svg";
import {person} from "ionicons/icons";
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

const EXCHANGE_RATES = {
  golden_coin: {silver_coin: 10, copper_coin: 100},
  silver_coin: {golden_coin: 0.1, copper_coin: 10},
  copper_coin: {golden_coin: 0.01, silver_coin: 0.1},
};

// Вычисляемые значения для кнопок обмена
const toGolden = computed(() => {
  const count = Number(walletStore.wallet.count) || 0;
  if (walletStore.wallet.type === "golden_coin") return count;
  if (walletStore.wallet.type === "silver_coin") return count * EXCHANGE_RATES.silver_coin.golden_coin;
  return count * EXCHANGE_RATES.copper_coin.golden_coin;
});

const toSilver = computed(() => {
  const count = Number(walletStore.wallet.count) || 0;
  if (walletStore.wallet.type === "silver_coin") return count;
  if (walletStore.wallet.type === "golden_coin") return count * EXCHANGE_RATES.golden_coin.silver_coin;
  return count * EXCHANGE_RATES.copper_coin.silver_coin;
});

const toCopper = computed(() => {
  const count = Number(walletStore.wallet.count) || 0;
  if (walletStore.wallet.type === "copper_coin") return count;
  if (walletStore.wallet.type === "golden_coin") return count * EXCHANGE_RATES.golden_coin.copper_coin;
  return count * EXCHANGE_RATES.silver_coin.copper_coin;
});
const isGoldenInteger = computed(() => Number.isInteger(toGolden.value));
const isSilverInteger = computed(() => Number.isInteger(toSilver.value));
const isCopperInteger = computed(() => Number.isInteger(toCopper.value));

async function exchangeCoins(exchangeType: string) {
  if (!(walletStore && walletStore.userMoney && walletStore.wallet && walletStore.wallet.count)) {
    return;
  }
  switch (exchangeType) {
    case "to_golden_coin":
      switch (walletStore.wallet.type) {
        case "golden_coin":
          break;
        case "silver_coin":
          walletStore.userMoney.silverCount = walletStore.userMoney.silverCount - walletStore.wallet.count;
          walletStore.userMoney.goldenCount = walletStore.userMoney.goldenCount + toGolden.value;
          break;
        case "copper_coin":
          walletStore.userMoney.copperCount = walletStore.userMoney.copperCount - walletStore.wallet.count;
          walletStore.userMoney.goldenCount = walletStore.userMoney.goldenCount + toGolden.value;
          break;
      }
      break;
    case "to_silver_coin":
      switch (walletStore.wallet.type) {
        case "golden_coin":
          walletStore.userMoney.goldenCount = walletStore.userMoney.goldenCount - walletStore.wallet.count;
          walletStore.userMoney.silverCount = walletStore.userMoney.silverCount + toSilver.value;
          break;
        case "silver_coin":
          break;
        case "copper_coin":
          walletStore.userMoney.copperCount = walletStore.userMoney.copperCount - walletStore.wallet.count;
          walletStore.userMoney.silverCount = walletStore.userMoney.silverCount + toSilver.value;
          break;
      }
      break;
    case "to_copper_coin":
      switch (walletStore.wallet.type) {
        case "golden_coin":
          walletStore.userMoney.goldenCount = walletStore.userMoney.goldenCount - walletStore.wallet.count;
          walletStore.userMoney.copperCount = walletStore.userMoney.copperCount + toCopper.value;
          break;
        case "silver_coin":
          walletStore.userMoney.silverCount = walletStore.userMoney.silverCount - walletStore.wallet.count;
          walletStore.userMoney.copperCount = walletStore.userMoney.copperCount + toCopper.value;
          break;
        case "copper_coin":
          break;
      }
  }
  await exchangeMoneyRequest(walletStore.userMoney.goldenCount, walletStore.userMoney.silverCount, walletStore.userMoney.copperCount)
}

async function exchangeMoneyRequest(goldenCount: number, silverCount: number, copperCount: number) {
  try {
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.money}`,
        {
          "id": "",
          "inventoryId": "",
          "goldenCount": goldenCount,
          "silverCount": silverCount,
          "copperCount": copperCount,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`,
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
        <ion-select-option value="golden_coin">зм.</ion-select-option>
        <ion-select-option value="silver_coin">см.</ion-select-option>
        <ion-select-option value="copper_coin">мм.</ion-select-option>
      </ion-select>
    </ion-input>
    <div class="exchange-buttons">
      <ion-button class="exchange-button" fill="outline" shape="default" expand="block" size="small" :disabled="!isGoldenInteger"
                  @click="exchangeCoins('to_golden_coin')">
        <span class="ion-text-left exchange-button-name">Обменять на золотые монеты</span>
        <div class="exchange-end">
          <div class="exchange-button-value">={{ toGolden.toFixed(1) }}</div>
          <ion-icon class="exchange-button-icon" size="small" slot="end" :src="goldenCoinIcon"></ion-icon>
        </div>
      </ion-button>
      <ion-button class="exchange-button" fill="outline" shape="default" expand="block" size="small" :disabled="!isSilverInteger"
                  @click="exchangeCoins('to_silver_coin')">
        <span class="ion-text-left exchange-button-name">Обменять на серебряные монеты</span>
        <div class="exchange-end">
          <div class="exchange-button-value">={{ toSilver.toFixed(1) }}</div>
          <ion-icon class="exchange-button-icon" size="small" slot="end" :src="silverCoinIcon"></ion-icon>
        </div>
      </ion-button>
      <ion-button class="exchange-button" fill="outline" shape="default" expand="block" size="small" :disabled="!isCopperInteger"
                  @click="exchangeCoins('to_copper_coin')">
        <span class="ion-text-left exchange-button-name">Обменять на медные монеты</span>
        <div class="exchange-end">
          <div class="exchange-button-value">={{ toCopper.toFixed(1) }}</div>
          <ion-icon class="exchange-button-icon" size="small" slot="end" :src="copperCoinIcon"></ion-icon>
        </div>
      </ion-button>
      <ion-button disabled="disabled" class="exchange-to-person-button" fill="outline" shape="default" expand="block"
                  size="small">
        <span class="ion-text-left exchange-button-name">Передать игроку</span>
        <ion-icon class="exchange-button-icon" size="small" slot="end" :icon="person"></ion-icon>
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
}

.exchange-button {
  margin-top: 15px;
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
