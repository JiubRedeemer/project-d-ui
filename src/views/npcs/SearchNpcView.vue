<script setup lang="ts">
import {
  IonAvatar,
  IonBackButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonToolbar,
  onIonViewDidEnter,
  toastController,
} from "@ionic/vue";
import {addOutline} from "ionicons/icons";
import {computed, ref} from "vue";
import {useRoute, useRouter} from "vue-router";
import {getNpcsByRoomIdForRoom, saveCharacterNpcRelationForRoom} from "@/api/npcApi";
import type {NpcDto, NpcTypeEnum, RelationTypeEnum} from "@/api/npcApi.types";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useNpcRelationsStore} from "@/stores/NpcRelationsStore";
import {sortNpcsByName} from "@/utils/sortNpcsByName";

const route = useRoute();
const router = useRouter();
const npcRelationsStore = useNpcRelationsStore();

const roomId = computed(() => route.params.roomId as string);
const characterId = computed(() => route.params.characterId as string);
const relationType = computed<RelationTypeEnum | null>(() => {
  const raw = (route.query.relationType as string) ?? null;
  if (!raw) return null;
  const allowed: RelationTypeEnum[] = ["FRIEND", "ENEMY", "RULER", "PET", "OTHER"];
  return allowed.includes(raw as RelationTypeEnum) ? (raw as RelationTypeEnum) : null;
});

const npcs = ref<NpcDto[]>([]);
const loading = ref(false);
const searchQuery = ref("");

const NPC_TYPE_LABELS: Record<NpcTypeEnum, string> = {
  RATIONAL: "Разумное",
  BEAST: "Животное",
  MONSTER: "Монстр",
  DEITY: "Божество",
  UNDEAD: "Нежить",
};

const getNpcTypeLabel = (type: NpcTypeEnum | undefined | null) =>
    type ? (NPC_TYPE_LABELS[type] ?? type) : "";


const filteredNpcs = computed(() => {
  let list = npcs.value;
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((s) => {
      const name = s.name
      return name.toLowerCase().includes(q);
    });
  }
  return sortNpcsByName(list);
});

function getNpcImageUrl(imgUrl: string | undefined | null) {
  if (!imgUrl) {
    return "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
  }
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
}

async function loadNpcs() {
  loading.value = true;
  try {
    npcs.value = await getNpcsByRoomIdForRoom(roomId.value, {
      characterId: characterId.value || undefined,
      forceAll: false,
    });
  } catch (e) {
    console.error("Failed to load NPCs:", e);
    npcs.value = [];
  } finally {
    loading.value = false;
  }
}

async function selectNpc(npc: NpcDto) {
  if (!relationType.value) return;
  try {
    await saveCharacterNpcRelationForRoom(roomId.value, characterId.value, {
      characterId: characterId.value,
      npcId: npc.id,
      relationType: relationType.value,
    });
    await npcRelationsStore.loadAll(roomId.value, characterId.value);
    const toast = await toastController.create({
      message: `${npc.name} добавлен`,
      duration: 1500,
      position: "top",
    });
    await toast.present();
    router.back();
  } catch (e) {
    console.error("Failed to add relation:", e);
    const toast = await toastController.create({
      message: "Ошибка при добавлении",
      duration: 2000,
      position: "top",
      color: "danger",
    });
    await toast.present();
  }
}

function goToCreateNpc() {
  router.push({
    path: `/rooms/${roomId.value}/npcs/create`,
    query: {characterId: characterId.value, relationType: relationType.value ?? undefined},
  });
}

onIonViewDidEnter(() => {
  void loadNpcs();
});
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/rooms/${roomId}/characters/${characterId}`"/>
        </ion-buttons>
        <ion-label class="ion-padding-start">Выбор NPC</ion-label>
      </ion-toolbar>
      <ion-toolbar color="dark">
        <ion-searchbar
            v-model="searchQuery"
            placeholder="Поиск по имени"
            debounce="200"
            :clear-input="true"
            shape="transparent"
        />
      </ion-toolbar>
    </ion-header>
    <ion-content color="dark">
      <div v-if="loading" class="loading">Загрузка...</div>
      <ion-list v-else-if="filteredNpcs.length" class="npc-list">
        <ion-item
            v-for="(npc, idx) in filteredNpcs"
            :key="idx"
            :button="true"
            @click="selectNpc(npc)"
        >
          <ion-avatar slot="start">
            <img
                class="npc-avatar"
                :src="getNpcImageUrl(npc.imgUrl)"
                :alt="npc.name"
                @error="($event.target as HTMLImageElement).src = 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
            />
          </ion-avatar>
          <ion-label>
            <h2>{{ npc.name }}</h2>
            <p>{{ getNpcTypeLabel(npc.type) }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <div v-else class="empty">Нет NPC</div>
    </ion-content>
    <ion-fab slot="fixed" vertical="bottom" horizontal="center">
      <ion-fab-button color="medium" @click="goToCreateNpc()">
        <ion-icon :icon="addOutline" color="light"></ion-icon>
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<style scoped>
.loading,
.empty {
  text-align: center;
  padding: 24px;
  color: var(--ion-color-medium);
}

.npc-list {
  background: transparent;
}

ion-item :deep() {
  --background: transparent;
}

ion-avatar {
  --border-radius: 50%;
  height: 45px;
  width: 45px;
}

.npc-avatar {
  width: 48px;
  height: 48px;
  object-fit: cover;
}

ion-searchbar {
  --border-radius: 20px;
  --background: transparent;
}

.add-section {
  padding: 16px;
  padding-bottom: 32px;
}
</style>
