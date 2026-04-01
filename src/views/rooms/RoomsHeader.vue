<script setup lang="ts">
import {
  IonBadge,
  IonBackButton,
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  useIonRouter
} from "@ionic/vue";
import {arrowBack, notificationsOutline, searchOutline} from "ionicons/icons";
import {computed, onBeforeMount, ref} from "vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import LogOutButton from "@/views/common/LogOutButton.vue";

const notifications = ref<{ count: number; }>({count: 0});
const ionRouter = useIonRouter();

const props = defineProps({
  headerName: String,
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
      "Authorization": "Bearer " + (localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))
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
  <ion-header class="ion-no-border">
    <ion-buttons>
      <ion-toolbar color="dark" no-border>
        <ion-title>{{ props.headerName }}</ion-title>
        <ion-buttons slot="start">
          <ion-button v-if="headerName === 'Персонажи'" size="small" @click="ionRouter.replace('/rooms')">
            <ion-icon slot="icon-only" :icon="arrowBack"></ion-icon>
          </ion-button>
          <ion-back-button v-else/>
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
</style>
