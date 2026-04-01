<script setup lang="ts">

import {
  IonButton,
  IonButtons,
  IonIcon,
  IonLabel,
  IonProgressBar,
  onIonViewDidEnter,
  useIonRouter,
  useKeyboard
} from "@ionic/vue";
import axios from "axios";
import { FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import { useRoute } from "vue-router";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { InventoryItem } from "@/components/models/response/InventoryResponse";
import { add, caretUpCircleOutline, manOutline, remove } from "ionicons/icons";
import { useInventoryItemStore } from "@/stores/InventoryItemStore";
import { HEADERS, TEXTS } from "@/config/localisations";
import { useCharacterStore } from "@/stores/CharacterStore";
import WalletView from "@/views/character/tabs/inventory/WalletView.vue";
import { useWalletStore } from "@/stores/WalletStore";
import { useSubheaderOpenedStore } from "@/stores/SubheaderStore";
import { useInventoryStore } from "@/stores/InventoryStore";
import goldenCoinIcon from "@/static/icons/GoldenCoin.svg";
import silverCoinIcon from "@/static/icons/SilverCoin.svg";
import copperCoinIcon from "@/static/icons/CopperCoin.svg";

const ionRouter = useIonRouter();

const route = useRoute();
// const inventory = ref<InventoryResponse>();
const inventoryStore = useInventoryStore();
// const money = ref<MoneyDto>();
const inventoryItemStore = useInventoryItemStore();
const characterStore = useCharacterStore();
const subheaderOpenedStore = useSubheaderOpenedStore();
const walletStore = useWalletStore();
const { isOpen, keyboardHeight } = useKeyboard();
const moneyRootRef = ref<HTMLElement | null>(null);

const moneyRootMaxHeight = computed(() => {
  if (isOpen.value && keyboardHeight.value > 0) {
    // Высота окна - высота клавиатуры - отступы (например, 10px для верхнего отступа)
    return `${window.innerHeight - keyboardHeight.value - 10}px`;
  }
  // По умолчанию, если клавиатура не открыта, используем фиксированную высоту
  return '1150px';
});
const ensureMoneyBlockVisible = async () => {
  if (!walletStore.moneyExpanded || !moneyRootRef.value) {
    return;
  }

  await nextTick();
  const moneyElement = moneyRootRef.value;
  const contentElement = moneyElement.closest("ion-content") as HTMLIonContentElement | null;

  if (!contentElement) {
    moneyElement.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const scrollElement = await contentElement.getScrollElement();
  const moneyRect = moneyElement.getBoundingClientRect();
  const scrollRect = scrollElement.getBoundingClientRect();
  const safeTopPadding = 8;
  const safeBottomPadding = 24;
  const extraScrollOffset = 24;
  const keyboardViewportBottom = isOpen.value && keyboardHeight.value > 0
    ? window.innerHeight - keyboardHeight.value - safeBottomPadding
    : scrollRect.bottom - safeBottomPadding;
  const visibleTop = scrollRect.top + safeTopPadding;
  const visibleBottom = Math.min(scrollRect.bottom - safeBottomPadding, keyboardViewportBottom);

  let deltaY = 0;
  if (moneyRect.top < visibleTop) {
    deltaY = moneyRect.top - visibleTop - extraScrollOffset;
  } else if (moneyRect.bottom > visibleBottom) {
    deltaY = moneyRect.bottom - visibleBottom + extraScrollOffset;
  }

  if (Math.abs(deltaY) > 2) {
    await contentElement.scrollByPoint(0, deltaY, 250);
  }
};

watch(
  () => walletStore.moneyExpanded,
  (expanded) => {
    if (!expanded) {
      return;
    }

    void ensureMoneyBlockVisible();
    window.setTimeout(() => {
      void ensureMoneyBlockVisible();
    }, 300);
  }
);

watch(keyboardHeight, () => {
  if (!walletStore.moneyExpanded) {
    return;
  }

  window.setTimeout(() => {
    void ensureMoneyBlockVisible();
  }, 60);
});

const loadInventoryData = async () => {
  await fetchInventory();
  await fetchMoney();
};

onMounted(loadInventoryData);
onIonViewDidEnter(loadInventoryData);

const fetchInventory = async () => {
  await inventoryStore.updateInventoryInStoreById(route.params.roomId, route.params.characterId)
};

const fetchMoney = async () => {
  try {
    const response = await axios.get(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.money}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`,
        },
      }
    );
    walletStore.userMoney = response.data;
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
};

const changeInUseForItem = async (itemId: string) => {
  try {
    const response = await axios.patch(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.equip}/${itemId.trim()}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`,
        },
      }
    );
    inventoryStore.inventory = response.data;
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
}

const sortItemsById = (items: InventoryItem[]) => {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
};

const equippedItems = computed(() =>
  sortItemsById((inventoryStore.inventory?.items ?? []).filter((item) => item.inUse))
);
const armorItems = computed(() =>
  sortItemsById((inventoryStore.inventory?.items ?? []).filter((item) => item.item.type === "ARMOR"))
);
const weaponItems = computed(() =>
  sortItemsById((inventoryStore.inventory?.items ?? []).filter((item) => item.item.type === "WEAPON"))
);
const magicItems = computed(() =>
  sortItemsById((inventoryStore.inventory?.items ?? []).filter((item) => item.item.type === "MAGIC_ITEM"))
);
const otherItems = computed(() =>
  sortItemsById((inventoryStore.inventory?.items ?? []).filter((item) => item.item.type === "OTHER"))
);
const totalWeight = computed(() => inventoryStore.inventory?.totalWeight || 0);

const weightLimit = characterStore.character.abilities.filter(ability => ability.code === "STR")[0].value * 10;

const getItemImageUrl = (imgUrl: string | undefined) => {
  return imgUrl != null
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
    : 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png';
};

const getItemStats = (item: InventoryItem) => {
  const stats: string[] = [];

  if (item.item.stats?.armorClass) {
    let kdText = `${TEXTS.ac.rus}: ${item.item.stats.armorClass}`;
    if (item.item.subtype !== 'HEAVY_ARMOR') {
      kdText += ' + ' + TEXTS.dexterity.rus;
      if (item.item.subtype === 'MEDIUM_ARMOR') kdText += ' (до 2)';
    }
    stats.push(kdText);
  }

  if (item.item.stats?.damage) {
    stats.push(`${TEXTS.damage.rus}: ${item.item.stats.damage.value} ${item.item.stats.damage.damageTypeName}`);
  }

  if (item.item.stats?.weight && item.item.subtypeName) {
    stats.push(`${TEXTS.weight.rus}: ${item.item.stats.weight} ${TEXTS.weightEI.rus} ${TEXTS.type.rus}: ${item.item.subtypeName}`);
  } else {
    if (item.item.stats?.weight) {
      stats.push(`${TEXTS.weight.rus}: ${item.item.stats.weight} ${TEXTS.weightEI.rus}`);
    }
    if (item.item.subtypeName) {
      stats.push(`${TEXTS.type.rus}: ${item.item.subtypeName}`);
    }
  }

  return stats;
};

function getRarityClass(rarity: string | undefined) {
  switch (rarity) {
    case 'COMMON':
      return 'rarity-common';
    case 'UNCOMMON':
      return 'rarity-uncommon';
    case 'RARE':
      return 'rarity-rare';
    case 'VERY_RARE':
      return 'rarity-very-rare';
    case 'LEGENDARY':
      return 'rarity-legendary';
    default:
      return 'rarity-common';
  }
}

function openInventoryItem(item: InventoryItem) {
  inventoryItemStore.inventoryItem = item;
  ionRouter.navigate('/rooms/' + route.params.roomId + '/characters/' + route.params.characterId + '/inventory/' + item.id, 'forward', 'push')
}

function openSearchView() {
  ionRouter.navigate('/rooms/' + route.params.roomId + '/characters/' + route.params.characterId + '/inventory/search', 'forward', 'push')
}

async function changeItemCount(item: InventoryItem, option: string) {
  let count: number;
  switch (option) {
    case 'remove':
      count = (item.count as number) - 1;
      break;
    case 'add':
      count = (item.count as number) + 1;
      break;
    default:
      count = (item.count as number);
      break;
  }
  if (count < 0) {
    count = (item.count as number);
  }
  try {
    const response = await axios.patch(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}/${item.id.trim()}${GATEWAY_INTEGRATION_ROUTES.count}/${count}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`,
        },
      }
    );
    inventoryStore.inventory = response.data;
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
}

function expandMoneyBlock() {
  walletStore.moneyExpanded = true;
  subheaderOpenedStore.subheaderOpened = false;
}

async function exchangeMoneyRequest() {
  try {
    await axios.patch(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.money}`,
      {
        "id": walletStore.userMoney.id,
        "inventoryId": walletStore.userMoney.inventoryId,
        "goldenCount": walletStore.userMoney.goldenCount,
        "silverCount": walletStore.userMoney.silverCount,
        "copperCount": walletStore.userMoney.copperCount,
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

async function giveMoney() {
  if (!(walletStore.userMoney && walletStore && walletStore.wallet && walletStore.wallet.count)) {
    return;
  }

  switch (walletStore.wallet.type) {
    case "golden_coin":
      if ((walletStore.userMoney.goldenCount - walletStore.wallet.count as number) >= 0) {
        walletStore.userMoney.goldenCount = walletStore.userMoney.goldenCount as number - walletStore.wallet.count as number;
      }
      break;

    case "silver_coin":
      if ((walletStore.userMoney.silverCount as number - walletStore.wallet.count as number) >= 0) {
        walletStore.userMoney.silverCount = walletStore.userMoney.silverCount as number - walletStore.wallet.count as number;
      }
      break;

    case "copper_coin":
      if ((walletStore.userMoney.copperCount as number - walletStore.wallet.count as number) >= 0) {
        walletStore.userMoney.copperCount = walletStore.userMoney.copperCount as number - walletStore.wallet.count as number;
      }
      break;
  }
  await exchangeMoneyRequest();
}

async function takeMoney() {
  if (!(walletStore.userMoney && walletStore && walletStore.wallet && walletStore.wallet.count)) {
    return;
  }
  switch (walletStore.wallet.type) {
    case "golden_coin":
      walletStore.userMoney.goldenCount = parseInt(walletStore.userMoney.goldenCount) + parseInt(walletStore.wallet.count);
      break;
    case "silver_coin":
      walletStore.userMoney.silverCount = parseInt(walletStore.userMoney.silverCount) + parseInt(walletStore.wallet.count);
      break;
    case "copper_coin":
      walletStore.userMoney.copperCount = parseInt(walletStore.userMoney.copperCount) + parseInt(walletStore.wallet.count);
      break;
  }
  await exchangeMoneyRequest();
}
</script>

<template>
  <div class="inventory-header" :style="walletStore.moneyExpanded ? { marginTop: '-10px', paddingTop: '0px' } : ''">
    <div class="weight">{{ totalWeight }}/{{ weightLimit }}</div>
    <ion-progress-bar :value="totalWeight / weightLimit"
      :color="((totalWeight / weightLimit) >= 1) ? 'danger' : 'primary'"></ion-progress-bar>
    <div class="money-root" :class="{ openMoney: walletStore.moneyExpanded }"
      ref="moneyRootRef"
      :style="{ maxHeight: walletStore.moneyExpanded ? moneyRootMaxHeight : '40px' }">
      <div class="money" @click="expandMoneyBlock()">
        <div class="money-title">{{ HEADERS.wallet.rus }}:</div>
        <div class="coins-group">
          <button class="coin-chip copper" :class="{ selected: walletStore.wallet.type === 'copper_coin' }" type="button"
            aria-label="Медные монеты" @click.stop="walletStore.wallet.type = 'copper_coin'">
            <ion-icon class="coin-icon" :src="copperCoinIcon" aria-hidden="true" />
            <span class="coin-value">{{ walletStore.userMoney?.copperCount ?? 0 }}</span>
          </button>
          <button class="coin-chip silver" :class="{ selected: walletStore.wallet.type === 'silver_coin' }" type="button"
            aria-label="Серебряные монеты" @click.stop="walletStore.wallet.type = 'silver_coin'">
            <ion-icon class="coin-icon" :src="silverCoinIcon" aria-hidden="true" />
            <span class="coin-value">{{ walletStore.userMoney?.silverCount ?? 0 }}</span>
          </button>
          <button class="coin-chip golden" :class="{ selected: walletStore.wallet.type === 'golden_coin' }" type="button"
            aria-label="Золотые монеты" @click.stop="walletStore.wallet.type = 'golden_coin'">
            <ion-icon class="coin-icon" :src="goldenCoinIcon" aria-hidden="true" />
            <span class="coin-value">{{ walletStore.userMoney?.goldenCount ?? 0 }}</span>
          </button>
        </div>
      </div>
      <div class="money-input">
        <WalletView />
      </div>
      <div class="money-submit-buttons">
        <div class="button-hide">
          <ion-button shape="round" size="small" @click="walletStore.moneyExpanded = false">
            <ion-icon slot="icon-only" :icon="caretUpCircleOutline"></ion-icon>
          </ion-button>
        </div>
        <div class="submit-buttons">
          <ion-button shape="round" size="default" color="primary" fill="outline" @click="giveMoney()">
            <span class="give-money-button">Отдать</span>
          </ion-button>
          <ion-button shape="round" size="default" color="primary" fill="outline" @click="takeMoney()">
            <span>Взять</span>
          </ion-button>
        </div>
      </div>
    </div>
  </div>
  <div class="inventory-body">
    <h1 class="sectionHeader" v-if="equippedItems?.length! > 0">{{ HEADERS.equipped.rus }}</h1>
    <div class="equipped" v-if="equippedItems?.length! > 0">
      <div class="section" v-for="item in equippedItems" :key="item.id">
        <div class="section-start-block" @click="openInventoryItem(item)">
          <div class="image-block">
            <img width="55px" height="55px" class="item-image" :class="getRarityClass(item.item.rarity)"
              :src="getItemImageUrl(item.item.imgUrl)" :alt="item.item.name.rus"
              onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" />
          </div>
          <div class="stats-block">
            <div class="item-name">
              <span>
                {{ item.item.name.rus }}
                <span
                  v-if="characterStore.character.abilities.find(ability => ability.code === 'STR')?.value < Number(item.item.stats.requirement)"
                  style="color: red;">*</span>
              </span>
            </div>
            <div class="item-stats" v-for="(stat, index) in getItemStats(item)" :key="index">
              {{ stat }}
            </div>
          </div>
        </div>
        <div class="buttons-block">
          <ion-button @click="changeInUseForItem(item.id)" size="small" shape="round" class="equip-button"
            :fill="item.inUse ? 'outline' : 'solid'">
            <ion-icon slot="icon-only" :icon="manOutline"></ion-icon>
          </ion-button>
        </div>
      </div>
    </div>
    <h1 class="sectionHeader" v-if="armorItems?.length! > 0">{{ HEADERS.armor.rus }}</h1>
    <div class="armor" v-if="armorItems?.length! > 0">
      <div class="section" v-for="item in armorItems" :key="item.id">
        <div class="section-start-block" @click="openInventoryItem(item)">
          <div class="image-block">
            <img width="55px" height="55px" class="item-image" :class="getRarityClass(item.item.rarity)"
              :src="getItemImageUrl(item.item.imgUrl)" :alt="item.item.name.rus"
              onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" />

          </div>
          <div class="stats-block">
            <div class="item-name">
              {{ item.item.name.rus }}
            </div>
            <div class="item-stats" v-for="(stat, index) in getItemStats(item)" :key="index">
              {{ stat }}
            </div>
          </div>
        </div>
        <div class="buttons-block">
          <ion-button @click="changeInUseForItem(item.id)" size="small" shape="round" class="equip-button"
            :fill="item.inUse ? 'outline' : 'solid'">
            <ion-icon slot="icon-only" :icon="manOutline"></ion-icon>
          </ion-button>
          <ion-buttons class="counter-buttons">
            <ion-button size="small" @click="changeItemCount(item, 'remove')">
              <ion-icon slot="icon-only" size="small" :icon="remove"></ion-icon>
            </ion-button>
            <ion-label>{{ item.count }}</ion-label>
            <ion-button size="small" @click="changeItemCount(item, 'add')">
              <ion-icon slot="icon-only" size="small" :icon="add"></ion-icon>
            </ion-button>
          </ion-buttons>
        </div>
      </div>
    </div>
    <h1 class="sectionHeader" v-if="weaponItems?.length! > 0">{{ HEADERS.weapon.rus }}</h1>
    <div class="weapon" v-if="weaponItems?.length! > 0">
      <div class="section" v-for="item in weaponItems" :key="item.id">
        <div class="section-start-block" @click="openInventoryItem(item)">
          <div class="image-block">
            <img width="55px" height="55px" class="item-image" :class="getRarityClass(item.item.rarity)"
              :src="getItemImageUrl(item.item.imgUrl)" :alt="item.item.name.rus"
              onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" />
          </div>
          <div class="stats-block">
            <div class="item-name">
              {{ item.item.name.rus }}
            </div>
            <div class="item-stats" v-for="(stat, index) in getItemStats(item)" :key="index">
              {{ stat }}
            </div>
          </div>
        </div>
        <div class="buttons-block">
          <ion-button @click="changeInUseForItem(item.id)" size="small" shape="round" class="equip-button"
            :fill="item.inUse ? 'outline' : 'solid'">
            <ion-icon size="small" slot="icon-only" :icon="manOutline"></ion-icon>
          </ion-button>
          <ion-buttons class="counter-buttons">
            <ion-button size="small" @click="changeItemCount(item, 'remove')">
              <ion-icon slot="icon-only" size="small" :icon="remove"></ion-icon>
            </ion-button>
            <ion-label>{{ item.count }}</ion-label>
            <ion-button size="small" @click="changeItemCount(item, 'add')">
              <ion-icon slot="icon-only" size="small" :icon="add"></ion-icon>
            </ion-button>
          </ion-buttons>

        </div>
      </div>
    </div>
    <h1 class="sectionHeader" v-if="magicItems?.length! > 0">{{ HEADERS.magic_items.rus }}</h1>
    <div class="magic-items" v-if="magicItems?.length! > 0">
      <div class="section" v-for="item in magicItems" :key="item.id">
        <div class="section-start-block" @click="openInventoryItem(item)">
          <div class="image-block">
            <img width="55px" height="55px" class="item-image" :class="getRarityClass(item.item.rarity)"
              :src="getItemImageUrl(item.item.imgUrl)" :alt="item.item.name.rus"
              onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" />
          </div>
          <div class="stats-block">
            <div class="item-name">
              {{ item.item.name.rus }}
            </div>
            <div class="item-stats" v-for="(stat, index) in getItemStats(item)" :key="index" v-if="getItemStats(item).length > 0">
              {{ stat }}
            </div>
          </div>
        </div>
        <div class="buttons-block">
          <ion-button @click="changeInUseForItem(item.id)" size="small" shape="round" class="equip-button"
            :fill="item.inUse ? 'outline' : 'solid'">
            <ion-icon slot="icon-only" :icon="manOutline"></ion-icon>
          </ion-button>
          <ion-buttons class="counter-buttons">
            <ion-button size="small" @click="changeItemCount(item, 'remove')">
              <ion-icon slot="icon-only" size="small" :icon="remove"></ion-icon>
            </ion-button>
            <ion-label>{{ item.count }}</ion-label>
            <ion-button size="small" @click="changeItemCount(item, 'add')">
              <ion-icon slot="icon-only" size="small" :icon="add"></ion-icon>
            </ion-button>
          </ion-buttons>

        </div>
      </div>
    </div>
    <h1 class="sectionHeader" v-if="otherItems?.length! > 0">{{ HEADERS.other.rus }}</h1>
    <div class="other" v-if="otherItems?.length! > 0">
      <div class="section" v-for="item in otherItems" :key="item.id">
        <div class="section-start-block" @click="openInventoryItem(item)">
          <div class="image-block">
            <img width="55px" height="55px" class="item-image" :class="getRarityClass(item.item.rarity)"
              :src="getItemImageUrl(item.item.imgUrl)" :alt="item.item.name.rus" 
              onerror="this.onerror=null; this.src='https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'" />
          </div>
          <div class="stats-block">
            <div class="item-name">
              {{ item.item.name.rus }}
            </div>
            <div class="item-stats" v-for="(stat, index) in getItemStats(item)" :key="index">
              {{ stat }}
            </div>
          </div>
        </div>
        <div class="buttons-block">
          <ion-button @click="changeInUseForItem(item.id)" size="small" shape="round" class="equip-button"
            :fill="item.inUse ? 'outline' : 'solid'">
            <ion-icon slot="icon-only" :icon="manOutline"></ion-icon>
          </ion-button>
          <ion-buttons class="counter-buttons">
            <ion-button size="small" @click="changeItemCount(item, 'remove')">
              <ion-icon slot="icon-only" size="small" :icon="remove"></ion-icon>
            </ion-button>
            <ion-label>{{ item.count }}</ion-label>
            <ion-button size="small" @click="changeItemCount(item, 'add')">
              <ion-icon slot="icon-only" size="small" :icon="add"></ion-icon>
            </ion-button>
          </ion-buttons>

        </div>
      </div>
    </div>
      <div class="security-block" style="height: 50px;"></div>
  </div>
  <div class="add-new-button">
    <ion-button size="large" shape="round" color="secondary" @click="openSearchView">
      <ion-icon slot="icon-only" :icon="add" />
    </ion-button>
  </div>
</template>

<style scoped>
.add-new-button {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0 max(8px, env(safe-area-inset-bottom, 0));
}

.inventory-body {}

.inventory-header {
  transition: padding-top, margin-top 0.5s ease-in-out;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 5px;
}

.sectionHeader {
  color: var(--ion-color-light);
  font-size: 18px;
  font-weight: normal;
  margin-top: 10px;
}

.section {
  background-color: var(--ion-color-medium);
  border-radius: 20px;
  padding: 5px;
  overflow: hidden;
  max-height: 70px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.section-start-block {
  display: flex;
  flex-direction: row;
  justify-content: start;
  align-items: center;
  gap: 10px;
}

.buttons-block {
  display: flex;
  flex-direction: column;
  align-items: end;
  /* Aligns children to the top */
  position: relative;
  height: 100%;
  width: 50px;
  margin-top: -7px;
}

.counter-buttons {
  display: flex;
  justify-content: center;
  flex-direction: row;
  align-items: center;
  margin-right: -15px;
  height: 30px;
  margin-top: 5px;
}

.item-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
}

.item-stats {
  font-size: 11px;
}

.stats-block{
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
}

.image-block {
  width: 55px;
  height: 55px;
}

.item-image {
  border-radius: 15px;
  border: 2px solid transparent;
}

.money-root {
  transition: max-height 0.5s ease-in-out;
  width: 100%;
  min-height: 40px;
  margin-top: 10px;
  background-color: var(--ion-color-medium);
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: start;
}

.money-root.openMoney {
  width: 100%;
  min-height: 40px;
  overflow: hidden;
}

.money {
  min-height: 40px;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding-left: 10px;
  padding-right: 10px;
  font-size: 14px;
}

.money-input {
  padding-left: 15px;
  padding-right: 15px;
  width: 100%;
}

.money-submit-buttons {
  width: 100%;
  padding-left: 10px;
  padding-right: 10px;
  margin-top: 10px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.coins-group {
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  margin-left: auto;
}

.money-title {
  font-size: 16px;
  font-weight: bold;
}

.coin-chip {
  height: 30px;
  min-width: 66px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 0 10px 0 7px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  background: linear-gradient(180deg, rgba(var(--ion-color-dark-rgb), 0.18), rgba(var(--ion-color-dark-rgb), 0.13));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 4px 10px rgba(0, 0, 0, 0.20);
  transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
}

.coin-chip:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 3px 8px rgba(0, 0, 0, 0.2);
}

.coin-icon {
  width: 17px;
  height: 17px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.28));
}

.coin-value {
  min-width: 24px;
  text-align: right;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: var(--ion-color-light);
  font-variant-numeric: tabular-nums;
}

.coin-chip.copper {
  background:
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0) 60%),
    linear-gradient(180deg, rgba(193, 128, 0, 0.26), rgba(193, 128, 0, 0.10));
  border-color: rgba(193, 128, 0, 0.40);
}

.coin-chip.silver {
  background:
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 60%),
    linear-gradient(180deg, rgba(216, 216, 216, 0.26), rgba(216, 216, 216, 0.10));
  border-color: rgba(216, 216, 216, 0.40);
}

.coin-chip.golden {
  background:
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 60%),
    linear-gradient(180deg, rgba(255, 251, 0, 0.26), rgba(255, 251, 0, 0.10));
  border-color: rgba(255, 251, 0, 0.40);
}

.coin-chip.selected {
  /* общий базовый эффект (чуть заметнее, но без "неона") */
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.10), 0 5px 12px rgba(0, 0, 0, 0.22);
}

.coin-chip.golden.selected {
  border-color: rgba(255, 251, 0, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    0 0 0 2px rgba(255, 251, 0, 0.14),
    0 6px 14px rgba(0, 0, 0, 0.22);
}

.coin-chip.silver.selected {
  border-color: rgba(216, 216, 216, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    0 0 0 2px rgba(216, 216, 216, 0.14),
    0 6px 14px rgba(0, 0, 0, 0.22);
}

.coin-chip.copper.selected {
  border-color: rgba(193, 128, 0, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    0 0 0 2px rgba(193, 128, 0, 0.14),
    0 6px 14px rgba(0, 0, 0, 0.22);
}

.rarity-common {
  border-color: gray;
}

.rarity-uncommon {
  border-color: green;
}

.rarity-rare {
  border-color: blue;
}

.rarity-very-rare {
  border-color: purple;
}

.rarity-legendary {
  border-color: orange;
}

@media (min-width: 1024px) {
  .inventory-header {
    align-items: stretch;
    gap: 10px;
    margin-bottom: 12px;
    padding-top: 0;
  }

  .weight {
    font-size: 14px;
    color: var(--ion-color-light);
    text-align: right;
    opacity: 0.9;
  }

  .money-root {
    margin-top: 0;
    border-radius: 14px;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
  }

  .money {
    min-height: 46px;
    padding-left: 14px;
    padding-right: 14px;
  }

  .money-title {
    font-size: 15px;
  }

  .coins-group {
    gap: 8px;
  }

  .coin-chip {
    min-width: 72px;
    height: 32px;
  }

  .money-submit-buttons {
    margin-top: 8px;
    padding-bottom: 10px;
  }

  .inventory-body {
    padding-bottom: 96px;
  }

  .sectionHeader {
    margin-top: 16px;
    margin-bottom: 10px;
    font-size: 20px;
    font-weight: 600;
  }

  .equipped,
  .armor,
  .weapon,
  .magic-items,
  .other {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
    gap: 10px 12px;
    align-items: start;
  }

  .section {
    border-radius: 16px;
    padding: 10px 12px;
    max-height: none;
    min-height: 88px;
    margin-bottom: 0;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
    transition: border-color 0.2s ease, transform 0.2s ease;
  }

  .section:hover {
    border-color: rgba(var(--ion-color-primary-rgb), 0.45);
    transform: translateY(-1px);
  }

  .section-start-block {
    flex: 1;
    min-width: 0;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
  }

  .image-block {
    width: 60px;
    height: 60px;
    flex: 0 0 60px;
  }

  .item-image {
    width: 60px;
    height: 60px;
    border-radius: 12px;
  }

  .stats-block {
    min-width: 0;
    width: 100%;
    justify-content: flex-start;
    padding-top: 2px;
  }

  .item-name {
    margin-bottom: 6px;
    font-size: 15px;
    line-height: 1.2;
  }

  .item-stats {
    font-size: 12px;
    line-height: 1.25;
    opacity: 0.9;
  }

  .buttons-block {
    width: auto;
    margin-top: 0;
    margin-left: 10px;
    justify-content: center;
    gap: 6px;
  }

  .counter-buttons {
    margin-right: 0;
    margin-top: 0;
    height: 34px;
    border-radius: 999px;
    background: rgba(var(--ion-color-dark-rgb), 0.22);
    padding: 0 4px;
  }

  .counter-buttons ion-label {
    min-width: 22px;
    text-align: center;
    font-weight: 600;
  }

  .add-new-button {
    left: auto;
    right: 22px;
    bottom: 18px;
    width: auto;
    padding: 0;
    justify-content: flex-end;
    pointer-events: none;
  }

  .add-new-button ion-button {
    pointer-events: auto;
    margin: 0;
    --box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
  }
}
</style>
