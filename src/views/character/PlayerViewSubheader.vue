<script setup lang="ts">

import {IonIcon} from "@ionic/vue";
import HpBar from "@/views/common/HpBar.vue";
import restIcon from "../../static/icons/rest.svg"
import armorIcon from "../../static/icons/Armor.svg"
import speedIcon from "../../static/icons/Speed.svg"
import {onMounted, ref} from "vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {Character} from "@/components/models/response/Character";
import {useRoute} from "vue-router";
import {HEADERS} from "@/config/localisations";

const characterDto = ref<Character>();
const route = useRoute()


onMounted(async () => {
  try {
    const response = await axios.get(
        GATEWAY_INTEGRATION_ROUTES.baseURL + GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.rooms + '/' + route.params.roomId + GATEWAY_INTEGRATION_ROUTES.characters + '/' + route.params.characterId + GATEWAY_INTEGRATION_ROUTES.charactersSubheader,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
          },
        }
    );
    characterDto.value = response.data;
  } catch (error) {

    console.error("Ошибка при получении данных:", error);
  }
});

const emits = defineEmits(["close-subheader", "speed-selected", "armory-class-selected", "initiative-selected", "health-selected"]);

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
  emits("close-subheader")
}

</script>

<template>

  <div class="subheader">
    <div class="start-icons">
      <div class="armory-class" @click="selectArmoryClass(characterDto!!)">
        <ion-icon class="armory-class-icon" slot="icon-only" :src="armorIcon"></ion-icon>
        <div
            class="armory-class-value">{{
            characterDto != null ? (characterDto?.armoryClass + characterDto?.bonusArmoryClass) : 0
          }}
        </div>
      </div>
      <div class="speed" @click="selectSpeed(characterDto!!)">
        <ion-icon class="speed-icon" slot="icon-only" :src="speedIcon" color="light"></ion-icon>
        <div class="speed-value">{{
            characterDto != null ? (characterDto?.speed + characterDto?.bonusSpeed) : 0
          }}
        </div>
      </div>
    </div>
    <div class="center-icons">
      <div class="inspiration">
        <div class="subheader-chip">
        </div>
        <div class="subheader-chip-name">
          {{ HEADERS.inspiration.rus }}
        </div>
      </div>
      <div class="initiative" @click="selectInitiative(characterDto!!)">
        <div class="subheader-chip">
          {{ characterDto != null ? (characterDto?.initiative + characterDto?.bonusInitiative) : 0 }}
        </div>
        <div class="subheader-chip-name">
          {{ HEADERS.initiative.rus }}
        </div>
      </div>
    </div>
    <div class="end-icons">
      <div class="rest">
        <ion-icon class="rest-icon" slot="icon-only" :src="restIcon" color="light">
        </ion-icon>
      </div>
      <div class="hp" @click="selectHealth(characterDto!!)">
        <hp-bar class="hp-icon" :currentHp="characterDto?.health.currentHp ? characterDto?.health.currentHp : 0"
                :maxHp="characterDto?.health.maxHp != null ? characterDto?.health.maxHp + characterDto.health.bonusValue: 0"
                :tempHp="characterDto?.health.tempHp ? characterDto?.health.tempHp : 0"/>
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
  padding-left: 10px;
  padding-right: 10px;
  margin-bottom: 10px;
}

.end-icons {
  margin-left: auto;
}

.armory-class {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 50px;
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
  font-size: 14px;
  font-weight: bold;
  pointer-events: none;
}

.speed {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 50px;
}

.speed-icon {
  width: 100%;
  height: 100%;
}

.speed-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 50%);
  color: var(--ion-color-light-contrast);
  font-size: 14px;
  font-weight: bold;
  pointer-events: none;
}

.hp {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 50px;
}

.hp-icon {
  width: 100%;
  height: 100%;
}

.rest {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 50px;
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
  width: 10vh;
  height: 18px;
  margin-bottom: 0;
  display: flex;
  padding: 5px;
  align-items: center;
  justify-content: center;
}

.subheader-chip-name {
  font-size: 10pt;
}

.initiative,
.inspiration {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  margin-bottom: 5px;
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
