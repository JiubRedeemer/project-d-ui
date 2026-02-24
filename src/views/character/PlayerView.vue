<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTab,
  IonTabBar,
  IonTabButton,
  IonTabs,
  onIonViewDidEnter
} from "@ionic/vue";
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
import attacksTabIcon from "../../static/icons/Attack.svg"
import bioTabIcon from "../../static/icons/PersonalityTab.svg"
import inventoryTabIcon from "../../static/icons/InventoryTab.svg"
import notesTabIcon from "../../static/icons/NotesTab.svg"
import magicTabIcon from "../../static/icons/Magic.svg"
import InventoryView from "@/views/character/tabs/inventory/InventoryView.vue";
import {useCharacterStore} from "@/stores/CharacterStore";
import {useSubheaderOpenedStore} from "@/stores/SubheaderStore";
import {useInventoryStore} from "@/stores/InventoryStore";
import NotesView from "@/views/character/tabs/notes/NotesView.vue";
import MagicView from "@/views/character/tabs/magic/MagicView.vue";
import AttacksAndSkillsView from "@/views/character/tabs/attacksAndSkills/AttacksAndSkillsView.vue";
import {useCharacterSkillsStore} from "@/stores/CharacterSkillsStore";
import RestViewModal from "@/views/character/tabs/rest/RestViewModal.vue";
import EditSkillValueModal from "./tabs/common/bonus/EditSkillValueModal.vue";
import LevelUpViewModal from "@/views/character/tabs/level/LevelUpViewModal.vue";

const route = useRoute();
const characterStore = useCharacterStore()
const inventoryStore = useInventoryStore()
const asyncDone = ref<boolean>(false)
// const subheaderVisible = ref(true);
const showEditAbilityBonusModal = ref(false); // Управляем видимостью модалки
const showEditSkillBonusModal = ref(false); // Управляем видимостью модалки
const selectedAbility = ref<AbilityDto>();
const selectedSkill = ref<SkillDto>();
const showEditSpeedBonusModal = ref(false); // Управляем видимостью модалки
const showEditArmoryClassBonusModal = ref(false); // Управляем видимостью модалки
const showEditInitiativeBonusModal = ref(false); // Управляем видимостью модалки
const showEditHealthModal = ref(false); // Управляем видимостью модалки
const showRestModal = ref(false);
const showLevelUpModal = ref(false);
const selectedCharacter = ref<Character>();
const subheaderStore = useSubheaderOpenedStore();
const characterSkillsStore = useCharacterSkillsStore();

onIonViewDidEnter(async () => {
  await characterStore.updateCharacterInStoreById(route.params.roomId, route.params.characterId)
  await inventoryStore.updateInventoryInStoreById(route.params.roomId, route.params.characterId)
  await characterSkillsStore.updateCharacterSkills(route.params.roomId, route.params.characterId)
  asyncDone.value = true;
})

const openEditAbilityModal = (ability: AbilityDto) => {
  selectedAbility.value = ability;
  showEditAbilityBonusModal.value = true;
};

const openEditSkillModal = (skill: SkillDto) => {
  selectedSkill.value = skill;
  showEditSkillBonusModal.value = true;
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

const openRestModal = (character: Character) => {
  selectedCharacter.value = character;
  showRestModal.value = true;
}

const openLevelUpModal = () => {
  showLevelUpModal.value = true;
}


const closeEditAbilityModal = () => {
  showEditAbilityBonusModal.value = false; // Закрываем модалку
};

const closeEditSkillModal = () => {
  showEditSkillBonusModal.value = false; // Закрываем модалку
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
  subheaderStore.subheaderOpened = false; // Закрываем модалку
};

const closeRestModal = () => {
  showRestModal.value = false; // Закрываем модалку
};


const closeLevelUpModal = () => {
  showLevelUpModal.value = false;
};

const openSubheader = () => {
  subheaderStore.subheaderOpened = true; // Закрываем модалку
};

</script>

<template>
  <ion-page>
    <ion-header :translucent="false">
      <PlayerViewHeader v-if="asyncDone" @open-levelup-modal="openLevelUpModal"/>
      <div class="subheader-block" :class="{ openSubheader: subheaderStore.subheaderOpened }">
        <PlayerViewSubheader v-if="asyncDone" @speed-selected="openEditSpeedModal"
                             @armory-class-selected="openEditArmoryClassModal"
                             @initiative-selected="openEditInitiativeModal"
                             @health-selected="openHealthModal"
                             @close-subheader="closeSubheader"
                             @open-subheader="openSubheader"
                             @open-rest-modal="openRestModal"
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
          <div class="tab-content abilities" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <AbilitiesView v-if="asyncDone" @ability-selected="openEditAbilityModal" @skill-selected="openEditSkillModal"/>
          </div>
        </ion-content>
      </ion-tab>
      <ion-tab tab="attacks">
        <ion-content class="ion-padding"
                     :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div class="tab-content attacks" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <AttacksAndSkillsView v-if="asyncDone" @ability-selected="openEditAbilityModal"/>
          </div>
        </ion-content>
      </ion-tab>
      <ion-tab tab="bio">
        <ion-content class="ion-padding"
                     :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div class="tab-content bio" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <Suspense>
              <PersonalityView v-if="asyncDone"/>
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
          <div class="tab-content inventory" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <Suspense>
              <InventoryView v-if="asyncDone"/>
            </Suspense>
          </div>
        </ion-content>
      </ion-tab>
      <ion-tab tab="notes">
        <ion-content class="ion-padding"
                     :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div class="tab-content notes" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <Suspense>
              <NotesView v-if="asyncDone"/>
            </Suspense>
          </div>
        </ion-content>
      </ion-tab>
      <ion-tab tab="magic">
        <ion-content class="ion-padding"
                     :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div class="tab-content magic" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <Suspense>
              <MagicView v-if="asyncDone"/>
            </Suspense>
          </div>
        </ion-content>
      </ion-tab>
      <ion-tab-bar slot="bottom" color="dark" class="tab-bar" :translucent="true">
        <ion-tab-button tab="abilities">
          <div class="tab-icon-wrapper">
            <ion-icon :icon="abilitiesTabIcon"/>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="attacks">
          <div class="tab-icon-wrapper">
            <ion-icon :icon="attacksTabIcon"/>
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
        <ion-tab-button tab="notes">
          <div class="tab-icon-wrapper">
            <ion-icon :icon="notesTabIcon"/>
          </div>
        </ion-tab-button>
        <ion-tab-button tab="magic">
          <div class="tab-icon-wrapper">
            <ion-icon :icon="magicTabIcon"/>
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

    <EditSkillValueModal v-if="selectedSkill"
                           :skill="ref(selectedSkill)"
                           :isOpen="showEditSkillBonusModal"
                           :character-id="String(route.params.characterId)"
                           @closeEditSkillModal="closeEditSkillModal"/>                       

    <EditSpeedValueModal v-if="showEditSpeedBonusModal"
                         :isOpen="showEditSpeedBonusModal"
                         :character-id="String(route.params.characterId)"
                         :url="String(GATEWAY_INTEGRATION_ROUTES.speed)"
                         @closeEditSpeedModal="closeEditSpeedModal"/>

    <EditArmoryClassValueModal v-if="showEditArmoryClassBonusModal"
                               :isOpen="showEditArmoryClassBonusModal"
                               :character-id="String(route.params.characterId)"
                               :url="String(GATEWAY_INTEGRATION_ROUTES.armoryClass)"
                               @closeEditArmoryClassModal="closeEditArmoryClassModal"/>

    <EditInitiativeValueModal v-if="showEditInitiativeBonusModal"
                              :isOpen="showEditInitiativeBonusModal"
                              :character-id="String(route.params.characterId)"
                              :url="String(GATEWAY_INTEGRATION_ROUTES.initiative)"
                              @closeEditInitiativeModal="closeEditInitiativeModal"/>

    <RestViewModal v-if="showRestModal"
                   :isOpen="showRestModal"
                   @closeRestModal="closeRestModal"
    />

    <LevelUpViewModal v-if="showLevelUpModal"
                      :isOpen="showLevelUpModal"
                      @closeLevelUpModal="closeLevelUpModal"
    />
    <HpModal v-if="showEditHealthModal"
             :isOpen="showEditHealthModal"
             :character-id="String(route.params.characterId)"
             :url="String(GATEWAY_INTEGRATION_ROUTES.health)"
             @closeHpModal="closeEditHealthModal"/>
  </ion-page>
</template>


<style scoped>

.tab-bar, .tab-bar ion-tab-button {
  background: var(--ion-color-medium);
}

/* Обертка для иконки */
.tab-bar ion-tab-button .tab-icon-wrapper {
  border: 1px solid var(--ion-color-primary);
}


.tab-bar {
  background: var(--ion-color-medium);
  border-radius: 20px;
  margin: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
}

/* Каждая кнопка таба занимает равную ширину */
.tab-bar ion-tab-button {
  flex: 1;
  display: grid;
  justify-content: center;
  align-items: center;
  --background: transparent;
}

/* Обертка для иконки */
.tab-bar ion-tab-button .tab-icon-wrapper {
  width: 40px;
  height: 40px;
  border: 1px solid var(--ion-color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* Размер иконки внутри круга */
.tab-bar ion-tab-button ion-icon {
  width: 28px;
  height: 28px;
  color: white;
}

.abilities.openSubheader {
  margin-top: 120px;
}

.attacks.openSubheader {
  margin-top: 120px;
}

.bio.openSubheader {
  margin-top: 120px;
}

.inventory.openSubheader {
  margin-top: 120px;
}

.notes.openSubheader {
  margin-top: 120px;
}

.magic.openSubheader {
  margin-top: 120px;
}

.abilities {
  margin-top: 64px;
  transition: margin-top 0.3s ease;
}

.attacks {
  margin-top: 64px;
  transition: margin-top 0.3s ease;
}

.bio {
  margin-top: 64px;
  transition: margin-top 0.3s ease;
}

.inventory {
  margin-top: 64px;
  transition: margin-top 0.3s ease;
}

.notes {
  margin-top: 64px;
  transition: margin-top 0.3s ease;
}

.magic {
  margin-top: 64px;
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

