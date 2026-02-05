<script setup lang="ts">
import {IonContent, IonHeader, IonIcon, IonPage, IonTab, IonTabBar, IonTabButton, IonTabs} from "@ionic/vue";
import PlayerViewHeader from "@/views/character/PlayerViewHeader.vue";
import AbilitiesView from "@/views/character/tabs/abilities/AbilitiesView.vue";
import PersonalityView from "@/views/character/tabs/bio/BioView.vue";
import PlayerViewSubheader from "@/views/character/PlayerViewSubheader.vue";
import {onMounted, ref} from "vue";
import EditAbilityValueModal from "@/views/character/tabs/common/bonus/EditAbilityValueModal.vue";
import {useRoute} from "vue-router";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import EditSpeedValueModal from "@/views/character/tabs/common/bonus/EditSpeedValueModal.vue";
import {Character} from "@/components/models/response/Character";
import EditArmoryClassValueModal from "@/views/character/tabs/common/bonus/EditArmoryClassValueModal.vue";
import EditInitiativeValueModal from "@/views/character/tabs/common/bonus/EditInitiativeValueModal.vue";
import HpModal from "@/views/character/tabs/common/HpModal.vue";
import abilitiesTabIcon from "../../static/icons/AbilitiesTab.svg"
import attacksTabIcon from "../../static/icons/AbilitiesTab.svg"
import bioTabIcon from "../../static/icons/PersonalityTab.svg"
import inventoryTabIcon from "../../static/icons/InventoryTab.svg"
import notesTabIcon from "../../static/icons/NotesTab.svg"
import InventoryView from "@/views/character/tabs/inventory/InventoryView.vue";
import {useCharacterStore} from "@/stores/CharacterStore";
import {useSubheaderOpenedStore} from "@/stores/SubheaderStore";
import {useInventoryStore} from "@/stores/InventoryStore";
import NotesView from "@/views/character/tabs/notes/NotesView.vue";
import MagicView from "@/views/character/tabs/magic/MagicView.vue";
import AttacksAndSkillsView from "@/views/character/tabs/attacksAndSkills/AttacksAndSkillsView.vue";
import {useCharacterSkillsStore} from "@/stores/CharacterSkillsStore";
import RestViewModal from "@/views/character/tabs/rest/RestViewModal.vue";
import {useAppRouter} from "@/composables/useAppRouter";

const route = useRoute();
const { isDesktop } = useAppRouter();
const desktopTab = ref<string>('abilities');
const characterStore = useCharacterStore()
const inventoryStore = useInventoryStore()
const asyncDone = ref<boolean>(false)
// const subheaderVisible = ref(true);
const showEditAbilityBonusModal = ref(false); // Управляем видимостью модалки
const selectedAbility = ref<AbilityDto>();
const showEditSpeedBonusModal = ref(false); // Управляем видимостью модалки
const showEditArmoryClassBonusModal = ref(false); // Управляем видимостью модалки
const showEditInitiativeBonusModal = ref(false); // Управляем видимостью модалки
const showEditHealthModal = ref(false); // Управляем видимостью модалки
const showRestModal = ref(false);
const selectedCharacter = ref<Character>();
const subheaderStore = useSubheaderOpenedStore();
const characterSkillsStore = useCharacterSkillsStore();

onMounted(async () => {
  if (characterStore.character != null) {
    await characterStore.updateCharacterInStoreById(route.params.roomId, route.params.characterId)
    await inventoryStore.updateInventoryInStoreById(route.params.roomId, route.params.characterId)
    await characterSkillsStore.updateCharacterSkills(route.params.roomId, route.params.characterId)
  }
  asyncDone.value = true;
})


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

const openRestModal = (character: Character) => {
  selectedCharacter.value = character;
  showRestModal.value = true;
}


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
  subheaderStore.subheaderOpened = false; // Закрываем модалку
};

const closeRestModal = () => {
  showRestModal.value = false; // Закрываем модалку
};


const openSubheader = () => {
  subheaderStore.subheaderOpened = true; // Закрываем модалку
};

const desktopTabs = [
  { id: 'abilities', label: 'Характеристики' },
  { id: 'attacks', label: 'Атаки' },
  { id: 'bio', label: 'Биография' },
  { id: 'inventory', label: 'Инвентарь' },
  { id: 'notes', label: 'Заметки' },
  { id: 'magic', label: 'Магия' },
];

</script>

<template>
  <ion-page :class="{ 'desktop-player-view': isDesktop }">
    <!-- Desktop template: header + subheader + side tabs + content -->
    <template v-if="isDesktop">
      <ion-header :transluent="false" class="desktop-player-header">
        <div class="desktop-header-content" v-if="characterStore.character">
          <div class="desktop-header-title">
            <div class="desktop-name">{{ characterStore.character.name }}</div>
            <div class="desktop-subtitle">
              {{ characterStore.character.raceInfo?.name }} — {{ characterStore.character.clazzInfo?.name }}
            </div>
          </div>
          <div class="desktop-header-stats">
            <button class="desktop-stat-chip" type="button" @click="openEditArmoryClassModal(characterStore.character)">
              <span class="desktop-stat-label">КД</span>
              <span class="desktop-stat-value">{{ characterStore.character.armoryClass }}</span>
            </button>
            <button class="desktop-stat-chip" type="button" @click="openEditSpeedModal(characterStore.character)">
              <span class="desktop-stat-label">Скорость</span>
              <span class="desktop-stat-value">{{ characterStore.character.speed }}</span>
            </button>
            <button class="desktop-stat-chip" type="button" @click="openEditInitiativeModal(characterStore.character)">
              <span class="desktop-stat-label">Инициатива</span>
              <span class="desktop-stat-value">{{ characterStore.character.initiative }}</span>
            </button>
            <button class="desktop-stat-chip" type="button" @click="openHealthModal(characterStore.character)">
              <span class="desktop-stat-label">HP</span>
              <span class="desktop-stat-value">
                {{ characterStore.character.health?.current }}/{{ characterStore.character.health?.max }}
              </span>
            </button>
          </div>
        </div>
      </ion-header>
      <div class="desktop-player-body">
        <nav class="desktop-tab-bar">
          <button v-for="t in desktopTabs" :key="t.id" type="button"
                  class="desktop-tab-btn" :class="{ active: desktopTab === t.id }"
                  @click="desktopTab = t.id">
            <span class="desktop-tab-label">{{ t.label }}</span>
          </button>
        </nav>
        <main class="desktop-tab-content">
          <div v-show="desktopTab === 'abilities'" class="desktop-tab-pane">
            <AbilitiesView v-if="asyncDone" @ability-selected="openEditAbilityModal"/>
          </div>
          <div v-show="desktopTab === 'attacks'" class="desktop-tab-pane">
            <AttacksAndSkillsView v-if="asyncDone" @ability-selected="openEditAbilityModal"/>
          </div>
          <div v-show="desktopTab === 'bio'" class="desktop-tab-pane">
            <Suspense><PersonalityView v-if="asyncDone"/></Suspense>
          </div>
          <div v-show="desktopTab === 'inventory'" class="desktop-tab-pane">
            <Suspense><InventoryView v-if="asyncDone"/></Suspense>
          </div>
          <div v-show="desktopTab === 'notes'" class="desktop-tab-pane">
            <Suspense><NotesView v-if="asyncDone"/></Suspense>
          </div>
          <div v-show="desktopTab === 'magic'" class="desktop-tab-pane">
            <Suspense><MagicView v-if="asyncDone"/></Suspense>
          </div>
        </main>
      </div>
    </template>
    <!-- Mobile template: original IonTabs -->
    <template v-else>
    <ion-header :transluent="false">
      <PlayerViewHeader v-if="asyncDone"/>
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
          <div class="abilities" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <AbilitiesView v-if="asyncDone" @ability-selected="openEditAbilityModal"/>
          </div>
        </ion-content>
      </ion-tab>
      <ion-tab tab="attacks">
        <ion-content class="ion-padding"
                     :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div class="attacks" :class="{ openSubheader: subheaderStore.subheaderOpened }">
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
          <div class="bio" :class="{ openSubheader: subheaderStore.subheaderOpened }">
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
          <div class="inventory" :class="{ openSubheader: subheaderStore.subheaderOpened }">
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
          <div class="notes" :class="{ openSubheader: subheaderStore.subheaderOpened }">
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
          <div class="magic" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <Suspense>
              <MagicView v-if="asyncDone"/>
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
            <ion-icon :icon="attacksTabIcon"/>
          </div>
        </ion-tab-button>
      </ion-tab-bar>
    </IonTabs>
    </template>

    <!-- Модалка -->
    <EditAbilityValueModal v-if="selectedAbility"
                           :ability="ref(selectedAbility)"
                           :isOpen="showEditAbilityBonusModal"
                           :character-id="String(route.params.characterId)"
                           :url="String(GATEWAY_INTEGRATION_ROUTES.characterAbilities + '/' + selectedAbility.code)"
                           @closeEditAbilityModal="closeEditAbilityModal"/>

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

/* Desktop template */
.desktop-player-view.desktop-player-view {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.desktop-player-header {
  flex-shrink: 0;
}
.desktop-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 24px;
  background: var(--ion-color-medium);
  border-bottom: 1px solid var(--ion-color-medium-shade);
}
.desktop-header-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.desktop-name {
  font-size: 1.25rem;
  font-weight: 600;
}
.desktop-subtitle {
  font-size: 0.9rem;
  color: var(--ion-color-primary);
}
.desktop-header-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.desktop-stat-chip {
  background: var(--ion-color-dark);
  color: var(--ion-color-light);
  border: 1px solid var(--ion-color-primary);
  border-radius: 999px;
  padding: 6px 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.desktop-stat-chip:hover {
  background: var(--ion-color-medium-tint);
}
.desktop-stat-label {
  font-size: 0.75rem;
  opacity: 0.85;
}
.desktop-stat-value {
  font-weight: 600;
}
.desktop-subheader-inline {
  max-height: none;
  overflow: visible;
}
.desktop-player-body {
  flex: 1;
  display: flex;
  align-items: stretch;
  min-height: 0;
}
.desktop-tab-bar {
  width: 200px;
  flex-shrink: 0;
  background: var(--ion-color-medium);
  border-right: 1px solid var(--ion-color-medium-shade);
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}
.desktop-tab-btn {
  background: none;
  border: none;
  color: var(--ion-color-medium-contrast);
  padding: 12px 20px;
  text-align: left;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.15s ease;
}
.desktop-tab-btn:hover {
  background: var(--ion-color-medium-tint);
}
.desktop-tab-btn.active {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.desktop-tab-content {
  flex: 1;
  overflow: auto;
  padding: 24px 32px;
  max-width: none;
  margin: 0;
  width: 100%;
}
.desktop-tab-pane {
  min-height: 100%;
}

.desktop-player-view :deep(.subheader-show-arrow) {
  display: none;
}
</style>
