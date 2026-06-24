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
  onIonViewDidEnter,
  onIonViewDidLeave,
  toastController
} from "@ionic/vue";
import PlayerViewHeader from "@/views/character/PlayerViewHeader.vue";
import AbilitiesView from "@/views/character/tabs/abilities/AbilitiesView.vue";
import PersonalityView from "@/views/character/tabs/bio/BioView.vue";
import PlayerViewSubheader from "@/views/character/PlayerViewSubheader.vue";
import {computed, onMounted, onUnmounted, ref} from "vue";
import EditAbilityValueModal from "@/views/character/tabs/common/bonus/EditAbilityValueModal.vue";
import {useRoute} from "vue-router";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import EditSpeedValueModal from "@/views/character/tabs/common/bonus/EditSpeedValueModal.vue";
import {Character} from "@/components/models/response/Character";
import EditArmoryClassValueModal from "@/views/character/tabs/common/bonus/EditArmoryClassValueModal.vue";
import EditInitiativeValueModal from "@/views/character/tabs/common/bonus/EditInitiativeValueModal.vue";
import HpModal from "@/views/character/tabs/common/HpModal.vue";
import abilitiesTabIcon from "../../static/icons/AbilitiesTab.svg"
import attacksTabIcon from "../../static/icons/AttackTab.svg"
import bioTabIcon from "../../static/icons/PersonalityTab.svg"
import inventoryTabIcon from "../../static/icons/InventoryTab.svg"
import notesTabIcon from "../../static/icons/NotesTab.svg"
import magicTabIcon from "../../static/icons/Magic.svg"
import traitsTabIcon from "../../static/icons/TraitsTab.svg"
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
import TraitsView from "@/views/character/tabs/traits/TraitsView.vue";
import {useCharacterWebSocket} from "@/composables/useCharacterWebSocket";
import {useMagicStore} from "@/stores/MagicStore";
import {useNoteStore} from "@/stores/NoteStore";
import {useWalletStore} from "@/stores/WalletStore";

const route = useRoute();
const characterStore = useCharacterStore()
const inventoryStore = useInventoryStore()
const magicStore = useMagicStore()
const noteStore = useNoteStore()
const walletStore = useWalletStore()
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

const earlyVersionClickCount = ref(0);
type PlayerTabKey = "abilities" | "attacks" | "bio" | "traits" | "inventory" | "notes" | "magic";
const selectedTab = ref<PlayerTabKey>("abilities");
const isDesktop = ref<boolean>(window.innerWidth >= 1024);
const DESKTOP_BREAKPOINT_PX = 1024;

const EARLY_VERSION_DEFAULT_TEXT =
  "Вы используете альфа-версию приложения — спасибо, что вы с нами на этом этапе!";
const EARLY_VERSION_NON_RU_TEXT =
  "Отключите VPN, приложение может работать не стабильно";

const ipCountryCode = ref<string | null>(null);
const isNonRussianIp = computed(() => ipCountryCode.value != null && ipCountryCode.value !== "RU");
const earlyVersionText = computed(() => (isNonRussianIp.value ? EARLY_VERSION_NON_RU_TEXT : EARLY_VERSION_DEFAULT_TEXT));

const tabs = [
  {key: "abilities", icon: abilitiesTabIcon, label: "Характеристики"},
  {key: "attacks", icon: attacksTabIcon, label: "Атаки и навыки"},
  {key: "bio", icon: bioTabIcon, label: "Биография"},
  {key: "traits", icon: traitsTabIcon, label: "Черты"},
  {key: "inventory", icon: inventoryTabIcon, label: "Инвентарь"},
  {key: "notes", icon: notesTabIcon, label: "Заметки"},
  {key: "magic", icon: magicTabIcon, label: "Магия"},
] as const;

const selectedTabTitle = computed(() => {
  return tabs.find((tab) => tab.key === selectedTab.value)?.label ?? "";
});

const onEarlyVersionStubClick = async () => {
  earlyVersionClickCount.value += 1;

  if (earlyVersionClickCount.value === 5) {
    const toast = await toastController.create({
      message: "Зачем жмал то?",
      duration: 2000,
      position: "top",
    });
    await toast.present();
    earlyVersionClickCount.value = 0;
  }
};

let wsClient: ReturnType<typeof useCharacterWebSocket> | null = null;

onIonViewDidEnter(async () => {
  const roomId = route.params.roomId as string;
  const characterId = route.params.characterId as string;

  await characterStore.updateCharacterInStoreById(roomId, characterId);
  await inventoryStore.updateInventoryInStoreById(roomId, characterId);
  await characterSkillsStore.updateCharacterSkills(roomId, characterId);

  wsClient = useCharacterWebSocket(roomId, characterId, () => {
    characterStore.updateCharacterInStoreById(roomId, characterId);
    inventoryStore.updateInventoryInStoreById(roomId, characterId);
    walletStore.updateWallet(roomId, characterId);
    magicStore.updateSpellBookInStore(roomId, characterId);
    noteStore.triggerRefresh();
  });

  asyncDone.value = true;
});

onIonViewDidLeave(() => {
  wsClient?.deactivate();
  wsClient = null;
});

const onResize = () => {
  isDesktop.value = window.innerWidth >= DESKTOP_BREAKPOINT_PX;
};

const selectDesktopTab = (tab: PlayerTabKey) => {
  selectedTab.value = tab;
};

const onTabsChange = (event: CustomEvent<{ tab: string }>) => {
  const tab = event?.detail?.tab;
  if (tab === "abilities" || tab === "attacks" || tab === "bio" || tab === "traits" || tab === "inventory" || tab === "notes" || tab === "magic") {
    selectedTab.value = tab;
  }
};

onMounted(() => {
  window.addEventListener("resize", onResize);
  void detectIpCountryCode();
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});

async function detectIpCountryCode(): Promise<void> {
  const STORAGE_KEY = "ipCountryCode";
  const STORAGE_TS_KEY = "ipCountryCodeTs";
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

  try {
    const cached = sessionStorage.getItem(STORAGE_KEY);
    const cachedTs = Number(sessionStorage.getItem(STORAGE_TS_KEY));
    if (cached && /^[A-Z]{2}$/.test(cached) && Number.isFinite(cachedTs) && Date.now() - cachedTs < CACHE_TTL_MS) {
      ipCountryCode.value = cached;
      return;
    }
  } catch {
    // ignore storage errors (private mode, etc.)
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);
  try {
    // Minimal, CORS-friendly endpoint returning 2-letter country code (e.g. "RU\n")
    const res = await fetch("https://ipapi.co/country/", {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return;

    const text = (await res.text()).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(text)) return;

    ipCountryCode.value = text;
    try {
      sessionStorage.setItem(STORAGE_KEY, text);
      sessionStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  } catch {
    // ignore network errors
  } finally {
    window.clearTimeout(timeout);
  }
}

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
  selectedAbility.value = null;
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
    <ion-header :translucent="false" class="character-header">
      <PlayerViewHeader v-if="asyncDone" @open-levelup-modal="openLevelUpModal"/>
      <div v-if="subheaderStore.subheaderOpened" class="character-header__divider" aria-hidden="true"/>
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
    <div v-if="isDesktop" class="desktop-layout">
      <aside class="desktop-sidebar">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="desktop-tab-button"
          :class="{ active: selectedTab === tab.key }"
          type="button"
          @click="selectDesktopTab(tab.key)"
        >
          <ion-icon :icon="tab.icon"/>
          <span>{{ tab.label }}</span>
        </button>
      </aside>
      <section class="desktop-content">
        <div class="desktop-content-header">
          <h2>{{ selectedTabTitle }}</h2>
        </div>
        <ion-content class="ion-padding"
                     :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div class="tab-content desktop-content-inner" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <AbilitiesView v-if="asyncDone && selectedTab === 'abilities'" @ability-selected="openEditAbilityModal"
                           @skill-selected="openEditSkillModal"/>
            <AttacksAndSkillsView v-if="asyncDone && selectedTab === 'attacks'" @ability-selected="openEditAbilityModal"/>
            <Suspense>
              <PersonalityView v-if="asyncDone && selectedTab === 'bio'"/>
            </Suspense>
            <Suspense>
              <TraitsView v-if="asyncDone && selectedTab === 'traits'"/>
            </Suspense>
            <Suspense>
              <InventoryView v-if="asyncDone && selectedTab === 'inventory'"/>
            </Suspense>
            <Suspense>
              <NotesView v-if="asyncDone && selectedTab === 'notes'"/>
            </Suspense>
            <Suspense>
              <MagicView v-if="asyncDone && selectedTab === 'magic'"/>
            </Suspense>
          </div>
        </ion-content>
      </section>
    </div>
    <IonTabs v-else @ionTabsDidChange="onTabsChange">
      <ion-tab tab="abilities">
        <ion-content class="ion-padding"
                     :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div class="tab-content abilities" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <AbilitiesView v-if="asyncDone" @ability-selected="openEditAbilityModal"
                           @skill-selected="openEditSkillModal"/>
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
      <ion-tab tab="traits">
        <ion-content class="ion-padding"
                     :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div class="tab-content traits" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <Suspense>
              <TraitsView v-if="asyncDone"/>
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
        <ion-tab-button tab="traits">
          <div class="tab-icon-wrapper">
            <ion-icon :icon="traitsTabIcon"/>
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

      <!-- Заглушка для ранней версии функционала -->
      <div
        class="early-version-stub"
        role="button"
        tabindex="0"
        :aria-label="earlyVersionText"
        @click="onEarlyVersionStubClick"
        @keydown.enter.prevent="onEarlyVersionStubClick"
      >
        <span class="early-version-stub__text">{{ earlyVersionText }}</span>
      </div>
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

ion-header.character-header {
  overflow: visible;
}

.character-header__divider {
  height: 1px;
  margin: 0 12px;
  background: rgba(var(--ion-color-dark-rgb), 1);
}

.desktop-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  height: 100%;
  padding: 16px;
  background: var(--ion-color-dark);
}

.desktop-sidebar {
  background: linear-gradient(160deg, rgba(var(--ion-color-medium-rgb), 0.95) 0%, rgba(var(--ion-color-dark-rgb), 0.9) 100%);
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  border-radius: 18px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.desktop-tab-button {
  position: relative;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: rgba(var(--ion-color-light-rgb), 0.82);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.desktop-tab-button ion-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.desktop-tab-button:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  color: var(--ion-color-light);
}

.desktop-tab-button.active {
  background: linear-gradient(120deg, rgba(var(--ion-color-primary-rgb), 0.95) 0%, rgba(var(--ion-color-primary-rgb), 0.78) 100%);
  color: var(--ion-color-primary-contrast);
  border-color: rgba(var(--ion-color-primary-rgb), 0.4);
  box-shadow: 0 8px 20px rgba(var(--ion-color-primary-rgb), 0.22);
  /* SVG иконок залиты var(--ion-color-light); делаем тёмными под светлый фон */
  --ion-color-light: var(--ion-color-primary-contrast);
}

.desktop-content {
  border-radius: 18px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: linear-gradient(160deg, rgba(var(--ion-color-medium-rgb), 0.5) 0%, rgba(var(--ion-color-dark-rgb), 0.55) 100%);
}

.desktop-content-header {
  padding: 16px 20px;
  background: rgba(var(--ion-color-medium-rgb), 0.55);
  border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
}

.desktop-content-header h2 {
  margin: 0;
  color: var(--ion-color-light);
  font-size: 20px;
  font-weight: 700;
}

.desktop-content-inner {
  margin-top: -60px;
  transition: margin-top 0.3s ease;
}

.desktop-content-inner.openSubheader {
  margin-top: -60px;
}

ion-page {
  position: relative;
}

.early-version-stub {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  /* IonTabBar с margin 10px обычно занимает ~56px сверху; фиксируем метку чуть выше */
  bottom: -94px;
  z-index: 50;
  pointer-events: auto;
  font-size: 8px;
  font-weight: 600;
  text-align: center;
  width: 93vw;
  color: var(--ion-color-secondary);
  background-color: var(--ion-color-medium);
}

.early-version-stub__text {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.35);
  color: inherit;
  white-space: nowrap;      /* Prevents text from wrapping to a new line */
  overflow: hidden;         /* Hides the text that extends beyond the container */
}

.tab-bar, .tab-bar ion-tab-button {
  background: var(--ion-color-medium);
}

/* Обертка для иконки */
.tab-bar ion-tab-button .tab-icon-wrapper {
  border: 1px solid var(--ion-color-primary);
}

/* Подсветка выбранной вкладки (Ionic проставляет класс tab-selected) */
.tab-bar ion-tab-button.tab-selected .tab-icon-wrapper {
  background: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
  /* SVG иконок залиты var(--ion-color-light); переопределяем, чтобы заливка стала тёмной */
  --ion-color-light: var(--ion-color-dark);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ion-color-primary) 35%, transparent),
  0 8px 16px rgba(0, 0, 0, 0.35);
  transform: translateY(-2px);
}

.tab-bar ion-tab-button .tab-icon-wrapper {
  transition: transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease, border-color 140ms ease;
}

.tab-bar ion-tab-button ion-icon {
  transition: color 140ms ease;
}


.tab-bar {
  background: var(--ion-color-medium);
  position: relative;
  z-index: 20;
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
  background: rgba(var(--ion-color-dark-rgb), 0.55);
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

.abilities.openSubheader,
.attacks.openSubheader,
.bio.openSubheader,
.traits.openSubheader,
.inventory.openSubheader,
.notes.openSubheader,
.magic.openSubheader {
  margin-top: 200px;
}

.abilities,
.attacks,
.bio,
.traits,
.inventory,
.notes,
.magic {
  margin-top: 95px;
  transition: margin-top 0.3s ease;
}

.subheader-block {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background-color: var(--ion-color-dark);
  overflow: visible;
  z-index: 5;
  max-height: 48px;
  transition: max-height 0.48s cubic-bezier(0.33, 1, 0.68, 1);
}

.subheader-block.openSubheader {
  max-height: 260px;
}

@media (min-width: 1024px) {
  .early-version-stub {
    display: none;
  }

  .subheader-block {
    position: static;
    top: auto;
    left: auto;
    width: 100%;
    overflow: visible;
    max-height: 48px;
  }

  .subheader-block.openSubheader {
    max-height: 260px;
  }

  .abilities,
  .attacks,
  .bio,
  .traits,
  .inventory,
  .notes,
  .magic {
    margin-top: 0;
    transition: margin-top 0.3s ease;
  }
}


@supports (font: -apple-system-body) {

    .abilities,
    .attacks,
    .bio,
    .traits,
    .inventory,
    .notes,
    .magic {
      margin-top: 120px;
    }

    .abilities.openSubheader,
    .attacks.openSubheader,
    .bio.openSubheader,
    .traits.openSubheader,
    .inventory.openSubheader,
    .notes.openSubheader,
    .magic.openSubheader {
      margin-top: 200px;
    }

}
</style>

