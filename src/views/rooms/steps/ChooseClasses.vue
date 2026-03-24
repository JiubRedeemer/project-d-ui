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
import {ClazzDto} from "@/api/rulebookApi.types";
import {useRoomCreationStore} from "@/stores/RoomCreationStore";
import {useFullClassStore} from "@/stores/FullClassStore";

const roomCreationStore = useRoomCreationStore();
const classFullStore = useFullClassStore();
const ionRouter = useIonRouter();
const router = useRouter();

const classesFromApi = ref<ClazzDto[]>([]);

const classes = computed(() => {
  const api = classesFromApi.value ?? [];
  const customCodes = new Set(api.map((c) => c.code));
  const customOnly = roomCreationStore.classes.filter((c) => !customCodes.has(c.code));
  return [...api, ...customOnly];
});

const areAllClassesSelected = computed(() =>
    classes.value.length > 0 && classes.value.every((c) => isClassSelected(c))
);

const isClassesSelectionIndeterminate = computed(() => {
  const selectedCount = classes.value.filter((c) => isClassSelected(c)).length;
  return selectedCount > 0 && selectedCount < classes.value.length;
});

const toggleAllClasses = () => {
  if (areAllClassesSelected.value) {
    roomCreationStore.classes = [];
  } else {
    roomCreationStore.classes = [...classes.value];
  }
};

const setupClasses = async () => {
  classesFromApi.value = await roomCreationStore.getAvailableClasses(roomCreationStore.roomInfo.baseRules);
};

const createItem = () => {
  ionRouter.navigate("/createEntity/class", "forward", "push");
};

onIonViewDidEnter(() => {
  setupClasses()
})

onMounted(() => {
  setupClasses()
})

const isClassSelected = (clazz: ClazzDto) =>
  roomCreationStore.classes.some((c) => c.code === clazz.code);

const toggleClass = (clazz: ClazzDto) => {
  const idx = roomCreationStore.classes.findIndex((c) => c.code === clazz.code);
  if (idx >= 0) {
    roomCreationStore.classes = roomCreationStore.classes.filter((c) => c.code !== clazz.code);
  } else {
    roomCreationStore.classes = [...roomCreationStore.classes, clazz];
  }
};

type ClassGroup = {
  key: string;
  root: ClazzDto | null;
  subs: ClazzDto[];
};

const classGroups = computed<ClassGroup[]>(() => {
  const groupsByRootCode = new Map<string, { root: ClazzDto | null; subs: ClazzDto[] }>();

  for (const clazz of classes.value) {
    const rootCode = clazz.groupCode ? clazz.groupCode : clazz.code;
    const existing = groupsByRootCode.get(rootCode);
    if (!existing) {
      groupsByRootCode.set(rootCode, {root: clazz.groupCode ? null : clazz, subs: []});
    } else if (!clazz.groupCode) {
      existing.root = clazz;
    }

    const g = groupsByRootCode.get(rootCode)!;
    if (clazz.groupCode) g.subs.push(clazz);
  }

  const out: ClassGroup[] = Array.from(groupsByRootCode.entries()).map(([key, value]) => ({
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

function getGroupItems(group: ClassGroup): ClazzDto[] {
  if (group.root) return [group.root, ...group.subs];
  return [...group.subs];
}

function isClassGroupSelected(group: ClassGroup): boolean {
  const items = getGroupItems(group);
  return items.length > 0 && items.every((c) => isClassSelected(c));
}

function isClassGroupIndeterminate(group: ClassGroup): boolean {
  const items = getGroupItems(group);
  const selectedCount = items.filter((c) => isClassSelected(c)).length;
  return selectedCount > 0 && selectedCount < items.length;
}

function toggleClassGroup(group: ClassGroup): void {
  const items = getGroupItems(group);
  if (!items.length) return;

  const allSelected = items.every((c) => isClassSelected(c));
  if (allSelected) {
    const codesToRemove = new Set(items.map((c) => c.code));
    roomCreationStore.classes = roomCreationStore.classes.filter((c) => !codesToRemove.has(c.code));
    return;
  }

  const selectedCodes = new Set(roomCreationStore.classes.map((c) => c.code));
  roomCreationStore.classes = [
    ...roomCreationStore.classes,
    ...items.filter((c) => !selectedCodes.has(c.code)),
  ];
}

const goToFullClass = (clazz: ClazzDto) => {
  classFullStore.clazz = clazz;
  ionRouter.navigate("/guidebook/classes/" + clazz.code, 'forward', 'push')
}

const nextStep = () => {
  ionRouter.navigate("/rooms/create/backgrounds", 'forward', 'push');
}
const previousStep = () => {
  router.back();
}

</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="HEADERS.chooseClasses.rus"></RoomsHeader>
    <ion-content :fullscreen="true" color="dark">

      <ion-item v-if="classes.length" color="dark">
        <ion-label>Выбрать все</ion-label>
        <ion-checkbox
            slot="end"
            :indeterminate="isClassesSelectionIndeterminate"
            :checked="areAllClassesSelected"
            @ionChange="toggleAllClasses"
        />
      </ion-item>

      <ion-list v-show="classGroups.length !== 0" class="room-list">
        <template v-for="group in classGroups" :key="group.key">
          <ion-item
            v-if="group.root"
            :button="true"
            color="dark"
          >
            <ion-checkbox
              slot="end"
              :checked="isClassGroupSelected(group)"
              :indeterminate="isClassGroupIndeterminate(group)"
              @ionChange="toggleClassGroup(group)"
            />
            <ion-avatar aria-hidden="false" slot="start">
              <img
                width="64"
                height="64"
                :src="group.root.imgUrl ? FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                FILE_STORAGE_INTEGRATION_ROUTES.api +
                FILE_STORAGE_INTEGRATION_ROUTES.classes_images_bucket +
                FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + group.root.imgUrl :
                'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"
              />
            </ion-avatar>
            <ion-icon
              aria-hidden="false"
              :icon="chevronForwardOutline"
              slot="end"
              @click="goToFullClass(group.root)"
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
              :checked="isClassGroupSelected(group)"
              :indeterminate="isClassGroupIndeterminate(group)"
              @ionChange="toggleClassGroup(group)"
            />
            <ion-avatar aria-hidden="false" slot="start">
              <img
                width="64"
                height="64"
                :src="group.subs[0].imgUrl ? FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                FILE_STORAGE_INTEGRATION_ROUTES.api +
                FILE_STORAGE_INTEGRATION_ROUTES.classes_images_bucket +
                FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + group.subs[0].imgUrl :
                'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"
              />
            </ion-avatar>
            <ion-icon
              aria-hidden="false"
              :icon="chevronForwardOutline"
              slot="end"
              @click="goToFullClass(group.subs[0])"
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
              :checked="isClassSelected(sub)"
              @ionChange="toggleClass(sub)"
            />
            <ion-avatar aria-hidden="false" slot="start">
              <img
                width="64"
                height="64"
                :src="sub.imgUrl ? FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                FILE_STORAGE_INTEGRATION_ROUTES.api +
                FILE_STORAGE_INTEGRATION_ROUTES.classes_images_bucket +
                FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + sub.imgUrl :
                'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png'"
                alt="external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2"
              />
            </ion-avatar>
            <ion-icon
              aria-hidden="false"
              :icon="chevronForwardOutline"
              slot="end"
              @click="goToFullClass(sub)"
            />
            <ion-label>
              <div class="room-name">{{ sub.name }}</div>
            </ion-label>
          </ion-item>
        </template>
        <div style="min-height: 50px"></div>
      </ion-list>

      <div class="room-list-placeholder-wrapper" v-show="classes.length === 0">
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
