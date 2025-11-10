<script setup lang="ts">

import {HEADERS, TEXTS} from "@/config/localisations";
import {computed} from "vue";
import {useInventoryStore} from "@/stores/InventoryStore";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useCharacterStore} from "@/stores/CharacterStore";
import {InventoryItem} from "@/components/models/response/InventoryResponse";

const inventoryStore = useInventoryStore();
const characterStore = useCharacterStore();

const str = Math.floor((characterStore.character.abilities.filter(ability => ability.code === "STR")[0].value - 10) / 2);
const dex = Math.floor((characterStore.character.abilities.filter(ability => ability.code === "DEX")[0].value - 10) / 2);

const equippedItems = computed(() => inventoryStore.inventory?.items?.filter(item => item.inUse && (item.item.type === "WEAPON")));
const skills = [];

const getItemImageUrl = (imgUrl: string | undefined) => {
  return imgUrl != null
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png';
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

const getItemStats = (item: InventoryItem) => {
  const stats: string[] = [];


  if (item.item.stats?.damage) {
    stats.push(`${TEXTS.damage.rus}: ${item.item.stats.damage.damageTypeName}`);
  }


  if (item.item.subtypeName) {
    stats.push(`${TEXTS.type.rus}: ${item.item.subtypeName}`);
  }

  return stats;
};


const calculateAttack = (item: InventoryItem) => {
  if (item.item.subtype === 'EHW' || item.item.subtype === 'AHW' || item.item.subtype === 'SHW') {
    return characterStore.character.proficiencyBonus + str;
  } else if(item.item.subtype === 'ERW' || item.item.subtype === 'ARW' || item.item.subtype === 'SRW'){
    return characterStore.character.proficiencyBonus + dex;
  }
  return 1;
};
</script>

<template>
  <div class="inventory-body">
    <h1 class="sectionHeader" v-if="equippedItems?.length! > 0">{{ HEADERS.equipped.rus }}</h1>
    <div class="equipped" v-if="equippedItems?.length! > 0">
      <div class="section" v-for="item in equippedItems" :key="item.id">
        <div class="section-start-block" @click="">
          <div class="image-block">
            <img width="55px" height="55px" class="item-image" :class="getRarityClass(item.item.rarity)"
                 :src="getItemImageUrl(item.item.imgUrl)"
                 :alt="item.item.name.rus"/>
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
          <div class="attack">
            <div class="attack-name">Атака</div>
            <div class="attack-value">{{ calculateAttack(item) }}</div>
          </div>
          <div class="damage">
            <div class="damage-name">Урон</div>
            <div class="damage-value">{{ item.item.stats.damage.value }}</div>
          </div>
        </div>
      </div>
    </div>
    <h1 class="sectionHeader" v-if="skills?.length! > 0">{{ HEADERS.skills.rus }}</h1>
    <div class="skills" v-if="skills?.length! > 0">
      <div class="section" v-for="item in equippedItems" :key="item.id">
        <div class="section-start-block" @click="">
          <div class="image-block">
            <img width="55px" height="55px" class="item-image" :class="getRarityClass(item.item.rarity)"
                 :src="getItemImageUrl(item.item.imgUrl)"
                 :alt="item.item.name.rus"/>
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
          <div class="attack">
            <div class="attack-name">Атака</div>
            <div class="attack-value">{{ calculateAttack(item) }}</div>
          </div>
          <div class="damage">
            <div class="damage-name">Урон</div>
            <div class="damage-value">{{ item.item.stats.damage.value }}</div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>

.sectionHeader {
  color: var(--ion-color-light);
  font-size: 18px;
  font-weight: normal;
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
  justify-content: space-between;
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

.damage, .attack {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  background: var(--ion-color-medium-tint);
  border-radius: 10px;
  font-size: 11px;
  height: 20px;
  padding-left: 5px;
  width: 90px;
}

.damage-value, .attack-value {
  font-size: 11px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border-radius: 50%;
  height: 25px;
  width: 25px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>