<script setup lang="ts">
import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from "@ionic/vue";
import {chevronForwardOutline} from "ionicons/icons";
import {computed, ref, watch} from "vue";
import type {BackgroundDto, ClazzDto, RaceDto} from "@/api/rulebookApi.types";
import {
  createBackground,
  createClass,
  createRace,
  getBackgroundsForRoom,
  getClassesForRoom,
  getRacesForRoom,
} from "@/api/rulebookApi";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useFullRaceStore} from "@/stores/FullRaceStore";
import {useFullClassStore} from "@/stores/FullClassStore";
import {useFullBackgroundStore} from "@/stores/FullBackgroundStore";

const CATALOG_ROOM_ID = "00000000-0000-0000-0000-000000000000";

const props = defineProps<{
  isOpen: boolean;
  kind: "races" | "classes" | "backgrounds";
  roomId: string;
  baseRuleType: string | undefined;
}>();

type AppliedPayload =
  | {kind: "races"; saved: RaceDto[]}
  | {kind: "classes"; saved: ClazzDto[]}
  | {kind: "backgrounds"; saved: BackgroundDto[]};

const emit = defineEmits<{
  (e: "close"): void;
  (e: "applied", payload: AppliedPayload): void;
}>();

const ionRouter = useIonRouter();
const fullRaceStore = useFullRaceStore();
const fullClassStore = useFullClassStore();
const fullBackgroundStore = useFullBackgroundStore();

const loading = ref(false);
const saving = ref(false);
const catalogRaces = ref<RaceDto[]>([]);
const catalogClasses = ref<ClazzDto[]>([]);
const catalogBackgrounds = ref<BackgroundDto[]>([]);
/** Актуальные сущности комнаты с API при открытии модалки (не из кэша родителя) */
const roomRaces = ref<RaceDto[]>([]);
const roomClasses = ref<ClazzDto[]>([]);
const roomBackgrounds = ref<BackgroundDto[]>([]);
const pendingCodes = ref<Set<string>>(new Set());

function normCode(code: string | undefined | null): string {
  return (code ?? "").trim().toLowerCase();
}

/** Коды уже созданных в комнате — сравнение с позициями каталога по коду (без учёта регистра) */
const roomCodeSet = computed(() => {
  const set = new Set<string>();
  if (props.kind === "races") {
    for (const r of roomRaces.value) {
      const n = normCode(r.code);
      if (n) set.add(n);
    }
  } else if (props.kind === "classes") {
    for (const c of roomClasses.value) {
      const n = normCode(c.code);
      if (n) set.add(n);
    }
  } else {
    for (const b of roomBackgrounds.value) {
      const n = normCode(b.code);
      if (n) set.add(n);
    }
  }
  return set;
});

type RaceGroup = {
  key: string;
  root: RaceDto | null;
  subs: RaceDto[];
};

type ClassGroup = {
  key: string;
  root: ClazzDto | null;
  subs: ClazzDto[];
};

const raceGroups = computed<RaceGroup[]>(() => {
  const groupsByRootCode = new Map<string, {root: RaceDto | null; subs: RaceDto[]}>();

  for (const race of catalogRaces.value) {
    const rootCode = race.speciesCode ? race.speciesCode : race.code;
    if (!rootCode) continue;
    const existing = groupsByRootCode.get(rootCode);
    if (!existing) {
      groupsByRootCode.set(rootCode, {root: race.speciesCode ? null : race, subs: []});
    } else if (!race.speciesCode) {
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
    g.subs = [...g.subs].sort((a, b) => (a.name ?? a.code ?? "").localeCompare(b.name ?? b.code ?? "", "ru", {sensitivity: "base"}));
  }

  out.sort((a, b) => {
    const aLabel = a.root?.name ?? a.subs[0]?.name ?? a.key;
    const bLabel = b.root?.name ?? b.subs[0]?.name ?? b.key;
    return aLabel.localeCompare(bLabel, "ru", {sensitivity: "base"});
  });

  return out;
});

const classGroups = computed<ClassGroup[]>(() => {
  const groupsByRootCode = new Map<string, {root: ClazzDto | null; subs: ClazzDto[]}>();

  for (const clazz of catalogClasses.value) {
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

const modalTitle = computed(() => {
  if (props.kind === "races") return "Добавить расы из справочника";
  if (props.kind === "classes") return "Добавить классы из справочника";
  return "Добавить предыстории из справочника";
});

function inRoom(code: string | undefined | null) {
  const n = normCode(code);
  return n ? roomCodeSet.value.has(n) : false;
}

function isPending(code: string | undefined | null) {
  const n = normCode(code);
  return n ? pendingCodes.value.has(n) : false;
}

function togglePending(code: string | undefined | null) {
  const n = normCode(code);
  if (!n || inRoom(code)) return;
  const next = new Set(pendingCodes.value);
  if (next.has(n)) next.delete(n);
  else next.add(n);
  pendingCodes.value = next;
}

function getRaceGroupItems(group: RaceGroup): RaceDto[] {
  if (group.root) return [group.root, ...group.subs];
  return [...group.subs];
}

function getClassGroupItems(group: ClassGroup): ClazzDto[] {
  if (group.root) return [group.root, ...group.subs];
  return [...group.subs];
}

function toggleRaceGroup(group: RaceGroup) {
  const items = getRaceGroupItems(group).filter((r) => r.code && !inRoom(r.code));
  if (!items.length) return;
  const allPending = items.every((r) => isPending(r.code));
  const next = new Set(pendingCodes.value);
  if (allPending) {
    items.forEach((r) => next.delete(normCode(r.code)));
  } else {
    items.forEach((r) => next.add(normCode(r.code!)));
  }
  pendingCodes.value = next;
}

function isRaceGroupIndeterminate(group: RaceGroup): boolean {
  const items = getRaceGroupItems(group).filter((r) => r.code && !inRoom(r.code));
  const n = items.filter((r) => isPending(r.code)).length;
  return n > 0 && n < items.length;
}

function toggleClassGroup(group: ClassGroup) {
  const items = getClassGroupItems(group).filter((c) => c.code && !inRoom(c.code));
  if (!items.length) return;
  const allPending = items.every((c) => isPending(c.code));
  const next = new Set(pendingCodes.value);
  if (allPending) {
    items.forEach((c) => next.delete(normCode(c.code)));
  } else {
    items.forEach((c) => next.add(normCode(c.code)));
  }
  pendingCodes.value = next;
}

function isClassGroupIndeterminate(group: ClassGroup): boolean {
  const items = getClassGroupItems(group).filter((c) => c.code && !inRoom(c.code));
  const n = items.filter((c) => isPending(c.code)).length;
  return n > 0 && n < items.length;
}

const addableRaceCodes = computed(() =>
  catalogRaces.value.map((r) => normCode(r.code)).filter((c) => Boolean(c) && !roomCodeSet.value.has(c))
);
const addableClassCodes = computed(() =>
  catalogClasses.value.map((c) => normCode(c.code)).filter((code) => Boolean(code) && !roomCodeSet.value.has(code))
);
const addableBackgroundCodes = computed(() =>
  catalogBackgrounds.value.map((b) => normCode(b.code)).filter((c) => Boolean(c) && !roomCodeSet.value.has(c))
);

const areAllAddableSelected = computed(() => {
  if (props.kind === "races") {
    const codes = addableRaceCodes.value;
    return codes.length > 0 && codes.every((c) => pendingCodes.value.has(c));
  }
  if (props.kind === "classes") {
    const codes = addableClassCodes.value;
    return codes.length > 0 && codes.every((c) => pendingCodes.value.has(c));
  }
  const codes = addableBackgroundCodes.value;
  return codes.length > 0 && codes.every((c) => pendingCodes.value.has(c));
});

const isAddableSelectionIndeterminate = computed(() => {
  let codes: string[] = [];
  if (props.kind === "races") codes = addableRaceCodes.value;
  else if (props.kind === "classes") codes = addableClassCodes.value;
  else codes = addableBackgroundCodes.value;
  const n = codes.filter((c) => pendingCodes.value.has(c)).length;
  return n > 0 && n < codes.length;
});

function toggleAllAddable() {
  let codes: string[] = [];
  if (props.kind === "races") codes = addableRaceCodes.value;
  else if (props.kind === "classes") codes = addableClassCodes.value;
  else codes = addableBackgroundCodes.value;
  if (!codes.length) return;
  const next = new Set(pendingCodes.value);
  if (areAllAddableSelected.value) {
    codes.forEach((c) => next.delete(c));
  } else {
    codes.forEach((c) => next.add(c));
  }
  pendingCodes.value = next;
}

function raceImg(r: RaceDto) {
  return r.imgUrl
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.races_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${r.imgUrl}`
    : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
}

function classImg(c: ClazzDto) {
  return c.imgUrl
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.classes_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${c.imgUrl}`
    : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
}

function backgroundImg(b: BackgroundDto) {
  return b.imgUrl
    ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.backgrounds_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${b.imgUrl}`
    : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
}

function goToFullRace(race: RaceDto) {
  fullRaceStore.race = race;
  ionRouter.navigate("/guidebook/races/" + race.code, "forward", "push");
}

function goToFullClass(clazz: ClazzDto) {
  fullClassStore.clazz = clazz;
  ionRouter.navigate("/guidebook/classes/" + clazz.code, "forward", "push");
}

function goToFullBackground(bg: BackgroundDto) {
  fullBackgroundStore.background = bg;
  ionRouter.navigate("/guidebook/backgrounds/" + bg.code, "forward", "push");
}

async function loadModalData() {
  if (!props.roomId) return;
  loading.value = true;
  try {
    const brt = props.baseRuleType;
    const rid = props.roomId;
    if (props.kind === "races") {
      const [catalog, room] = await Promise.all([
        getRacesForRoom(CATALOG_ROOM_ID, brt),
        getRacesForRoom(rid, brt),
      ]);
      catalogRaces.value = catalog;
      roomRaces.value = room;
    } else if (props.kind === "classes") {
      const [catalog, room] = await Promise.all([
        getClassesForRoom(CATALOG_ROOM_ID, brt),
        getClassesForRoom(rid, brt),
      ]);
      catalogClasses.value = catalog;
      roomClasses.value = room;
    } else {
      const [catalog, room] = await Promise.all([
        getBackgroundsForRoom(CATALOG_ROOM_ID, brt),
        getBackgroundsForRoom(rid, brt),
      ]);
      catalogBackgrounds.value = catalog;
      roomBackgrounds.value = room;
    }
  } catch (e) {
    console.error("Catalog / room list load failed:", e);
    if (props.kind === "races") {
      catalogRaces.value = [];
      roomRaces.value = [];
    } else if (props.kind === "classes") {
      catalogClasses.value = [];
      roomClasses.value = [];
    } else {
      catalogBackgrounds.value = [];
      roomBackgrounds.value = [];
    }
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.isOpen, props.kind, props.roomId, props.baseRuleType] as const,
  ([open]) => {
    if (!open) return;
    pendingCodes.value = new Set();
    void loadModalData();
  }
);

function closeModal() {
  emit("close");
}

async function onApply() {
  if (!props.roomId || pendingCodes.value.size === 0) {
    closeModal();
    return;
  }
  saving.value = true;
  try {
    if (props.kind === "races") {
      const list = catalogRaces.value.filter((r) => {
        const n = normCode(r.code);
        return n && pendingCodes.value.has(n);
      });
      const saved = await Promise.all(
        list.map((dto) => {
          const body = {...dto, roomId: props.roomId};
          return createRace(props.roomId, body);
        })
      );
      emit("applied", {kind: "races", saved});
    } else if (props.kind === "classes") {
      const list = catalogClasses.value.filter((c) => pendingCodes.value.has(normCode(c.code)));
      const saved = await Promise.all(
        list.map((dto) => {
          const body = {...dto, roomId: props.roomId};
          return createClass(props.roomId, body);
        })
      );
      emit("applied", {kind: "classes", saved});
    } else {
      const list = catalogBackgrounds.value.filter((b) => pendingCodes.value.has(normCode(b.code)));
      const saved = await Promise.all(
        list.map((dto) => {
          const body = {...dto, roomId: props.roomId};
          return createBackground(props.roomId, body);
        })
      );
      emit("applied", {kind: "backgrounds", saved});
    }
    closeModal();
  } catch (e) {
    console.error("Add from catalog failed:", e);
    alert("Не удалось добавить выбранные элементы. Проверьте соединение и попробуйте снова.");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <ion-modal :is-open="isOpen" @didDismiss="closeModal" class="catalog-modal">
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>{{ modalTitle }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="saving" @click="closeModal">Отмена</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content color="dark" class="ion-padding catalog-modal-content">
      <div v-if="loading" class="state-msg">Загрузка справочника и списка комнаты...</div>
      <template v-else-if="kind === 'races'">
        <ion-item v-if="addableRaceCodes.length" color="dark" lines="full">
          <ion-label>Выбрать все доступные</ion-label>
          <ion-checkbox
            slot="end"
            :indeterminate="isAddableSelectionIndeterminate"
            :checked="areAllAddableSelected"
            @ionChange="toggleAllAddable"
          />
        </ion-item>
        <ion-list v-if="raceGroups.length" class="catalog-list">
          <template v-for="group in raceGroups" :key="group.key">
            <ion-item v-if="group.root" :button="false" color="dark">
              <ion-checkbox
                v-if="group.root.code"
                slot="end"
                :disabled="inRoom(group.root.code)"
                :checked="inRoom(group.root.code) || isPending(group.root.code)"
                :indeterminate="!inRoom(group.root.code) && isRaceGroupIndeterminate(group)"
                @ionChange="() => !inRoom(group.root!.code) && toggleRaceGroup(group)"
              />
              <ion-avatar slot="start">
                <img :src="raceImg(group.root)" width="64" height="64" alt="" />
              </ion-avatar>
              <ion-icon
                :icon="chevronForwardOutline"
                slot="end"
                class="catalog-chevron"
                aria-hidden="true"
                @click.stop="goToFullRace(group.root)"
              />
              <ion-label>{{ group.root.name }}</ion-label>
            </ion-item>

            <ion-item v-else-if="group.subs.length" :button="false" color="dark">
              <ion-checkbox
                v-if="group.subs[0].code"
                slot="end"
                :disabled="inRoom(group.subs[0].code)"
                :checked="inRoom(group.subs[0].code) || isPending(group.subs[0].code)"
                :indeterminate="!inRoom(group.subs[0].code) && isRaceGroupIndeterminate(group)"
                @ionChange="() => !inRoom(group.subs[0].code) && toggleRaceGroup(group)"
              />
              <ion-avatar slot="start">
                <img :src="raceImg(group.subs[0])" width="64" height="64" alt="" />
              </ion-avatar>
              <ion-icon
                :icon="chevronForwardOutline"
                slot="end"
                class="catalog-chevron"
                aria-hidden="true"
                @click.stop="goToFullRace(group.subs[0])"
              />
              <ion-label>{{ group.subs[0].name }}</ion-label>
            </ion-item>

            <ion-item
              v-for="sub in group.root ? group.subs : group.subs.slice(1)"
              :key="(sub.code ?? '') + (sub.id ?? '')"
              :button="false"
              color="dark"
              class="group-sub-item"
            >
              <ion-checkbox
                v-if="sub.code"
                slot="end"
                :disabled="inRoom(sub.code)"
                :checked="inRoom(sub.code) || isPending(sub.code)"
                @ionChange="() => !inRoom(sub.code) && togglePending(sub.code)"
              />
              <ion-avatar slot="start">
                <img :src="raceImg(sub)" width="64" height="64" alt="" />
              </ion-avatar>
              <ion-icon
                :icon="chevronForwardOutline"
                slot="end"
                class="catalog-chevron"
                aria-hidden="true"
                @click.stop="goToFullRace(sub)"
              />
              <ion-label>{{ sub.name }}</ion-label>
            </ion-item>
          </template>
        </ion-list>
        <div v-else class="state-msg">В справочнике нет рас для этой системы правил.</div>
      </template>

      <template v-else-if="kind === 'classes'">
        <ion-item v-if="addableClassCodes.length" color="dark" lines="full">
          <ion-label>Выбрать все доступные</ion-label>
          <ion-checkbox
            slot="end"
            :indeterminate="isAddableSelectionIndeterminate"
            :checked="areAllAddableSelected"
            @ionChange="toggleAllAddable"
          />
        </ion-item>
        <ion-list v-if="classGroups.length" class="catalog-list">
          <template v-for="group in classGroups" :key="group.key">
            <ion-item v-if="group.root" :button="false" color="dark">
              <ion-checkbox
                slot="end"
                :disabled="inRoom(group.root.code)"
                :checked="inRoom(group.root.code) || isPending(group.root.code)"
                :indeterminate="!inRoom(group.root.code) && isClassGroupIndeterminate(group)"
                @ionChange="() => !inRoom(group.root.code) && toggleClassGroup(group)"
              />
              <ion-avatar slot="start">
                <img :src="classImg(group.root)" width="64" height="64" alt="" />
              </ion-avatar>
              <ion-icon
                :icon="chevronForwardOutline"
                slot="end"
                class="catalog-chevron"
                aria-hidden="true"
                @click.stop="goToFullClass(group.root)"
              />
              <ion-label>{{ group.root.name }}</ion-label>
            </ion-item>

            <ion-item v-else-if="group.subs.length" :button="false" color="dark">
              <ion-checkbox
                slot="end"
                :disabled="inRoom(group.subs[0].code)"
                :checked="inRoom(group.subs[0].code) || isPending(group.subs[0].code)"
                :indeterminate="!inRoom(group.subs[0].code) && isClassGroupIndeterminate(group)"
                @ionChange="() => !inRoom(group.subs[0].code) && toggleClassGroup(group)"
              />
              <ion-avatar slot="start">
                <img :src="classImg(group.subs[0])" width="64" height="64" alt="" />
              </ion-avatar>
              <ion-icon
                :icon="chevronForwardOutline"
                slot="end"
                class="catalog-chevron"
                aria-hidden="true"
                @click.stop="goToFullClass(group.subs[0])"
              />
              <ion-label>{{ group.subs[0].name }}</ion-label>
            </ion-item>

            <ion-item
              v-for="sub in group.root ? group.subs : group.subs.slice(1)"
              :key="sub.code + (sub.id ?? '')"
              :button="false"
              color="dark"
              class="group-sub-item"
            >
              <ion-checkbox
                slot="end"
                :disabled="inRoom(sub.code)"
                :checked="inRoom(sub.code) || isPending(sub.code)"
                @ionChange="() => !inRoom(sub.code) && togglePending(sub.code)"
              />
              <ion-avatar slot="start">
                <img :src="classImg(sub)" width="64" height="64" alt="" />
              </ion-avatar>
              <ion-icon
                :icon="chevronForwardOutline"
                slot="end"
                class="catalog-chevron"
                aria-hidden="true"
                @click.stop="goToFullClass(sub)"
              />
              <ion-label>{{ sub.name }}</ion-label>
            </ion-item>
          </template>
        </ion-list>
        <div v-else class="state-msg">В справочнике нет классов для этой системы правил.</div>
      </template>

      <template v-else>
        <ion-item v-if="addableBackgroundCodes.length" color="dark" lines="full">
          <ion-label>Выбрать все доступные</ion-label>
          <ion-checkbox
            slot="end"
            :indeterminate="isAddableSelectionIndeterminate"
            :checked="areAllAddableSelected"
            @ionChange="toggleAllAddable"
          />
        </ion-item>
        <ion-list v-if="catalogBackgrounds.length" class="catalog-list">
          <ion-item
            v-for="bg in catalogBackgrounds"
            :key="(bg.code ?? '') + (bg.id ?? '')"
            :button="false"
            color="dark"
          >
            <ion-checkbox
              v-if="normCode(bg.code)"
              slot="end"
              :disabled="inRoom(bg.code)"
              :checked="inRoom(bg.code) || isPending(bg.code)"
              @ionChange="() => !inRoom(bg.code) && togglePending(bg.code)"
            />
            <ion-avatar slot="start">
              <img :src="backgroundImg(bg)" width="64" height="64" alt="" />
            </ion-avatar>
            <ion-icon
              :icon="chevronForwardOutline"
              slot="end"
              class="catalog-chevron"
              aria-hidden="true"
              @click.stop="goToFullBackground(bg)"
            />
            <ion-label>{{ bg.name }}</ion-label>
          </ion-item>
        </ion-list>
        <div v-else class="state-msg">В справочнике нет предысторий для этой системы правил.</div>
      </template>
    </ion-content>
    <ion-footer class="ion-no-border">
      <ion-toolbar color="dark" class="catalog-footer">
        <ion-button expand="block" fill="outline" :disabled="saving" @click="closeModal">Отмена</ion-button>
        <ion-button
          expand="block"
          color="primary"
          :disabled="saving || pendingCodes.size === 0"
          @click="onApply"
        >
          {{ saving ? "Добавление..." : `Добавить (${pendingCodes.size})` }}
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
.catalog-modal-content {
  --padding-bottom: 100px;
}

.state-msg {
  padding: 24px 12px;
  text-align: center;
  color: var(--ion-color-medium);
}

.catalog-list {
  background: transparent;
  padding-bottom: 16px;
}

.group-sub-item {
  padding-left: 18px;
}

.catalog-chevron {
  margin-inline-end: 4px;
  font-size: 20px;
  color: var(--ion-color-medium);
  cursor: pointer;
}

.catalog-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px 12px max(12px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
}
</style>
