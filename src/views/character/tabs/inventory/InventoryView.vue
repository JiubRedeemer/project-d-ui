<script setup lang="ts">

import {IonButtons, IonLabel, IonButton, IonIcon, IonProgressBar, useIonRouter} from "@ionic/vue";
import axios from "axios";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {computed, onMounted, ref} from "vue";
import {InventoryItem, InventoryResponse, MoneyDto} from "@/components/models/response/InventoryResponse";
import {add, manOutline, remove} from "ionicons/icons";
import {useInventoryItemStore} from "@/stores/InventoryItemStore";
import {HEADERS, TEXTS} from "@/config/localisations";
import {useCharacterStore} from "@/stores/CharacterStore";

const ionRouter = useIonRouter();

const route = useRoute();
const inventory = ref<InventoryResponse>();
const money = ref<MoneyDto>();
const inventoryItemStore = useInventoryItemStore()
const characterStore = useCharacterStore()

onMounted(async () => {
  await fetchInventory();
  await fetchMoney();
});

const fetchInventory = async () => {
  try {
    const response = await axios.get(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
    inventory.value = response.data;
    console.log("avatar:", response.data?.characterBio?.avatar);
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
};

const fetchMoney = async () => {
  try {
    const response = await axios.get(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.money}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
    money.value = response.data;
    console.log("avatar:", response.data?.characterBio?.avatar);
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
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
    inventory.value = response.data;
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
}

const equippedItems = computed(() => inventory.value?.items?.filter(item => item.inUse));
const armorItems = computed(() => inventory.value?.items?.filter(item => item.item.type === "ARMOR"));
const weaponItems = computed(() => inventory.value?.items?.filter(item => item.item.type === "WEAPON"));
const magicItems = computed(() => inventory.value?.items?.filter(item => item.item.type === "MAGIC_ITEM"));
const otherItems = computed(() => inventory.value?.items?.filter(item => item.item.type === "OTHER"));
const totalWeight = computed(() => inventory.value?.totalWeight || 0);

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
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
    inventory.value = response.data;
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
}

</script>

<template>
  <div class="inventory-header">
    <div class="weight">{{ totalWeight }}/{{ weightLimit }}</div>
    <ion-progress-bar :value="totalWeight / weightLimit"
                      :color="((totalWeight/weightLimit)>=1)?'danger':'primary'"></ion-progress-bar>
    <div class="money">
      <div class="money-title">{{ HEADERS.wallet.rus }}:</div>
      <div class="coin">
        <div class="coin-count">{{money?.copperCount}}</div>
        <div class="coin-img copper"></div>
      </div>
      <div class="coin">
        <div class="coin-count">{{money?.silverCount}}</div>
        <div class="coin-img silver"></div>
      </div>
      <div class="coin">
        <div class="coin-count">{{money?.goldenCount}}</div>
        <div class="coin-img golden"></div>
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
                 :src="getItemImageUrl(item.item.imgUrl)"
                 :alt="item.item.name.rus"/>
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
        </div>
      </div>
    </div>
    <h1 class="sectionHeader">{{ HEADERS.armor.rus }}</h1>
    <div class="armor">
      <div class="section" v-for="item in armorItems" :key="item.id">
        <div class="section-start-block" @click="openInventoryItem(item)">
          <div class="image-block">
            <img width="55px" height="55px" class="item-image" :class="getRarityClass(item.item.rarity)"
                 :src="getItemImageUrl(item.item.imgUrl)"
                 :alt="item.item.name.rus"/>
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
    <h1 class="sectionHeader">{{ HEADERS.weapon.rus }}</h1>
    <div class="weapon">
      <div class="section" v-for="item in weaponItems" :key="item.id">
        <div class="section-start-block" @click="openInventoryItem(item)">
          <div class="image-block">
            <img width="55px" height="55px" class="item-image" :class="getRarityClass(item.item.rarity)"
                 :src="getItemImageUrl(item.item.imgUrl)"
                 :alt="item.item.name.rus"/>
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
    <h1 class="sectionHeader">{{ HEADERS.magic_items.rus }}</h1>
    <div class="magic-items">
      <div class="section" v-for="item in magicItems" :key="item.id">
        <div class="section-start-block" @click="openInventoryItem(item)">
          <div class="image-block">
            <img width="55px" height="55px" class="item-image" :class="getRarityClass(item.item.rarity)"
                 :src="getItemImageUrl(item.item.imgUrl)"
                 :alt="item.item.name.rus"/>
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
    <h1 class="sectionHeader">{{ HEADERS.other.rus }}</h1>
    <div class="other">
      <div class="section" v-for="item in otherItems" :key="item.id">
        <div class="section-start-block" @click="openInventoryItem(item)">
          <div class="image-block">
            <img width="55px" height="55px" class="item-image" :class="getRarityClass(item.item.rarity)"
                 :src="getItemImageUrl(item.item.imgUrl)"
                 :alt="item.item.name.rus"/>
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
  </div>
</template>

<style scoped>
.inventory-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 5px;
}

.sectionHeader {
  color: var(--ion-color-primary);
  font-size: 16pt;
  font-weight: bold;
  margin-top: 10px;
}

.section {
  background-color: var(--ion-color-medium);
  border-radius: 25px;
  padding: 10px;
  overflow: hidden;
  max-height: 75px;
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
  align-items: end; /* Aligns children to the top */
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
}

.item-stats {
  font-size: 11px;
}

.item-image {
  border-radius: 15px;
  border: 2px solid transparent;
}

.money{
  background-color: var(--ion-color-medium);
  height: 40px;
  border-radius: 20px;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-left: 10px;
  padding-right: 10px;
  font-size: 14px;
}

.coin{
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: center;
}

.money-title{
  font-size: 16px;
}

.coin-img{
  width: 20px;
  height: 20px;
  border-radius: 50%; /* делает круг */
  display: inline-block;
}

.copper.coin-img{
  background-color: chocolate;
}

.silver.coin-img{
  background-color: silver;
}

.golden.coin-img{
  background-color: darkgoldenrod;
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


</style>
