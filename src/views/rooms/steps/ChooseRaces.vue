<script setup lang="ts">

import {
  IonAvatar,
  IonCheckbox,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  onIonViewDidEnter,
  useIonRouter
} from "@ionic/vue";
import {addOutline, arrowBackOutline, arrowForwardOutline, chevronForwardOutline} from "ionicons/icons";
import {HEADERS, TEXTS} from "@/config/localisations";
import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {computed, onMounted, ref} from "vue";
import {useRouter} from "vue-router";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {RaceDto} from "@/api/rulebookApi.types";
import {useRoomCreationStore} from "@/stores/RoomCreationStore";
import {useFullRaceStore} from "@/stores/FullRaceStore";

const roomCreationStore = useRoomCreationStore();
const racesFullStore = useFullRaceStore();
const ionRouter = useIonRouter();
const router = useRouter();

const racesFromApi = ref<RaceDto[]>([]);

const races = computed(() => {
  const api = racesFromApi.value ?? [];
  const customCodes = new Set(api.map((r) => r.code));
  const customOnly = roomCreationStore.races.filter((r) => !customCodes.has(r.code));
  return [...api, ...customOnly];
});

const areAllRacesSelected = computed(() =>
    races.value.length > 0 && races.value.every((r) => isRaceSelected(r))
);

const isRacesSelectionIndeterminate = computed(() => {
  const selectedCount = races.value.filter((r) => isRaceSelected(r)).length;
  return selectedCount > 0 && selectedCount < races.value.length;
});

const toggleAllRaces = () => {
  if (areAllRacesSelected.value) {
    roomCreationStore.races = [];
  } else {
    roomCreationStore.races = [...races.value];
  }
};

const setupRaces = async () => {
  if (!roomCreationStore.roomInfo.baseRules && !roomCreationStore.roomInfo.baseRules) {
    ionRouter.replace("/rooms/create/ruleType")
  }
  racesFromApi.value = await roomCreationStore.getAvailableRaces(roomCreationStore.roomInfo.baseRules)
}

onIonViewDidEnter(() => {
  setupRaces()
})

onMounted(() => {
  setupRaces()
})

const isRaceSelected = (race: RaceDto) =>
    roomCreationStore.races.some((r) => r.code === race.code);

const toggleRace = (race: RaceDto) => {
  const idx = roomCreationStore.races.findIndex((r) => r.code === race.code);
  if (idx >= 0) {
    roomCreationStore.races = roomCreationStore.races.filter((r) => r.code !== race.code);
  } else {
    roomCreationStore.races = [...roomCreationStore.races, race];
  }
};

type RaceGroup = {
  key: string;
  root: RaceDto | null;
  subs: RaceDto[];
};

const raceGroups = computed<RaceGroup[]>(() => {
  const groupsByRootCode = new Map<string, { root: RaceDto | null; subs: RaceDto[] }>();

  for (const race of races.value) {
    const rootCode = race.speciesCode ? race.speciesCode : race.code;
    const existing = groupsByRootCode.get(rootCode);
    if (!existing) {
      groupsByRootCode.set(rootCode, {root: race.speciesCode ? null : race, subs: []});
    } else if (!race.speciesCode) {
      // Root race (speciesCode is null/undefined)
      existing.root = race;
    } else {
      existing.subs.push(race);
      continue;
    }

    const g = groupsByRootCode.get(rootCode)!;
    if (race.speciesCode) {
      g.subs.push(race);
    }
  }

  const out: RaceGroup[] = Array.from(groupsByRootCode.entries()).map(([key, value]) => ({
    key,
    root: value.root,
    subs: value.subs,
  }));

  for (const g of out) {
    g.subs = [...g.subs].sort((a, b) => (a.name ?? a.code).localeCompare(b.name ?? b.code, "ru", {sensitivity: "base"}));
  }

  out.sort((a, b) => {
    const aLabel = a.root?.name ?? a.subs[0]?.name ?? a.key;
    const bLabel = b.root?.name ?? b.subs[0]?.name ?? b.key;
    return aLabel.localeCompare(bLabel, "ru", {sensitivity: "base"});
  });

  return out;
});

function getGroupItems(group: RaceGroup): RaceDto[] {
  if (group.root) return [group.root, ...group.subs];
  return [...group.subs];
}

function isRaceGroupSelected(group: RaceGroup): boolean {
  const items = getGroupItems(group);
  return items.length > 0 && items.every((r) => isRaceSelected(r));
}

function isRaceGroupIndeterminate(group: RaceGroup): boolean {
  const items = getGroupItems(group);
  const selectedCount = items.filter((r) => isRaceSelected(r)).length;
  return selectedCount > 0 && selectedCount < items.length;
}

function toggleRaceGroup(group: RaceGroup): void {
  const items = getGroupItems(group);
  if (!items.length) return;

  const allSelected = items.every((r) => isRaceSelected(r));
  if (allSelected) {
    const codesToRemove = new Set(items.map((r) => r.code));
    roomCreationStore.races = roomCreationStore.races.filter((r) => !codesToRemove.has(r.code));
    return;
  }

  const selectedCodes = new Set(roomCreationStore.races.map((r) => r.code));
  roomCreationStore.races = [
    ...roomCreationStore.races,
    ...items.filter((r) => !selectedCodes.has(r.code)),
  ];
}

const goToFullRace = (race: RaceDto) => {
  racesFullStore.race = race;
  ionRouter.navigate("/guidebook/races/" + race.code, 'forward', 'push')
}

const nextStep = () => {
  ionRouter.navigate("/rooms/create/classes", 'forward', 'push');
}

const previousStep = () => {
  router.back();
}

const createItem = () => {
  ionRouter.navigate("/createEntity/race", 'forward', 'push');
}


</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="HEADERS.chooseRaces.rus"></RoomsHeader>
    <ion-content :fullscreen="true" color="dark">

      <ion-item v-if="races.length" color="dark">
        <ion-label>Выбрать все</ion-label>
        <ion-checkbox
            slot="end"
            :indeterminate="isRacesSelectionIndeterminate"
            :checked="areAllRacesSelected"
            @ionChange="toggleAllRaces"
        />
      </ion-item>

      <ion-list v-show="raceGroups.length !== 0" class="room-list">
        <template v-for="group in raceGroups" :key="group.key">
          <ion-item
            v-if="group.root"
            :button="true"
            color="dark"
          >
            <ion-checkbox
              slot="end"
              :checked="isRaceGroupSelected(group)"
              :indeterminate="isRaceGroupIndeterminate(group)"
              @ionChange="toggleRaceGroup(group)"
            />
            <ion-avatar aria-hidden="false" slot="start">
              <img
                width="64"
                height="64"
                :src="group.root.imgUrl ? FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                FILE_STORAGE_INTEGRATION_ROUTES.api +
                FILE_STORAGE_INTEGRATION_ROUTES.races_images_bucket +
                FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + group.root.imgUrl :
                'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"
              />
            </ion-avatar>
            <ion-icon
              aria-hidden="false"
              :icon="chevronForwardOutline"
              slot="end"
              @click="goToFullRace(group.root)"
            />
            <ion-label>
              <div class="room-name">{{ group.root.name }}</div>
            </ion-label>
          </ion-item>

          <ion-item
            v-else-if="group.subs.length"
            :button="true"
            color="dark"
          >
            <ion-checkbox
              slot="end"
              :checked="isRaceGroupSelected(group)"
              :indeterminate="isRaceGroupIndeterminate(group)"
              @ionChange="toggleRaceGroup(group)"
            />
            <ion-avatar aria-hidden="false" slot="start">
              <img
                width="64"
                height="64"
                :src="group.subs[0].imgUrl ? FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                FILE_STORAGE_INTEGRATION_ROUTES.api +
                FILE_STORAGE_INTEGRATION_ROUTES.races_images_bucket +
                FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + group.subs[0].imgUrl :
                'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"
              />
            </ion-avatar>
            <ion-icon
              aria-hidden="false"
              :icon="chevronForwardOutline"
              slot="end"
              @click="goToFullRace(group.subs[0])"
            />
            <ion-label>
              <div class="room-name">{{ group.subs[0].name }}</div>
            </ion-label>
          </ion-item>

          <ion-item
            v-for="sub in group.root ? group.subs : group.subs.slice(1)"
            :key="sub.code + (sub.id ?? '')"
            :button="true"
            color="dark"
            class="group-sub-item"
          >
            <ion-checkbox
              slot="end"
              :checked="isRaceSelected(sub)"
              @ionChange="toggleRace(sub)"
            />
            <ion-avatar aria-hidden="false" slot="start">
              <img
                width="64"
                height="64"
                :src="sub.imgUrl ? FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                FILE_STORAGE_INTEGRATION_ROUTES.api +
                FILE_STORAGE_INTEGRATION_ROUTES.races_images_bucket +
                FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + sub.imgUrl :
                'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"
              />
            </ion-avatar>
            <ion-icon
              aria-hidden="false"
              :icon="chevronForwardOutline"
              slot="end"
              @click="goToFullRace(sub)"
            />
            <ion-label>
              <div class="room-name">{{ sub.name }}</div>
            </ion-label>
          </ion-item>
        </template>
        <div style="min-height: 50px"></div>
      </ion-list>

      <div class="room-list-placeholder-wrapper" v-show="races.length === 0">
        <div class="room-list-placeholder">{{ TEXTS.emptyRoomList.rus }}</div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button color="medium" @click="nextStep()">
          <ion-icon :icon="arrowForwardOutline" color="light"></ion-icon>
        </ion-fab-button>
      </ion-fab>
      <ion-fab slot="fixed" vertical="bottom" horizontal="start">
        <ion-fab-button color="medium" @click="previousStep()">
          <ion-icon :icon="arrowBackOutline" color="light"></ion-icon>
        </ion-fab-button>
      </ion-fab>
      <ion-fab slot="fixed" vertical="bottom" horizontal="center">
        <ion-fab-button color="medium" @click="createItem()">
          <ion-icon :icon="addOutline" color="light"></ion-icon>
        </ion-fab-button>
      </ion-fab>

    </ion-content>
  </ion-page>
</template>

<style scoped>

.room-list {
  background: transparent;
}

.room-list-placeholder-wrapper {
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  align-content: center;
  justify-content: center;
  overflow: auto;
}

.group-sub-item {
  padding-left: 18px;
}

@media (min-width: 1024px) {
  .room-list {
    max-width: 1200px;
    margin: 0 auto;
    padding: 8px 10px 96px;
    border-radius: 14px;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.1);
    background: rgba(var(--ion-color-medium-rgb), 0.16);
  }

  .room-list ion-item {
    --min-height: 72px;
    --inner-padding-top: 8px;
    --inner-padding-bottom: 8px;
    --border-color: rgba(var(--ion-color-light-rgb), 0.08);
  }

  .room-list ion-avatar {
    width: 52px;
    height: 52px;
  }

  .room-name {
    font-size: 15px;
    font-weight: 600;
  }

  .group-sub-item {
    padding-left: 34px;
  }

  .room-list-placeholder-wrapper {
    position: static;
    min-height: 40vh;
  }

  ion-fab[horizontal="start"] {
    left: 22px;
    right: auto;
    bottom: 18px;
  }

  ion-fab[horizontal="center"] {
    left: 84px;
    right: auto;
    transform: none;
    bottom: 18px;
  }

  ion-fab[horizontal="end"] {
    right: 22px;
    bottom: 18px;
  }
}
</style>
