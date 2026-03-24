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
import {bookOutline, documentTextOutline, peopleOutline} from "ionicons/icons";
import MasterHeader from "@/views/master/MasterHeader.vue";
import MasterCharacterListView from "@/views/master/tabs/MasterCharacterListView.vue";
import MasterGuidebookView from "@/views/master/tabs/MasterGuidebookView.vue";
import MasterFilesView from "@/views/master/tabs/MasterFilesView.vue";
import {useRoute} from "vue-router";
import {useRoomStore} from "@/stores/RoomStore";
import {computed, onMounted, onUnmounted, ref, watch} from "vue";

const asyncDone = ref<boolean>(false);
const route = useRoute();
const roomStore = useRoomStore();
const tabsRef = ref<InstanceType<typeof IonTabs> | null>(null);
const selectedTab = ref<"characters" | "guidebook" | "files">("characters");
const isDesktop = ref<boolean>(window.innerWidth >= 1024);

const DESKTOP_BREAKPOINT_PX = 1024;

const POLL_INTERVAL_MS = 5000;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let isMasterViewActive = false;

const tabs = [
  {key: "characters", icon: peopleOutline, label: "Персонажи"},
  {key: "guidebook", icon: bookOutline, label: "Справочник"},
  {key: "files", icon: documentTextOutline, label: "Файлы"}
] as const;

const selectedTabTitle = computed(() => {
  return tabs.find((tab) => tab.key === selectedTab.value)?.label ?? "";
});

const startPolling = () => {
  stopPolling();
  const roomId = route.params.roomId as string;
  roomStore.getCharacters(roomId);
  pollTimer = setInterval(() => {
    roomStore.getCharacters(roomId);
  }, POLL_INTERVAL_MS);
};

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

const onTabsChange = (event: CustomEvent<{ tab: string }>) => {
  const tab = event?.detail?.tab;
  if (tab === "characters" || tab === "guidebook" || tab === "files") {
    selectedTab.value = tab;
  }
  if (tab === "characters") {
    startPolling();
  } else {
    stopPolling();
  }
};

const onResize = () => {
  isDesktop.value = window.innerWidth >= DESKTOP_BREAKPOINT_PX;
};

const selectDesktopTab = (tab: "characters" | "guidebook" | "files") => {
  selectedTab.value = tab;
};

watch(selectedTab, (tab) => {
  if (!isMasterViewActive || !isDesktop.value) return;
  if (tab === "characters") {
    startPolling();
  } else {
    stopPolling();
  }
});

watch(isDesktop, (desktop) => {
  if (!isMasterViewActive) return;
  if (!desktop && selectedTab.value !== "characters") {
    stopPolling();
    return;
  }
  if (selectedTab.value === "characters") {
    startPolling();
  } else {
    stopPolling();
  }
});

onMounted(() => {
  window.addEventListener("resize", onResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});

onIonViewDidEnter(async () => {
  isMasterViewActive = true;
  onResize();
  roomStore.getRoomInfo(route.params.roomId as string);
  asyncDone.value = true;
  await roomStore.getCharacters(route.params.roomId as string);
  if (isDesktop.value) {
    if (selectedTab.value === "characters") startPolling();
    return;
  }
  const el = tabsRef.value?.$el as HTMLElement & { getSelected?: () => Promise<string> };
  try {
    const selectedTab = el?.getSelected ? await el.getSelected() : "characters";
    if (selectedTab === "characters") startPolling();
  } catch {
    startPolling();
  }
});

onIonViewDidLeave(() => {
  isMasterViewActive = false;
  stopPolling();
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
            <MasterCharacterListView v-if="asyncDone && selectedTab === 'characters'"/>
            <MasterGuidebookView v-if="asyncDone && selectedTab === 'guidebook'"/>
            <MasterFilesView v-if="asyncDone && selectedTab === 'files'"/>
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
            <MasterCharacterListView v-if="asyncDone"/>
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
  background: var(--ion-color-medium);
  border: 1px solid var(--ion-color-primary);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.desktop-tab-button {
  width: 100%;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--ion-color-light);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.desktop-tab-button ion-icon {
  font-size: 22px;
}

.desktop-tab-button:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.12);
}

.desktop-tab-button.active {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.desktop-content {
  border-radius: 16px;
  border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.desktop-content-header {
  padding: 16px 20px;
  background: rgba(var(--ion-color-medium-rgb), 0.65);
  border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
}

.desktop-content-header h2 {
  margin: 0;
  color: var(--ion-color-light);
  font-size: 20px;
  font-weight: 600;
}

.desktop-content-inner {
  margin-top: -80px;
}

.tab-bar,
.tab-bar ion-tab-button {
  background: var(--ion-color-medium);
}

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
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.tab-bar ion-tab-button ion-icon {
  width: 28px;
  height: 28px;
  color: white;
}

.characters,
.guidebook,
.files {
  margin-top: 32px;
  padding-top: 0;
}

@media (min-width: 1024px) {
  .characters,
  .guidebook,
  .files {
    margin-top: 0;
  }
}
</style>
