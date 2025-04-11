<script setup lang="ts">
import {IonContent, IonHeader, IonIcon, IonPage, IonTab, IonTabBar, IonTabButton, IonTabs} from "@ionic/vue";
import PlayerViewHeader from "@/views/character/PlayerViewHeader.vue";
import AbilitiesView from "@/views/character/tabs/abilities/AbilitiesView.vue";
import PersonalityView from "@/views/character/tabs/bio/BioView.vue";
import PlayerViewSubheader from "@/views/character/PlayerViewSubheader.vue";
import {ref} from "vue";
import EditAbilityValueModal from "@/views/character/tabs/common/bonus/EditAbilityValueModal.vue";
import {useRoute} from "vue-router";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import EditSpeedValueModal from "@/views/character/tabs/common/bonus/EditSpeedValueModal.vue";
import {Character} from "@/components/models/response/Character";
import EditArmoryClassValueModal from "@/views/character/tabs/common/bonus/EditArmoryClassValueModal.vue";
import EditInitiativeValueModal from "@/views/character/tabs/common/bonus/EditInitiativeValueModal.vue";
import HpModal from "@/views/character/tabs/common/HpModal.vue";
import abilitiesTabIcon from "../../static/icons/AbilitiesTab.svg"
import bioTabIcon from "../../static/icons/PersonalityTab.svg"
import inventoryTabIcon from "../../static/icons/InventoryTab.svg"
import InventoryView from "@/views/character/tabs/inventory/InventoryView.vue";

const route = useRoute();

const subheaderVisible = ref(true);
const showEditAbilityBonusModal = ref(false); // Управляем видимостью модалки
const selectedAbility = ref<AbilityDto>();
const showEditSpeedBonusModal = ref(false); // Управляем видимостью модалки
const showEditArmoryClassBonusModal = ref(false); // Управляем видимостью модалки
const showEditInitiativeBonusModal = ref(false); // Управляем видимостью модалки
const showEditHealthModal = ref(false); // Управляем видимостью модалки
const selectedCharacter = ref<Character>();


const openEditAbilityModal = (ability: AbilityDto) => {
  selectedAbility.value = ability;
  showEditAbilityBonusModal.value = true;
};

const openEditSpeedModal = (character: Character) => {
  selectedCharacter.value = character;
  showEditSpeedBonusModal.value = true;
};

const openEditArmoryClassModal = (character: Character) => {
  selectedCharacter.value = character;
  showEditArmoryClassBonusModal.value = true;
};

const openEditInitiativeModal = (character: Character) => {
  selectedCharacter.value = character;
  showEditInitiativeBonusModal.value = true;
};

const openHealthModal = (character: Character) => {
  selectedCharacter.value = character;
  showEditHealthModal.value = true;
};


const closeEditAbilityModal = () => {
  showEditAbilityBonusModal.value = false; // Закрываем модалку
};

const closeEditSpeedModal = () => {
  showEditSpeedBonusModal.value = false; // Закрываем модалку
};

const closeEditArmoryClassModal = () => {
  showEditArmoryClassBonusModal.value = false; // Закрываем модалку
};

const closeEditInitiativeModal = () => {
  showEditInitiativeBonusModal.value = false; // Закрываем модалку
};

const closeEditHealthModal = () => {
  showEditHealthModal.value = false; // Закрываем модалку
};

const closeSubheader = () => {
  subheaderVisible.value = false; // Закрываем модалку
};

const openSubheader = () => {
  subheaderVisible.value = true; // Закрываем модалку
};

</script>

<template>
  <ion-page>
    <ion-header :transluent="false">
      <PlayerViewHeader/>
      <div class="subheader-block" :class="{ openSubheader: subheaderVisible }">
        <PlayerViewSubheader @speed-selected="openEditSpeedModal"
                             @armory-class-selected="openEditArmoryClassModal"
                             @initiative-selected="openEditInitiativeModal"
                             @health-selected="openHealthModal"
                             @close-subheader="closeSubheader"
                             @open-subheader="openSubheader"
        />
      </div>
    </ion-header>
    <IonTabs>
      <ion-tab tab="abilities">
        <ion-content class="ion-padding"
                     :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div class="abilities" :class="{ openSubheader: subheaderVisible }">
            <AbilitiesView @ability-selected="openEditAbilityModal"/>
          </div>
        </ion-content>
      </ion-tab>
      <ion-tab tab="bio">
        <ion-content class="ion-padding"
                     :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div class="bio" :class="{ openSubheader: subheaderVisible }">
            <Suspense>
              <PersonalityView/>
            </Suspense>
          </div>
        </ion-content>
      </ion-tab>
      <ion-tab tab="inventory">
        <ion-content class="ion-padding"
                     :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div class="inventory" :class="{ openSubheader: subheaderVisible }">
            <Suspense>
              <InventoryView/>
            </Suspense>
          </div>
        </ion-content>
      </ion-tab>
      <ion-tab-bar slot="bottom" color="dark" class="tab-bar" :transluent="true">
        <ion-tab-button tab="abilities">
          <div class="tab-icon-wrapper">
            <ion-icon :icon="abilitiesTabIcon"/>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="bio">
          <div class="tab-icon-wrapper">
            <ion-icon :icon="bioTabIcon"/>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="inventory">
          <div class="tab-icon-wrapper">
            <ion-icon :icon="inventoryTabIcon"/>
          </div>
        </ion-tab-button>
      </ion-tab-bar>
    </IonTabs>


    <!-- Модалка -->
    <EditAbilityValueModal v-if="selectedAbility"
                           :ability="ref(selectedAbility)"
                           :isOpen="showEditAbilityBonusModal"
                           :character-id="String(route.params.characterId)"
                           :url="String(GATEWAY_INTEGRATION_ROUTES.characterAbilities + '/' + selectedAbility.code)"
                           @closeEditAbilityModal="closeEditAbilityModal"/>

    <EditSpeedValueModal v-if="showEditSpeedBonusModal"
                         :character="ref(selectedCharacter)"
                         :isOpen="showEditSpeedBonusModal"
                         :character-id="String(route.params.characterId)"
                         :url="String(GATEWAY_INTEGRATION_ROUTES.speed)"
                         @closeEditSpeedModal="closeEditSpeedModal"/>

    <EditArmoryClassValueModal v-if="showEditArmoryClassBonusModal"
                               :character="ref(selectedCharacter)"
                               :isOpen="showEditArmoryClassBonusModal"
                               :character-id="String(route.params.characterId)"
                               :url="String(GATEWAY_INTEGRATION_ROUTES.armoryClass)"
                               @closeEditArmoryClassModal="closeEditArmoryClassModal"/>

    <EditInitiativeValueModal v-if="showEditInitiativeBonusModal"
                              :character="ref(selectedCharacter)"
                              :isOpen="showEditInitiativeBonusModal"
                              :character-id="String(route.params.characterId)"
                              :url="String(GATEWAY_INTEGRATION_ROUTES.initiative)"
                              @closeEditInitiativeModal="closeEditInitiativeModal"/>

    <HpModal v-if="showEditHealthModal"
             :character="ref(selectedCharacter)"
             :isOpen="showEditHealthModal"
             :character-id="String(route.params.characterId)"
             :url="String(GATEWAY_INTEGRATION_ROUTES.health)"
             @closeHpModal="closeEditHealthModal"/>
  </ion-page>
</template>


<style scoped>

.tab-bar, .tab-bar ion-tab-button {
  background: var(--ion-color-medium);
  border-radius: 15px;
  margin: 10px;
}

/* Обертка для иконки */
.tab-bar ion-tab-button .tab-icon-wrapper {
  width: 50px; /* Размер круга */
  height: 50px;
  border: 1px solid var(--ion-color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* Размер иконки внутри круга */
.tab-bar ion-tab-button ion-icon {
  width: 35px;
  height: 35px;
  color: white; /* Цвет иконки */
}

.abilities.openSubheader {
  margin-top: 30%;
}

.bio.openSubheader {
  margin-top: 30%;
}

.inventory.openSubheader {
  margin-top: 30%;
}

.abilities {
  margin-top: 15%;
  transition: margin-top 0.3s ease;
}

.bio {
  margin-top: 15%;
  transition: margin-top 0.3s ease;
}

.inventory {
  margin-top: 15%;
  transition: margin-top 0.3s ease;
}

.subheader-block {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background-color: var(--ion-color-dark);
  max-height: 1vh;
  overflow: clip;
  transition: max-height 0.3s ease;
}

.subheader-block.openSubheader {
  max-height: 140%; /* Высота в развернутом состоянии */
}
</style>
