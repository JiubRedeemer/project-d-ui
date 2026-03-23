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
import {ref} from "vue";

const asyncDone = ref<boolean>(false);
const route = useRoute();
const roomStore = useRoomStore();
const tabsRef = ref<InstanceType<typeof IonTabs> | null>(null);

const POLL_INTERVAL_MS = 5000;
let pollTimer: ReturnType<typeof setInterval> | null = null;

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
  if (tab === "characters") {
    startPolling();
  } else {
    stopPolling();
  }
};

onIonViewDidEnter(async () => {
  roomStore.getRoomInfo(route.params.roomId as string);
  asyncDone.value = true;
  await roomStore.getCharacters(route.params.roomId as string);
  const el = tabsRef.value?.$el as HTMLElement & { getSelected?: () => Promise<string> };
  try {
    const selectedTab = el?.getSelected ? await el.getSelected() : "characters";
    if (selectedTab === "characters") startPolling();
  } catch {
    startPolling();
  }
});

onIonViewDidLeave(() => {
  stopPolling();
});
</script>

<template>
  <ion-page>
    <ion-header v-if="asyncDone" :translucent="false">
      <MasterHeader />
    </ion-header>
    <IonTabs ref="tabsRef" @ionTabsDidChange="onTabsChange">
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
<!--        <ion-tab-button tab="files">-->
<!--          <div class="tab-icon-wrapper">-->
<!--            <ion-icon :icon="documentTextOutline" />-->
<!--          </div>-->
<!--        </ion-tab-button>-->
      </ion-tab-bar>
    </IonTabs>
  </ion-page>
</template>

<style scoped>
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
</style>
