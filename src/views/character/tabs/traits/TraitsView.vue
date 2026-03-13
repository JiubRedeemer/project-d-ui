<script setup lang="ts">
import {useCharacterStore} from "@/stores/CharacterStore";

const characterStore = useCharacterStore();

function getPassiveByWis() {
  const wis = Math.floor((characterStore.character.abilities.filter(ability => ability.code === "WIS")[0].value + characterStore.character.abilities.filter(ability => ability.code === "WIS")[0].bonusValue - 10) / 2);
  return 10 + wis;
}

function getPassiveByInt() {
  const int = Math.floor((characterStore.character.abilities.filter(ability => ability.code === "INT")[0].value + characterStore.character.abilities.filter(ability => ability.code === "INT")[0].bonusValue - 10) / 2);
  return 10 + int;
}

function getRaceTraitsOrdered() {
  return characterStore.character.raceInfo?.traits?.sort((a, b) => {
    if (a.description?.length && b.description?.length)
      return a.description.length - b.description.length;
    else if (a.description?.length && !b.description?.length) return 1;
    else if (!a.description?.length && b.description?.length) return -1;
    else return 0;
  });
}

function getCharacterTraitsOrdered() {
  return characterStore.character?.traits?.sort((a, b) => {
    if (a.description?.length && b.description?.length)
      return a.description.length - b.description.length;
    else if (a.description?.length && !b.description?.length) return 1;
    else if (!a.description?.length && b.description?.length) return -1;
    else return 0;
  });
}
</script>

<template>
  <div class="traits-body">
    <div class="sectionHeader">Пассивные чувства</div>
    <div class="passive-feels">
      <div class="passive-feel">
        <div class="feel-name">Восприятие(Мудрость)</div>
        <div class="feel-value">{{ getPassiveByWis() }}</div>
      </div>
      <div class="passive-feel">
        <div class="feel-name">Проницательность(Мудрость)</div>
        <div class="feel-value">{{ getPassiveByWis() }}</div>
      </div>
      <div class="passive-feel">
        <div class="feel-name">Анализ(Интеллект)</div>
        <div class="feel-value">{{ getPassiveByInt() }}</div>
      </div>
    </div>
    <div class="sectionHeader">Владения</div>
    <div class="traits">
      <div class="race-trait section" v-for="(trait, index) in getRaceTraitsOrdered()" :key="index">
        <div class="trait-name">{{ trait.name }}</div>
        <div class="description">{{ trait.description }}</div>
      </div>
      <div class="character-trait section" v-for="(trait, index) in getCharacterTraitsOrdered()" :key="index">
        <div class="trait-name">{{ trait.name }}</div>
        <div class="description">{{ trait.description }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sectionHeader {
  color: var(--ion-color-light);
  font-size: 22px;
  font-weight: normal;
  margin-top: 10px;
  margin-bottom: 5px;
}

.section {
  background-color: var(--ion-color-medium);
  border-radius: 20px;
  padding: 10px;
  overflow: hidden;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.trait-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
}

.passive-feel {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 27px;
  margin-top: 10px;
  padding-left: 4px;
  padding-right: 4px;
  background: var(--ion-color-medium);
  border-radius: 20px;
}

.feel-name {
  padding-left: 4px;
}

.feel-value {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 11px;
  color: var(--ion-color-primary-contrast);
  background: var(--ion-color-primary);
  border-radius: 50%;
}
</style>