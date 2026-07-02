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
  createGesture,
  onIonViewDidEnter,
  onIonViewDidLeave,
  toastController
} from "@ionic/vue";
import type { Gesture } from '@ionic/core';
import PlayerViewHeader from "@/views/character/PlayerViewHeader.vue";
import AbilitiesView from "@/views/character/tabs/abilities/AbilitiesView.vue";
import PersonalityView from "@/views/character/tabs/bio/BioView.vue";
import PlayerViewSubheader from "@/views/character/PlayerViewSubheader.vue";
import {computed, onMounted, onUnmounted, ref, nextTick, watch} from "vue";
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
import { pawOutline, appsOutline } from 'ionicons/icons'
import InventoryView from "@/views/character/tabs/inventory/InventoryView.vue";
import TabBarCustomizeSheet from "@/components/TabBarCustomizeSheet.vue";
import { useTabBarConfig, type TabKey } from "@/composables/useTabBarConfig";
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
import CompanionsView from "@/views/character/tabs/companions/CompanionsView.vue";
import {useCharacterWebSocket} from "@/composables/useCharacterWebSocket";
import {useCombatWebSocket} from "@/composables/useCombatWebSocket";
import {QUEUE_FLUSHED_EVENT} from "@/composables/useOfflineSync";
import {useMagicStore} from "@/stores/MagicStore";
import {useNoteStore} from "@/stores/NoteStore";
import {useWalletStore} from "@/stores/WalletStore";
import {getActiveCombatSession, nextCombatTurn} from "@/api/combatApi";
import {isResting} from "@/composables/useCharacterRest";
import type {CombatStateDto} from "@/api/combatApi.types";
import InitiativeModal from "@/views/character/tabs/common/InitiativeModal.vue";

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
const subheaderHasStates = ref(false);
const characterSkillsStore = useCharacterSkillsStore();

const earlyVersionClickCount = ref(0);
type PlayerTabKey = "character" | "combat" | "inventory" | "notes" | "companions";
type CharSubTab = "abilities" | "bio" | "traits";
type CombatSubTab = "attacks" | "magic";
const selectedTab = ref<PlayerTabKey>("character");
const characterSubTab = ref<CharSubTab>("abilities");
const combatSubTab = ref<CombatSubTab>("attacks");
const isDesktop = ref<boolean>(window.innerWidth >= 1024);
const DESKTOP_BREAKPOINT_PX = 1024;

const EARLY_VERSION_DEFAULT_TEXT =
  "Вы используете альфа-версию приложения — спасибо, что вы с нами на этом этапе!";
const EARLY_VERSION_NON_RU_TEXT =
  "Отключите VPN, приложение может работать не стабильно";

const ipCountryCode = ref<string | null>(null);
const isNonRussianIp = computed(() => ipCountryCode.value != null && ipCountryCode.value !== "RU");
const earlyVersionText = computed(() => (isNonRussianIp.value ? EARLY_VERSION_NON_RU_TEXT : EARLY_VERSION_DEFAULT_TEXT));

const TAB_META: Record<PlayerTabKey, { label: string; icon: string }> = {
  character:  { label: 'Персонаж',     icon: abilitiesTabIcon },
  combat:     { label: 'Бой',          icon: attacksTabIcon },
  inventory:  { label: 'Инвентарь',   icon: inventoryTabIcon },
  notes:      { label: 'Заметки',     icon: notesTabIcon },
  companions: { label: 'Спутники',    icon: pawOutline },
}

const CHAR_SUB_META: Record<CharSubTab, { label: string; icon: string }> = {
  abilities: { label: 'Характеристики', icon: abilitiesTabIcon },
  bio:       { label: 'Биография',      icon: bioTabIcon },
  traits:    { label: 'Черты',          icon: traitsTabIcon },
}
const CHAR_SUB_TABS: CharSubTab[] = ['abilities', 'bio', 'traits']

const COMBAT_SUB_META: Record<CombatSubTab, { label: string; icon: string }> = {
  attacks: { label: 'Атаки и навыки', icon: attacksTabIcon },
  magic:   { label: 'Магия',          icon: magicTabIcon },
}
const COMBAT_SUB_TABS: CombatSubTab[] = ['attacks', 'magic']

const tabs = [
  {key: "character",  icon: abilitiesTabIcon, label: "Персонаж"},
  {key: "combat",     icon: attacksTabIcon,   label: "Бой"},
  {key: "inventory",  icon: inventoryTabIcon, label: "Инвентарь"},
  {key: "notes",      icon: notesTabIcon,     label: "Заметки"},
  {key: "companions", icon: pawOutline,       label: "Спутники"},
] as const;

const characterId = route.params.characterId as string
const tabBarConfig = useTabBarConfig(characterId)
const showCustomizeSheet = ref(false)
const ionTabsRef = ref<InstanceType<typeof IonTabs> | null>(null)
const charSwipeRef = ref<HTMLElement | null>(null)
const combatSwipeRef = ref<HTMLElement | null>(null)
const desktopSwipeRef = ref<HTMLElement | null>(null)
let charGesture: Gesture | null = null
let combatGesture: Gesture | null = null
let desktopGesture: Gesture | null = null

const charTransition = ref('slide-left')
const combatTransition = ref('slide-left')

function setCharSubTab(sub: CharSubTab, direction?: 'left' | 'right') {
  const from = CHAR_SUB_TABS.indexOf(characterSubTab.value)
  const to = CHAR_SUB_TABS.indexOf(sub)
  charTransition.value = direction ?? (to > from ? 'slide-left' : 'slide-right')
  characterSubTab.value = sub
}

function setCombatSubTab(sub: CombatSubTab, direction?: 'left' | 'right') {
  const from = COMBAT_SUB_TABS.indexOf(combatSubTab.value)
  const to = COMBAT_SUB_TABS.indexOf(sub)
  combatTransition.value = direction ?? (to > from ? 'slide-left' : 'slide-right')
  combatSubTab.value = sub
}

function attachGestures() {
  if (charSwipeRef.value && !isDesktop.value) {
    charGesture?.destroy()
    charGesture = createGesture({
      el: charSwipeRef.value,
      gestureName: 'char-subtab-swipe',
      direction: 'x',
      threshold: 10,
      onEnd(detail) {
        if (Math.abs(detail.deltaX) < 48 || Math.abs(detail.deltaX) < Math.abs(detail.deltaY) * 1.5) return
        const idx = CHAR_SUB_TABS.indexOf(characterSubTab.value)
        const dir = detail.deltaX < 0 ? 'left' : 'right'
        if (detail.deltaX < 0 && idx < CHAR_SUB_TABS.length - 1) setCharSubTab(CHAR_SUB_TABS[idx + 1], dir)
        else if (detail.deltaX > 0 && idx > 0) setCharSubTab(CHAR_SUB_TABS[idx - 1], dir)
      }
    })
    charGesture.enable()
  }
  if (combatSwipeRef.value && !isDesktop.value) {
    combatGesture?.destroy()
    combatGesture = createGesture({
      el: combatSwipeRef.value,
      gestureName: 'combat-subtab-swipe',
      direction: 'x',
      threshold: 10,
      onEnd(detail) {
        if (Math.abs(detail.deltaX) < 48 || Math.abs(detail.deltaX) < Math.abs(detail.deltaY) * 1.5) return
        const idx = COMBAT_SUB_TABS.indexOf(combatSubTab.value)
        const dir = detail.deltaX < 0 ? 'left' : 'right'
        if (detail.deltaX < 0 && idx < COMBAT_SUB_TABS.length - 1) setCombatSubTab(COMBAT_SUB_TABS[idx + 1], dir)
        else if (detail.deltaX > 0 && idx > 0) setCombatSubTab(COMBAT_SUB_TABS[idx - 1], dir)
      }
    })
    combatGesture.enable()
  }
  if (desktopSwipeRef.value && isDesktop.value) {
    desktopGesture?.destroy()
    desktopGesture = createGesture({
      el: desktopSwipeRef.value,
      gestureName: 'desktop-subtab-swipe',
      direction: 'x',
      threshold: 10,
      onEnd(detail) {
        if (Math.abs(detail.deltaX) < 48) return
        const dir = detail.deltaX < 0 ? 'left' : 'right'
        if (selectedTab.value === 'character') {
          const idx = CHAR_SUB_TABS.indexOf(characterSubTab.value)
          if (detail.deltaX < 0 && idx < CHAR_SUB_TABS.length - 1) setCharSubTab(CHAR_SUB_TABS[idx + 1], dir)
          else if (detail.deltaX > 0 && idx > 0) setCharSubTab(CHAR_SUB_TABS[idx - 1], dir)
        } else if (selectedTab.value === 'combat') {
          const idx = COMBAT_SUB_TABS.indexOf(combatSubTab.value)
          if (detail.deltaX < 0 && idx < COMBAT_SUB_TABS.length - 1) setCombatSubTab(COMBAT_SUB_TABS[idx + 1], dir)
          else if (detail.deltaX > 0 && idx > 0) setCombatSubTab(COMBAT_SUB_TABS[idx - 1], dir)
        }
      }
    })
    desktopGesture.enable()
  }
}

async function navigateToTab(tab: TabKey) {
  showCustomizeSheet.value = false
  selectedTab.value = tab
  await nextTick()
  const tabsEl = (ionTabsRef.value as any)?.$el as HTMLIonTabsElement | undefined
  await tabsEl?.select(tab)
}

const selectedTabTitle = computed(() => TAB_META[selectedTab.value]?.label ?? '');

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
let combatWsClient: ReturnType<typeof useCombatWebSocket> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let queueFlushedTimer: ReturnType<typeof setTimeout> | null = null;

const showInitiativeModal = ref(false);
const combatSession = ref<CombatStateDto | null>(null);
const myParticipantId = ref<string | null>(null);
const myParticipantName = ref<string>('');
const endingTurn = ref(false);

const isMyTurn = computed(() => {
  if (!combatSession.value || combatSession.value.state !== 'ACTIVE') return false;
  return combatSession.value.participants.some(
    p => p.participantType === 'CHARACTER' && p.referenceId === characterId && p.isCurrentTurn
  );
});

async function checkCombat(roomId: string, characterId: string) {
  try {
    const session = await getActiveCombatSession(roomId);
    combatSession.value = session;

    if (!session || session.state !== 'ACTIVE') {
      showInitiativeModal.value = false;
      return;
    }

    // Combat started and all ready — close the modal
    if (session.allReady) {
      showInitiativeModal.value = false;
      return;
    }

    // Find my participant that still needs to submit initiative
    const participant = session.participants.find(
      p => p.participantType === 'CHARACTER' && p.referenceId === characterId && !p.isReady
    );
    if (participant) {
      myParticipantId.value = participant.id;
      myParticipantName.value = participant.displayName;
      showInitiativeModal.value = true;
    }
  } catch {}
}

onIonViewDidEnter(async () => {
  const roomId = route.params.roomId as string;

  await characterStore.updateCharacterInStoreById(roomId, characterId);
  await inventoryStore.updateInventoryInStoreById(roomId, characterId);
  await characterSkillsStore.updateCharacterSkills(roomId, characterId);

  const refreshAll = (event?: { type?: string }) => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      const type = event?.type;
      switch (type) {
        case 'health_updated':
          characterStore.updateCharacterInStoreById(roomId, characterId);
          // Пропускаем обновление зарядов пока идёт отдых — useCharacterRest сам применит applyRestLocally после GET-ов
          if (!isResting.value) {
            inventoryStore.updateInventoryInStoreById(roomId, characterId);
            characterSkillsStore.updateCharacterSkills(roomId, characterId);
          }
          break;
        case 'inventory_updated':
          inventoryStore.updateInventoryInStoreById(roomId, characterId);
          walletStore.updateWallet(roomId, characterId);
          break;
        case 'spellbook_updated':
          magicStore.updateSpellBookInStore(roomId, characterId);
          break;
        case 'notes_updated':
          noteStore.triggerRefresh();
          break;
        default:
          // character_updated или неизвестный тип — обновляем всё
          characterStore.updateCharacterInStoreById(roomId, characterId);
          inventoryStore.updateInventoryInStoreById(roomId, characterId);
          walletStore.updateWallet(roomId, characterId);
          magicStore.updateSpellBookInStore(roomId, characterId);
          noteStore.triggerRefresh();
          characterSkillsStore.updateCharacterSkills(roomId, characterId);
      }
    }, 300);
  };

  wsClient = useCharacterWebSocket(roomId, characterId, refreshAll, () => refreshAll());

  combatWsClient = useCombatWebSocket(roomId, async () => {
    await checkCombat(roomId, characterId);
  });

  await checkCombat(roomId, characterId);
  asyncDone.value = true;
});

onIonViewDidLeave(() => {
  wsClient?.deactivate();
  wsClient = null;
  combatWsClient?.deactivate();
  combatWsClient = null;
});

const onResize = () => {
  isDesktop.value = window.innerWidth >= DESKTOP_BREAKPOINT_PX;
};

const selectDesktopTab = (tab: PlayerTabKey) => {
  selectedTab.value = tab;
};

const onTabsChange = (event: CustomEvent<{ tab: string }>) => {
  const tab = event?.detail?.tab as TabKey
  if ((tabBarConfig.ALL_TABS as readonly string[]).includes(tab)) {
    selectedTab.value = tab
  }
};

onMounted(async () => {
  window.addEventListener("resize", onResize);
  void detectIpCountryCode();
  window.addEventListener(QUEUE_FLUSHED_EVENT, onQueueFlushed);
  await nextTick();
  attachGestures();
});

watch(asyncDone, async (done) => {
  if (done) { await nextTick(); attachGestures(); }
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
  window.removeEventListener(QUEUE_FLUSHED_EVENT, onQueueFlushed);
  charGesture?.destroy()
  combatGesture?.destroy()
  desktopGesture?.destroy()
  if (refreshTimer) clearTimeout(refreshTimer);
  if (queueFlushedTimer) clearTimeout(queueFlushedTimer);
});

function onQueueFlushed() {
  // Debounce: очередь может флашить несколько запросов подряд
  if (queueFlushedTimer) clearTimeout(queueFlushedTimer);
  queueFlushedTimer = setTimeout(() => {
    queueFlushedTimer = null;
    const roomId = route.params.roomId as string;
    characterStore.updateCharacterInStoreById(roomId, characterId);
    inventoryStore.updateInventoryInStoreById(roomId, characterId);
    walletStore.updateWallet(roomId, characterId);
    magicStore.updateSpellBookInStore(roomId, characterId);
    characterSkillsStore.updateCharacterSkills(roomId, characterId);
    noteStore.triggerRefresh();
  }, 300);
}

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

async function endTurn() {
  if (!combatSession.value || endingTurn.value) return;
  const roomId = route.params.roomId as string;
  endingTurn.value = true;
  try {
    await nextCombatTurn(roomId, combatSession.value.sessionId);
  } finally {
    endingTurn.value = false;
  }
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
      <div class="subheader-block"
           :class="{
             openSubheader: subheaderStore.subheaderOpened,
             'has-subtabs': !isDesktop && (selectedTab === 'character' || selectedTab === 'combat'),
             'has-states': subheaderHasStates,
           }">
        <PlayerViewSubheader v-if="asyncDone" @speed-selected="openEditSpeedModal"
                             @armory-class-selected="openEditArmoryClassModal"
                             @initiative-selected="openEditInitiativeModal"
                             @health-selected="openHealthModal"
                             @close-subheader="closeSubheader"
                             @open-subheader="openSubheader"
                             @open-rest-modal="openRestModal"
                             @has-states="(v: boolean) => subheaderHasStates = v"
        />
        <div v-if="!isDesktop && selectedTab === 'character'" class="char-subtab-bar">
          <button
            v-for="sub in CHAR_SUB_TABS"
            :key="sub"
            class="char-subtab-btn"
            :class="{ active: characterSubTab === sub }"
            @click="setCharSubTab(sub)"
          >
            <ion-icon :icon="CHAR_SUB_META[sub].icon"/>
            <span>{{ CHAR_SUB_META[sub].label }}</span>
          </button>
        </div>
        <div v-if="!isDesktop && selectedTab === 'combat'" class="char-subtab-bar">
          <button
            v-for="sub in COMBAT_SUB_TABS"
            :key="sub"
            class="char-subtab-btn"
            :class="{ active: combatSubTab === sub }"
            @click="setCombatSubTab(sub)"
          >
            <ion-icon :icon="COMBAT_SUB_META[sub].icon"/>
            <span>{{ COMBAT_SUB_META[sub].label }}</span>
          </button>
        </div>
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
        <ion-content :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div ref="desktopSwipeRef" class="tab-content desktop-content-inner" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <!-- subtab bar sticky для character -->
            <div v-if="selectedTab === 'character'" class="desktop-subtab-sticky">
              <button
                v-for="sub in CHAR_SUB_TABS"
                :key="sub"
                class="char-subtab-btn"
                :class="{ active: characterSubTab === sub }"
                @click="setCharSubTab(sub)"
              >
                <ion-icon :icon="CHAR_SUB_META[sub].icon"/>
                <span>{{ CHAR_SUB_META[sub].label }}</span>
              </button>
            </div>
            <!-- subtab bar sticky для combat -->
            <div v-else-if="selectedTab === 'combat'" class="desktop-subtab-sticky">
              <button
                v-for="sub in COMBAT_SUB_TABS"
                :key="sub"
                class="char-subtab-btn"
                :class="{ active: combatSubTab === sub }"
                @click="setCombatSubTab(sub)"
              >
                <ion-icon :icon="COMBAT_SUB_META[sub].icon"/>
                <span>{{ COMBAT_SUB_META[sub].label }}</span>
              </button>
            </div>
            <!-- заголовок для остальных вкладок -->
            <h2 v-else class="desktop-tab-title">{{ selectedTabTitle }}</h2>

            <!-- контент с анимацией для подвкладок -->
            <Transition
              :name="selectedTab === 'character' ? charTransition : selectedTab === 'combat' ? combatTransition : 'slide-left'"
              mode="out-in"
            >
              <div :key="selectedTab === 'character' ? characterSubTab : selectedTab === 'combat' ? combatSubTab : selectedTab" class="subtab-page">
                <AbilitiesView v-if="asyncDone && selectedTab === 'character' && characterSubTab === 'abilities'" @ability-selected="openEditAbilityModal" @skill-selected="openEditSkillModal"/>
                <AttacksAndSkillsView v-if="asyncDone && selectedTab === 'combat' && combatSubTab === 'attacks'" @ability-selected="openEditAbilityModal"/>
                <Suspense><PersonalityView v-if="asyncDone && selectedTab === 'character' && characterSubTab === 'bio'"/></Suspense>
                <Suspense><TraitsView v-if="asyncDone && selectedTab === 'character' && characterSubTab === 'traits'"/></Suspense>
                <Suspense><MagicView v-if="asyncDone && selectedTab === 'combat' && combatSubTab === 'magic'"/></Suspense>
                <Suspense><InventoryView v-if="asyncDone && selectedTab === 'inventory'"/></Suspense>
                <Suspense><NotesView v-if="asyncDone && selectedTab === 'notes'"/></Suspense>
                <Suspense><CompanionsView v-if="asyncDone && selectedTab === 'companions'"/></Suspense>
              </div>
            </Transition>
          </div>
        </ion-content>
      </section>
    </div>
    <IonTabs ref="ionTabsRef" v-else @ionTabsDidChange="onTabsChange">
      <ion-tab tab="character">
        <ion-content class="ion-padding"
                     :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div ref="charSwipeRef" class="tab-content character subtab-host" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <Transition :name="charTransition" mode="out-in">
              <div :key="characterSubTab" class="subtab-page">
                <AbilitiesView v-if="asyncDone && characterSubTab === 'abilities'"
                               @ability-selected="openEditAbilityModal"
                               @skill-selected="openEditSkillModal"/>
                <Suspense><PersonalityView v-if="asyncDone && characterSubTab === 'bio'"/></Suspense>
                <Suspense><TraitsView v-if="asyncDone && characterSubTab === 'traits'"/></Suspense>
              </div>
            </Transition>
          </div>
        </ion-content>
      </ion-tab>
      <ion-tab tab="combat">
        <ion-content class="ion-padding"
                     :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div ref="combatSwipeRef" class="tab-content combat subtab-host" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <Transition :name="combatTransition" mode="out-in">
              <div :key="combatSubTab" class="subtab-page">
                <AttacksAndSkillsView v-if="asyncDone && combatSubTab === 'attacks'" @ability-selected="openEditAbilityModal"/>
                <Suspense><MagicView v-if="asyncDone && combatSubTab === 'magic'"/></Suspense>
              </div>
            </Transition>
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
      <ion-tab tab="companions">
        <ion-content class="ion-padding"
                     :fullscreen="true"
                     color="dark"
                     direction="y"
                     :scroll-x="false">
          <div class="tab-content companions" :class="{ openSubheader: subheaderStore.subheaderOpened }">
            <Suspense>
              <CompanionsView v-if="asyncDone"/>
            </Suspense>
          </div>
        </ion-content>
      </ion-tab>
    </IonTabs>

    <!-- Кастомный таб-бар вне IonTabs — не сбрасывается при ре-рендере -->
    <div v-if="!isDesktop" class="tab-bar" role="tablist">
      <button
        v-for="tabKey in tabBarConfig.ALL_TABS"
        :key="tabKey"
        class="tab-bar__btn"
        :class="{
          'tab-bar__btn--hidden': !tabBarConfig.visibleTabs.value.includes(tabKey),
          'tab-selected': selectedTab === tabKey,
        }"
        :aria-label="TAB_META[tabKey].label"
        :aria-selected="selectedTab === tabKey"
        role="tab"
        @click="navigateToTab(tabKey)"
      >
        <div class="tab-icon-wrapper">
          <ion-icon
            :icon="TAB_META[tabKey].icon"
            :style="tabKey === 'companions' ? '--ionicon-stroke-width: 12px;' : ''"
            :class="tabKey === 'companions' ? 'companions-icon' : ''"
          />
        </div>
      </button>
      <button class="tab-gear-btn" aria-label="Все разделы" @click="showCustomizeSheet = true">
        <ion-icon :icon="appsOutline"/>
      </button>
    </div>

    <!-- Заглушка для ранней версии функционала -->
    <div
      v-if="!isDesktop"
      class="early-version-stub"
      role="button"
      tabindex="0"
      :aria-label="earlyVersionText"
      @click="onEarlyVersionStubClick"
      @keydown.enter.prevent="onEarlyVersionStubClick"
    >
      <span class="early-version-stub__text">{{ earlyVersionText }}</span>
    </div>


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

    <InitiativeModal
      v-if="showInitiativeModal && combatSession && myParticipantId"
      :is-open="showInitiativeModal"
      :room-id="String(route.params.roomId)"
      :session-id="combatSession.sessionId"
      :participant-id="myParticipantId"
      :participant-name="myParticipantName"
      @close="showInitiativeModal = false"
    />

    <!-- Tab bar customization sheet -->
    <TabBarCustomizeSheet
      :is-open="showCustomizeSheet"
      :order="tabBarConfig.order.value"
      :hidden="tabBarConfig.hidden.value"
      :all-tabs="tabBarConfig.ALL_TABS"
      :tab-meta="TAB_META"
      :current-tab="selectedTab"
      @close="showCustomizeSheet = false"
      @toggle-hidden="tabBarConfig.toggleHidden"
      @navigate="navigateToTab"
    />

    <!-- Combat vignette -->
    <div v-if="combatSession?.state === 'ACTIVE'" class="combat-vignette" aria-hidden="true"/>

    <!-- End Turn FAB -->
    <Transition name="end-turn-fab">
      <button v-if="isMyTurn" class="end-turn-fab" :disabled="endingTurn" @click="endTurn">
        <span class="end-turn-fab__icon">⚔</span>
        <span class="end-turn-fab__label">{{ endingTurn ? '...' : 'Завершить ход' }}</span>
      </button>
    </Transition>
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

.desktop-subtab-sticky {
  display: flex;
  gap: 8px;
  margin-bottom: 5px;
  position: sticky;
  top: 0;
  background: var(--ion-color-dark);
  z-index: 10;
}

.desktop-subtab-sticky .char-subtab-btn {
  flex: 0 0 auto;
}

.desktop-tab-title {
  margin: 0 0 16px;
  color: var(--ion-color-light);
  font-size: 20px;
  font-weight: 700;
}


/* ── Character sub-tab bar ───────────────────────────────────────── */

.char-subtab-bar {
  display: flex;
  gap: 6px;
  padding: 5px 16px;
  background: rgba(var(--ion-color-dark-rgb), 0.92);
  border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.07);
}


.char-subtab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}

.char-subtab-btn ion-icon {
  font-size: 15px;
  flex-shrink: 0;
}

.char-subtab-btn.active {
  background: rgba(var(--ion-color-primary-rgb), 0.18);
  border-color: rgba(var(--ion-color-primary-rgb), 0.35);
  color: var(--ion-color-primary);
}

.char-subtab-btn:not(.active):hover {
  background: rgba(var(--ion-color-light-rgb), 0.06);
  color: rgba(var(--ion-color-light-rgb), 0.75);
}

ion-tab[tab="character"] {
  display: flex;
  flex-direction: column;
}



.desktop-content-inner {
  padding: 16px;
}

ion-page {
  position: relative;
}

/* ── Subtab slide transitions ─────────────────────────────────────── */

.subtab-host {
  overflow: hidden;
}

.subtab-page {
  width: 100%;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.26s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.26s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
}

.slide-left-enter-from  { transform: translateX(40px);  opacity: 0; }
.slide-left-leave-to    { transform: translateX(-40px); opacity: 0; }
.slide-right-enter-from { transform: translateX(-40px); opacity: 0; }
.slide-right-leave-to   { transform: translateX(40px);  opacity: 0; }

.early-version-stub {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: -7px;
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

/* ── Кастомный таб-бар ── */
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;
  background: var(--ion-color-medium);
  border-radius: 20px;
  margin: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  bottom: calc(env(safe-area-inset-bottom, 0px));
}

.tab-bar__btn {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.tab-bar__btn--hidden {
  display: none;
}

/* Обертка для иконки */
.tab-bar__btn .tab-icon-wrapper {
  width: 40px;
  height: 40px;
  border: 1px solid var(--ion-color-primary);
  border-radius: 50%;
  background: rgba(var(--ion-color-dark-rgb), 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease, border-color 140ms ease;
}

/* Активная вкладка */
.tab-bar__btn.tab-selected .tab-icon-wrapper {
  background: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
  --ion-color-light: var(--ion-color-dark);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ion-color-primary) 35%, transparent),
              0 8px 16px rgba(0, 0, 0, 0.35);
  transform: translateY(-2px);
}

/* Иконки */
.tab-bar__btn ion-icon {
  width: 28px;
  height: 28px;
  color: white;
  transition: color 140ms ease;
}

/* pawOutline тоньше */
.tab-bar__btn .companions-icon {
  width: 22px;
  height: 22px;
}

/* Gear button for tab bar customization */
.tab-gear-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.25);
  background: transparent;
  color: rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  margin-right: 4px;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.tab-gear-btn:active {
  color: rgba(255, 255, 255, 0.7);
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.06);
}

.inventory.openSubheader,
.notes.openSubheader,
.companions.openSubheader {
  margin-top: 220px;
}

.character.openSubheader,
.combat.openSubheader {
  margin-top: calc(220px + 46px);
}

.inventory,
.notes,
.companions {
  margin-top: 120px;
  padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  transition: margin-top 0.3s ease;
}

.character,
.combat {
  margin-top: calc(95px + 50px);
  padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  transition: margin-top 0.3s ease;
}

.subheader-block {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background-color: var(--ion-color-dark);
  overflow: hidden;
  z-index: 5;
  max-height: 48px;
  transition: max-height 0.48s cubic-bezier(0.33, 1, 0.68, 1);
}

.subheader-block.openSubheader {
  max-height: 260px;
}

.subheader-block.openSubheader.has-states {
  max-height: 300px;
}

.subheader-block.has-subtabs {
  max-height: calc(48px + 46px);
}

.subheader-block.has-states {
  max-height: 60px; /* 5px top + 32px card + 14px states-bar = 51px, +6px gap */
}

.subheader-block.has-states.has-subtabs {
  max-height: calc(57px + 46px);
}

.subheader-block.openSubheader.has-subtabs {
  max-height: calc(260px + 46px);
}

.subheader-block.openSubheader.has-states.has-subtabs {
  max-height: calc(300px + 46px);
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
    max-height: none;
  }

  .inventory,
  .notes,
  .companions {
    margin-top: 0;
    transition: margin-top 0.3s ease;
  }
}


@supports (font: -apple-system-body) {

    .inventory,
    .notes,
    .companions {
      margin-top: 120px;
    }

    .character,
    .combat {
      margin-top: calc(120px + 46px);
    }

    .inventory.openSubheader,
    .notes.openSubheader,
    .companions.openSubheader {
      margin-top: 200px;
    }

    .character.openSubheader,
    .combat.openSubheader {
      margin-top: calc(200px + 46px);
    }

}

/* End Turn FAB */
.end-turn-fab {
  position: fixed;
  bottom: calc(82px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 26px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #c0392b 0%, #922b21 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(192, 57, 43, 0.55), 0 0 0 2px rgba(255,255,255,0.08);
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  white-space: nowrap;
}
.end-turn-fab:active:not(:disabled) {
  transform: translateX(-50%) scale(0.96);
  box-shadow: 0 2px 10px rgba(192, 57, 43, 0.45);
}
.end-turn-fab:disabled {
  opacity: 0.6;
  cursor: default;
}
.end-turn-fab__icon {
  font-size: 16px;
}

.end-turn-fab-enter-active,
.end-turn-fab-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.end-turn-fab-enter-from,
.end-turn-fab-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}

/* Combat vignette */
.combat-vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  border-radius: inherit;
  background: radial-gradient(
    ellipse at center,
    transparent 64%,
    rgba(170, 0, 0, 0.45) 100%
  );
  animation: vignette-pulse 2.4s ease-in-out infinite;
}

@keyframes vignette-pulse {
  0%, 100% { opacity: 0.35; }
  50%       { opacity: 0.875; }
}
</style>

