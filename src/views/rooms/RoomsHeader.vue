<script setup lang="ts">
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  useIonRouter
} from "@ionic/vue";
import {notificationsOutline, searchOutline} from "ionicons/icons";
import {computed, onBeforeMount, ref} from "vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import LogOutButton from "@/views/common/LogOutButton.vue";

const notifications = ref<{ count: number; }>({count: 0});
const ionRouter = useIonRouter();

const props = defineProps({
  headerName: String,
  forceBackButton: {
    type: Boolean,
    default: false
  },
  searchable: {
    type: Boolean,
    default: false
  },
  searchQuery: {
    type: String,
    default: ""
  }
});
const emit = defineEmits<{
  (e: "update:searchQuery", value: string): void;
}>();
const searchOpen = ref(false);
const hasSearchQuery = computed(() => props.searchQuery.trim().length > 0);

const setupNotificationCount = async () => {
  const http = axios.create({
    baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
    headers: {
      "Content-type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("accessToken")
    },
  });

  const res = await http.get(GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.roomInviteCount);

  if (res.status == 200) {
    notifications.value.count = res.data.count
  }
}

onBeforeMount(() => {
  setupNotificationCount()
})

function toggleSearch() {
  if (!props.searchable) return;
  if (searchOpen.value && hasSearchQuery.value) {
    emit("update:searchQuery", "");
    return;
  }
  searchOpen.value = !searchOpen.value;
  if (!searchOpen.value) {
    emit("update:searchQuery", "");
  }
}

</script>

<template>
  <ion-header class="ion-no-border liquid-header">
    <ion-buttons>
      <ion-toolbar color="medium">
        <ion-title>{{ props.headerName }}</ion-title>
        <ion-buttons slot="start">
          <ion-back-button v-if="forceBackButton" default-href="/rooms" />
          <ion-button v-if="searchable" size="small" @click="toggleSearch">
            <ion-icon slot="icon-only" :ios="searchOutline" :md="searchOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button size="small" @click="ionRouter.navigate('/invites', 'forward', 'push')">
            <ion-icon slot="icon-only" :ios="notificationsOutline" :md="notificationsOutline">
            </ion-icon>
            <ion-badge color="primary" v-show="notifications.count > 0">{{ notifications.count }}</ion-badge>
          </ion-button>
          <LogOutButton/>
        </ion-buttons>
      </ion-toolbar>
    </ion-buttons>
    <ion-toolbar v-if="searchable && (searchOpen || hasSearchQuery)" color="dark" class="search-toolbar">
      <ion-searchbar
        :model-value="searchQuery"
        placeholder="Поиск"
        @ionInput="emit('update:searchQuery', (($event as CustomEvent).detail.value ?? '').toString())"
      />
    </ion-toolbar>
  </ion-header>
</template>

<style scoped>
ion-button {
  ion-badge {
    position: absolute;
    top: -0.4rem;
    right: -0.4rem;

    & ~ ion-icon {
      margin-right: 1.2rem;
    }
  }
}

.liquid-header {
  --background: transparent !important;
  position: relative;
  background: transparent !important;
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
}

.liquid-header::before {
  content: "";
  position: absolute;
  inset: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  pointer-events: none;
  z-index: 0;
}

.liquid-header ion-toolbar {
  --background: transparent !important;
  --ion-toolbar-background: transparent !important;
  --border-color: transparent !important;
  --color: var(--ion-color-light) !important;
  --opacity: 0 !important;
  background: transparent !important;
  position: relative;
  z-index: 1;
}

.liquid-header ion-back-button {
  --color: var(--ion-color-light) !important;
}

.liquid-header .search-toolbar {
  --background: transparent !important;
  --ion-toolbar-background: transparent !important;
}
</style>
