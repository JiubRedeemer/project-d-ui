<script setup lang="ts">

import {IonButton, IonIcon, IonProgressBar} from "@ionic/vue";
import axios from "axios";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";
import {computed, onMounted, ref} from "vue";
import {InventoryResponse} from "@/components/models/response/InventoryResponse";
import {manOutline} from "ionicons/icons";

const route = useRoute();
const inventory = ref<InventoryResponse>();

onMounted(async () => {
  await fetchInventory();
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

const weightLimit = 350;

const getItemImageUrl = (imgUrl: string | null) => {
  return imgUrl != null
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png';
};

const getItemStats = (item) => {
  const stats: string[] = [];

  if (item.item.stats?.armorClass) {
    let kdText = `КД: ${item.item.stats.armorClass}`;
    if (item.item.subtype !== 'HEAVY_ARMOR') {
      kdText += ' + Ловкость';
      if (item.item.subtype === 'MEDIUM_ARMOR') kdText += ' (до 2)';
    }
    stats.push(kdText);
  }

  if (item.item.stats?.damage) {
    stats.push(`Урон: ${item.item.stats.damage.value} ${item.item.stats.damage.damageTypeName}`);
  }

  if (item.item.stats?.weight && item.item.subtypeName) {
    stats.push(`Вес: ${item.item.stats.weight} кг Тип: ${item.item.subtypeName}`);
  } else {
    if (item.item.stats?.weight) {
      stats.push(`Вес: ${item.item.stats.weight} кг`);
    }
    if (item.item.subtypeName) {
      stats.push(`Тип: ${item.item.subtypeName}`);
    }
  }

  return stats;
};

function getRarityClass(rarity: string) {
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
</script>

<template>
  <div class="inventory-header">
    <div class="weight">{{ totalWeight }}/{{ weightLimit }}</div>
    <ion-progress-bar :value="totalWeight / weightLimit"></ion-progress-bar>
  </div>
  <div class="inventory-body">
    <h1 class="sectionHeader" v-if="equippedItems?.length > 0">Снаряжено</h1>
    <div class="equipped" v-if="equippedItems?.length > 0">
      <div class="section" v-for="item in equippedItems" :key="item.id">
        <div class="section-start-block">
          <div class="image-block">
            <img width="50px" height="50px" class="item-image" :class="getRarityClass(item.item.rarity)"
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
    <h1 class="sectionHeader">Доспехи</h1>
    <div class="armor">
      <div class="section" v-for="item in armorItems" :key="item.id">
        <div class="section-start-block">
          <div class="image-block">
            <img width="50px" height="50px" class="item-image" :class="getRarityClass(item.item.rarity)"
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
    <h1 class="sectionHeader">Оружие</h1>
    <div class="weapon">
      <div class="section" v-for="item in weaponItems" :key="item.id">
        <div class="section-start-block">
          <div class="image-block">
            <img width="50px" height="50px" class="item-image" :class="getRarityClass(item.item.rarity)"
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
    <h1 class="sectionHeader">Магические предметы</h1>
    <div class="magic-items">
      <div class="section" v-for="item in magicItems" :key="item.id">
        <div class="section-start-block">
          <div class="image-block">
            <img width="50px" height="50px" class="item-image" :class="getRarityClass(item.item.rarity)"
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
    <h1 class="sectionHeader">Прочее</h1>
    <div class="other">
      <div class="section" v-for="item in otherItems" :key="item.id">
        <div class="section-start-block">
          <div class="image-block">
            <img width="50px" height="50px" class="item-image" :class="getRarityClass(item.item.rarity)"
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

.weight {

}

.sectionHeader {
  color: var(--ion-color-primary);
  font-size: 16pt;
  font-weight: bold;
}

.section {
  background-color: var(--ion-color-medium);
  border-radius: 25px;
  padding: 10px;
  overflow: hidden;
  max-height: 40vh;
  transition: max-height 4s ease;
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
  justify-content: flex-end; /* Aligns children to the right */
  align-items: flex-start; /* Aligns children to the top */
  position: relative;
  height: 100%;
}

.equip-button {
  /* Remove position: absolute */
  /* You can add other style properties like margins if needed */
}

.item-name {
  font-size: 16px;
  font-weight: bold;
}

.item-stats {
  font-size: 11pt;
}

.item-image {
  border-radius: 15px;
  border: 2px solid transparent;
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
