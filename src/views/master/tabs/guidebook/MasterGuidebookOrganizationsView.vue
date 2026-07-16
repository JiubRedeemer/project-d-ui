<script setup lang="ts">
import {IonContent, IonPage, IonIcon, IonFab, IonFabButton, useIonRouter, onIonViewWillEnter} from "@ionic/vue";
import {addOutline, businessOutline, eyeOffOutline, lockClosedOutline} from "ionicons/icons";
import {computed, ref} from "vue";
import {useRoute} from "vue-router";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {getOrganizationsForRoom} from "@/api/organizationApi";
import type {OrganizationDto} from "@/api/organizationApi.types";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

function orgImageUrl(imgUrl: string | null | undefined): string | null {
  return imgUrl?.trim()
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : null;
}

const route = useRoute();
const ionRouter = useIonRouter();
const roomId = computed(() => String(route.params.roomId));

const searchQuery = ref("");
const organizations = ref<OrganizationDto[]>([]);
const loading = ref(false);

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return organizations.value;
  return organizations.value.filter((o) =>
      (o.name ?? "").toLowerCase().includes(q) || (o.type ?? "").toLowerCase().includes(q)
  );
});

async function load() {
  loading.value = true;
  try {
    organizations.value = await getOrganizationsForRoom(roomId.value);
  } catch (e) {
    console.error("Failed to load organizations:", e);
    organizations.value = [];
  } finally {
    loading.value = false;
  }
}

function openFull(org: OrganizationDto) {
  ionRouter.push(`/rooms/${roomId.value}/organizations/${org.id}/full`);
}

function openCreate() {
  ionRouter.push(`/rooms/${roomId.value}/organizations/create`);
}

onIonViewWillEnter(load);
</script>

<template>
  <ion-page>
    <RoomsHeader header-name="Организации" force-back-button searchable v-model:search-query="searchQuery"/>
    <ion-content color="dark" class="ion-padding">
      <div v-if="!loading && filtered.length === 0" class="empty">Организаций пока нет</div>

      <div class="org-grid">
        <button v-for="org in filtered" :key="org.id" class="org-card" @click="openFull(org)">
          <span class="org-card__icon">
            <img v-if="orgImageUrl(org.imgUrl)" :src="orgImageUrl(org.imgUrl)!" class="org-card__img" alt=""/>
            <ion-icon v-else :icon="businessOutline"/>
          </span>
          <span class="org-card__body">
            <span class="org-card__name">{{ org.name }}</span>
            <span v-if="org.type" class="org-card__type">{{ org.type }}</span>
            <span v-if="org.location" class="org-card__loc">{{ org.location }}</span>
          </span>
          <span class="org-card__flags">
            <ion-icon v-if="org.visible === false" :icon="eyeOffOutline" title="Скрыта от игроков"/>
            <ion-icon v-if="org.statsHidden" :icon="lockClosedOutline" title="Характеристики скрыты"/>
          </span>
        </button>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button color="primary" @click="openCreate">
          <ion-icon :icon="addOutline"/>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.empty {
  text-align: center;
  color: rgba(var(--ion-color-light-rgb), 0.5);
  padding: 40px 16px;
}

.org-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 90px;
}

.org-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  background: var(--ion-color-medium);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.12);
}

.org-card__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 13px;
  font-size: 22px;
  overflow: hidden;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.14);
}
.org-card__img { width: 100%; height: 100%; object-fit: cover; }

.org-card__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

.org-card__name {
  font-size: 16px;
  font-weight: 700;
  color: var(--ion-color-light);
}

.org-card__type {
  font-size: 12px;
  color: var(--ion-color-primary);
}

.org-card__loc {
  font-size: 12px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
}

.org-card__flags {
  display: flex;
  gap: 6px;
  font-size: 16px;
  color: rgba(var(--ion-color-light-rgb), 0.5);
}
</style>
