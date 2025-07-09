<script setup lang="ts">

import {IonIcon} from "@ionic/vue";
import HpBar from "@/views/common/HpBar.vue";
import restIcon from "../../static/icons/rest.svg"
import armorIcon from "../../static/icons/Armor.svg"
import speedIcon from "../../static/icons/Speed.svg"
import {Character, EquippedItemsStatsResponse} from "@/components/models/response/Character";
import {HEADERS} from "@/config/localisations";
import {useCharacterStore} from "@/stores/CharacterStore";
import {useSubheaderOpenedStore} from "@/stores/SubheaderStore";

const characterStore = useCharacterStore()
const subheaderStore = useSubheaderOpenedStore();

function getArmoryClassBonusSum(itemStats: EquippedItemsStatsResponse | null): number {
  if(!itemStats) return 0;
  if (!itemStats.armoryClassBonus) return 0;

  return itemStats.armoryClassBonus.reduce((sum, stat) => {
    const value = typeof stat.value === 'number' ? stat.value : Number(stat.value);
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
}

function getSpeedBonusSum(itemStats: EquippedItemsStatsResponse | null): number {
  if(!itemStats) return 0;
  if (!itemStats.speedBonus) return 0;

  return itemStats.speedBonus.reduce((sum, stat) => {
    const value = typeof stat.value === 'number' ? stat.value : Number(stat.value);
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
}

const emits = defineEmits(["open-subheader", "close-subheader", "speed-selected", "armory-class-selected", "initiative-selected", "health-selected"]);

const selectSpeed = (character: Character) => {
  emits("speed-selected", character);
};

const selectArmoryClass = (character: Character) => {
  emits("armory-class-selected", character);
};

const selectInitiative = (character: Character) => {
  emits("initiative-selected", character);
};

const selectHealth = (character: Character) => {
  emits("health-selected", character);
};

const closeSubheader = () => {
  subheaderStore.subheaderOpened = !subheaderStore.subheaderOpened
  if (subheaderStore.subheaderOpened) {
    emits("open-subheader");
  } else {
    emits("close-subheader")
  }
}

</script>

<template>

  <div class="subheader">
    <div class="start-icons" v-show="subheaderStore.subheaderOpened">
      <div class="armory-class" @click="selectArmoryClass(characterStore.character!!)">
        <ion-icon class="armory-class-icon" slot="icon-only" :src="armorIcon"></ion-icon>
        <div
            class="armory-class-value">{{
            characterStore.character != null ? (characterStore.character?.armoryClass + characterStore.character?.bonusArmoryClass + getArmoryClassBonusSum(characterStore.character?.itemStats)) : 0
          }}
        </div>
      </div>
      <div class="speed" @click="selectSpeed(characterStore.character!!)">
        <ion-icon class="speed-icon" slot="icon-only" :src="speedIcon" color="light"></ion-icon>
        <div class="speed-value">{{
            characterStore.character != null ? (characterStore.character?.speed + characterStore.character?.bonusSpeed + getSpeedBonusSum(characterStore.character?.itemStats)) : 0
          }}
        </div>
      </div>
    </div>
    <div class="center-icons" v-show="subheaderStore.subheaderOpened">
      <div class="inspiration">
        <div class="subheader-chip">
        </div>
        <div class="subheader-chip-name">
          {{ HEADERS.inspiration.rus }}
        </div>
      </div>
      <div class="initiative" @click="selectInitiative(characterStore.character!!)">
        <div class="subheader-chip">
          {{
            characterStore.character != null ? (characterStore.character?.initiative + characterStore.character?.bonusInitiative) : 0
          }}
        </div>
        <div class="subheader-chip-name">
          {{ HEADERS.initiative.rus }}
        </div>
      </div>
    </div>
    <div class="end-icons" v-show="subheaderStore.subheaderOpened">
      <div class="rest">
        <ion-icon class="rest-icon" slot="icon-only" :src="restIcon" color="light">
        </ion-icon>
      </div>
      <div class="hp" @click="selectHealth(characterStore.character!!)">
        <hp-bar class="hp-icon"/>
      </div>
    </div>
  </div>
  <div class="subheader-show-arrow">
    <div class="arrow" @click="closeSubheader">⌃</div>
  </div>
</template>

<style scoped>
.subheader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  border-bottom-right-radius: 100px;
  border-bottom-left-radius: 100px;
  padding-left: 20px;
  padding-right: 20px;
  margin-bottom: 10px;
}

.end-icons {
  margin-left: auto;
}

.armory-class {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 40px;
}

.armory-class-icon {
  width: 100%;
  height: 100%;
  fill: var(--ion-color-light);
}

.armory-class-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
  pointer-events: none;
}

.speed {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 40px;
}

.speed-icon {
  width: 100%;
  height: 100%;
}

.speed-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 40%);
  color: var(--ion-color-light-contrast);
  font-size: 12px;
  font-weight: bold;
  pointer-events: none;
}

.hp {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 40px;
}

.hp-icon {
  width: 100%;
  height: 100%;
}

.rest {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 40px;
}

.rest-icon {
  width: 100%;
  height: 100%;
}

.center-icons {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
  flex-direction: column;
}

.subheader-chip {
  background-color: var(--ion-color-medium-tint);
  border-radius: 10px;
  width: 20vw;
  height: 18px;
  margin-bottom: 0;
  display: flex;
  padding: 5px;
  align-items: center;
  justify-content: center;
}

.subheader-chip-name {
  font-size: 10px;
}

.initiative,
.inspiration {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.subheader-show-arrow {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-60%);
  background: var(--ion-color-medium);
  border-radius: 50%;
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.arrow {
  font-size: 20px;
  color: white;
}
</style>
