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
  onIonViewDidLeave
} from "@ionic/vue";
import {bookOutline, documentTextOutline, peopleOutline, shieldOutline} from "ionicons/icons";
import MasterHeader from "@/views/master/MasterHeader.vue";
import MasterCharacterListView from "@/views/master/tabs/MasterCharacterListView.vue";
import MasterGuidebookView from "@/views/master/tabs/MasterGuidebookView.vue";
import MasterFilesView from "@/views/master/tabs/MasterFilesView.vue";
import CombatTrackerPanel from "@/views/master/tabs/CombatTrackerPanel.vue";
import {useRoute} from "vue-router";
import {useRoomStore} from "@/stores/RoomStore";
import {computed, onMounted, onUnmounted, ref, type ComponentPublicInstance} from "vue";
import {useRoomCharactersWebSocket} from "@/composables/useCharacterWebSocket";
import {QUEUE_FLUSHED_EVENT} from "@/composables/useOfflineSync";

const asyncDone = ref<boolean>(false);
const route = useRoute();
const roomStore = useRoomStore();
const tabsRef = ref<InstanceType<typeof IonTabs> | null>(null);
const selectedTab = ref<"characters" | "guidebook" | "files" | "combat">("characters");
const isDesktop = ref<boolean>(window.innerWidth >= 1024);

const DESKTOP_BREAKPOINT_PX = 1024;

let wsClient: ReturnType<typeof useRoomCharactersWebSocket> | null = null;
const charListRef = ref<InstanceType<typeof MasterCharacterListView> | null>(null);

const tabs = [
  {key: "characters", icon: peopleOutline, label: "Персонажи"},
  {key: "combat", icon: shieldOutline, label: "Бой"},
  {key: "guidebook", icon: bookOutline, label: "Справочник"},
  {key: "files", icon: documentTextOutline, label: "Файлы"},
] as const;

const selectedTabTitle = computed(() => {
  return tabs.find((tab) => tab.key === selectedTab.value)?.label ?? "";
});

const onTabsChange = (event: CustomEvent<{ tab: string }>) => {
  const tab = event?.detail?.tab;
  if (tab === "characters" || tab === "guidebook" || tab === "files" || tab === "combat") {
    selectedTab.value = tab;
  }
};

const onResize = () => {
  isDesktop.value = window.innerWidth >= DESKTOP_BREAKPOINT_PX;
};

const selectDesktopTab = (tab: "characters" | "guidebook" | "files" | "combat") => {
  selectedTab.value = tab;
};

onMounted(() => {
  window.addEventListener("resize", onResize);
  window.addEventListener(QUEUE_FLUSHED_EVENT, onQueueFlushed);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
  window.removeEventListener(QUEUE_FLUSHED_EVENT, onQueueFlushed);
});

function onQueueFlushed() {
  const roomId = route.params.roomId as string;
  roomStore.getRoomInfo(roomId);
  roomStore.getCharacters(roomId);
}

onIonViewDidEnter(async () => {
  onResize();
  const roomId = route.params.roomId as string;
  roomStore.getRoomInfo(roomId);
  asyncDone.value = true;
  await roomStore.getCharacters(roomId);
  wsClient = useRoomCharactersWebSocket(
    roomId,
    (event) => {
      roomStore.updateSingleCharacter(roomId, event.characterId);
      if (event.type === 'spellbook_updated' || event.type === 'inventory_updated') {
        charListRef.value?.refreshIfExpanded(event.characterId);
      }
    },
    () => {
      roomStore.getRoomInfo(roomId);
      roomStore.getCharacters(roomId);
    }
  );
});

onIonViewDidLeave(() => {
  wsClient?.deactivate();
  wsClient = null;
});
</script>

<template>
  <ion-page>
    <ion-header v-if="asyncDone" :translucent="false">
      <MasterHeader />
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
          <ion-icon :icon="tab.icon" />
          <span>{{ tab.label }}</span>
        </button>
      </aside>
      <section class="desktop-content">
        <div class="desktop-content-header">
          <h2>{{ selectedTabTitle }}</h2>
        </div>
        <ion-content
          class="ion-padding"
          :fullscreen="true"
          color="dark"
          direction="y"
          :scroll-x="false"
        >
          <div class="tab-content desktop-content-inner">
            <MasterCharacterListView ref="charListRef" v-if="asyncDone && selectedTab === 'characters'"/>
            <MasterGuidebookView v-if="asyncDone && selectedTab === 'guidebook'"/>
            <MasterFilesView v-if="asyncDone && selectedTab === 'files'"/>
            <CombatTrackerPanel v-if="asyncDone && selectedTab === 'combat'" :room-id="String(route.params.roomId)" @close="selectedTab = 'characters'"/>
          </div>
        </ion-content>
      </section>
    </div>
    <IonTabs v-else ref="tabsRef" @ionTabsDidChange="onTabsChange">
      <ion-tab tab="characters">
        <ion-content
          class="ion-padding"
          :fullscreen="true"
          color="dark"
          direction="y"
          :scroll-x="false"
        >
          <div class="tab-content characters">
            <MasterCharacterListView ref="charListRef" v-if="asyncDone"/>
          </div>
        </ion-content>
      </ion-tab>
      <ion-tab tab="combat">
        <ion-content
          class="ion-padding"
          :fullscreen="true"
          color="dark"
          direction="y"
          :scroll-x="false"
        >
          <div class="tab-content combat">
            <CombatTrackerPanel v-if="asyncDone" :room-id="String(route.params.roomId)" @close="() => {}"/>
          </div>
        </ion-content>
      </ion-tab>
      <ion-tab tab="guidebook">
        <ion-content
          class="ion-padding"
          :fullscreen="true"
          color="dark"
          direction="y"
          :scroll-x="false"
        >
          <div class="tab-content guidebook">
            <MasterGuidebookView v-if="asyncDone"/>
          </div>
        </ion-content>
      </ion-tab>
      <ion-tab tab="files">
        <ion-content
          class="ion-padding"
          :fullscreen="true"
          color="dark"
          direction="y"
          :scroll-x="false"
        >
          <div class="tab-content files">
            <MasterFilesView v-if="asyncDone"/>
          </div>
        </ion-content>
      </ion-tab>
      <ion-tab-bar slot="bottom" color="dark" class="tab-bar" :translucent="true">
        <ion-tab-button tab="characters">
          <div class="tab-icon-wrapper">
            <ion-icon :icon="peopleOutline" />
          </div>
        </ion-tab-button>
        <ion-tab-button tab="combat">
          <div class="tab-icon-wrapper">
            <ion-icon :icon="shieldOutline" />
          </div>
        </ion-tab-button>
        <ion-tab-button tab="guidebook">
          <div class="tab-icon-wrapper">
            <ion-icon :icon="bookOutline" />
          </div>
        </ion-tab-button>
        <ion-tab-button tab="files">
          <div class="tab-icon-wrapper">
            <ion-icon :icon="documentTextOutline" />
          </div>
        </ion-tab-button>
      </ion-tab-bar>
    </IonTabs>
  </ion-page>
</template>

<style scoped>
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
}

.tab-bar,
.tab-bar ion-tab-button {
  background: var(--ion-color-medium);
}

.tab-bar ion-tab-button .tab-icon-wrapper {
  border: 1px solid var(--ion-color-primary);
}

/* Подсветка выбранной вкладки (Ionic проставляет класс tab-selected) */
.tab-bar ion-tab-button.tab-selected .tab-icon-wrapper {
  background: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ion-color-primary) 35%, transparent),
    0 8px 16px rgba(0, 0, 0, 0.35);
  transform: translateY(-2px);
}

.tab-bar ion-tab-button.tab-selected ion-icon {
  color: var(--ion-color-dark);
}

.tab-bar ion-tab-button .tab-icon-wrapper {
  transition: transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease, border-color 140ms ease;
}

.tab-bar ion-tab-button ion-icon {
  transition: color 140ms ease;
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

.tab-bar ion-tab-button {
  flex: 1;
  display: grid;
  justify-content: center;
  align-items: center;
  --background: transparent;
}

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

.tab-bar ion-tab-button ion-icon {
  width: 28px;
  height: 28px;
  color: var(--ion-color-light);
}

.characters,
.guidebook,
.files,
.combat {
  margin-top: 50px;
  padding-top: 0;
}

@media (min-width: 1024px) {
  .characters,
  .guidebook,
  .files,
  .combat {
    margin-top: 0;
  }
}

@supports (font: -apple-system-body) {
    .characters,
    .guidebook,
    .files,
    .combat {
      margin-top: 90px;
    }
}
</style>
