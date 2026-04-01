<template>
  <div>
    <div class="wrapper">
      <div class="race-header">
        <div class="raceSmallList">
          <swiper
              :modules="[IonicSlides]"
              :slides-per-view="6"
              space-between="5"
              @swiper="smallSwiperInstance = $event"
              @slideChange="onSmallSlideChange"
          >
            <swiper-slide v-show="racesLoaded" v-for="(group, i) in raceGroups"
                          :key="i"
                          :class="{ 'selected-slide': i === selectedGroupIndex }"
                          @click="onGroupClick(i)"
            >
              <img :src="getRaceImageUrl(getGroupPreviewRace(group)?.imgUrl)" class="race-image"
                   alt="Изображение расы" @error="onImageError"/>
            </swiper-slide>
            <swiper-slide v-show="!racesLoaded" v-for="i in racesPlaceholder" :key="i">
              <ion-thumbnail slot="start">
                <ion-skeleton-text style="border-radius: 50%" :animated="true"></ion-skeleton-text>
              </ion-thumbnail>
            </swiper-slide>
          </swiper>
        </div>
        <ion-button
            size="default"
            class="list-button"
            fill="clear"
            :color="hasSubraces ? 'primary' : 'light'"
            :disabled="!currentRaceOptions.length"
            @click="openSubraceList"
        >
          <ion-icon slot="icon-only" :ios="menuOutline" :md="menuOutline"></ion-icon>
        </ion-button>
      </div>
      <div class="raceLargeList" v-if="raceGroups.length">
        <swiper
            :modules="[IonicSlides]"
            @swiper="largeSwiperInstance = $event"
            @slideChange="onLargeSlideChange"
        >
          <swiper-slide v-for="(group, i) in raceGroups" :key="i">
            <div class="race-container" v-if="getSelectedRaceForGroup(i)">
              <div class="image-wrapper">
                <img :src="getRaceImageUrl(getSelectedRaceForGroup(i)?.imgUrl)" class="background-large-image"
                     alt="Изображение расы" @error="onImageError"/>
                <div class="race-overlay">
                  <p class="race-name">{{ getSelectedRaceForGroup(i)?.name }}</p>
                </div>
              </div>
              <div class="race-description">
                <p class="race-text">{{ getSelectedRaceForGroup(i)?.description }}</p>

                <div
                    v-if="(getSelectedRaceForGroup(i)?.stats?.traits?.length ?? 0) > 0"
                    class="race-traits"
                >
                  <p class="traits-title">Черты</p>

                  <div class="traits-list">
                    <div
                        v-for="trait in getTraitsOrdered(getSelectedRaceForGroup(i) ?? null) ?? []"
                        :key="trait.id"
                        class="trait-block"
                    >
                      <ion-chip size="small">
                        <ion-label>{{ trait.name }}</ion-label>
                      </ion-chip>
                      <p class="trait-description">{{ trait.description }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </swiper-slide>
        </swiper>
      </div>
    </div>
  </div>

  <div class="add-new-button">
    <ion-button
        size="large"
        shape="round"
        color="primary"
        @click="onChooseRace(selectedRace)"
    >
      <ion-icon slot="icon-only" :icon="arrowForwardOutline" />
    </ion-button>
  </div>
  <ion-action-sheet
      :is-open="isSubraceListOpen"
      header="Выберите подвид"
      :buttons="subraceActionButtons"
      @didDismiss="isSubraceListOpen = false"
  />
</template>

<script setup lang="ts">
import {
  IonActionSheet,
  IonButton,
  IonChip,
  IonIcon,
  IonicSlides,
  IonLabel,
  IonSkeletonText,
  IonThumbnail
} from "@ionic/vue";
import {computed, onMounted, ref} from "vue";
import {Swiper, SwiperSlide} from "swiper/vue";
import {arrowForwardOutline, menuOutline} from "ionicons/icons";
import {Swiper as SwiperType} from "swiper/types";
import {useRoute} from "vue-router";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {getRacesForRoom} from "@/api/rulebookApi";
import {useRoomStore} from "@/stores/RoomStore";

const route = useRoute();
const roomStore = useRoomStore();

const raceGroups = ref<RaceGroupResponse[]>([]);
const racesPlaceholder = ref([1, 2, 3, 4, 5, 6, 7, 8, 9]);
const racesLoaded = ref(false);
const selectedGroupIndex = ref(0);
const selectedRaceCode = ref<string | null>(null);
const selectedRaceCodesByGroup = ref<Record<number, string>>({});
const isSubraceListOpen = ref(false);
const smallSwiperInstance = ref<SwiperType | null>(null);
const largeSwiperInstance = ref<SwiperType | null>(null);

type RaceGroupResponse = {
  species?: RaceResponse | null;
  subspecies?: RaceResponse[] | null;
};

function isVisibleForPlayer(race: RaceResponse | null | undefined): boolean {
  return race != null && (race as RaceResponse & { hidden?: boolean }).hidden !== true;
}

function filterVisibleRaceGroups(groups: RaceGroupResponse[]): RaceGroupResponse[] {
  return groups
    .map((group) => {
      const species = isVisibleForPlayer(group.species) ? group.species : null;
      const subspecies = (group.subspecies ?? []).filter((race) => isVisibleForPlayer(race));
      return { species, subspecies };
    })
    .filter((group) => Boolean(group.species) || (group.subspecies?.length ?? 0) > 0);
}

function toRaceGroups(races: RaceResponse[]): RaceGroupResponse[] {
  const groupsByRootCode = new Map<string, { species: RaceResponse | null; subspecies: RaceResponse[] }>();
  const normalize = (value: string | null | undefined) => (value ?? "").trim();

  for (const race of races) {
    const code = normalize(race.code);
    const speciesCode = normalize((race as RaceResponse & { speciesCode?: string | null }).speciesCode);
    const imgUrl = normalize((race as RaceResponse & { imgUrl?: string | null }).imgUrl);
    const rootCode = speciesCode || code;
    if (!rootCode) continue;

    const isDeclaredRoot = speciesCode.length === 0 || speciesCode === code;
    const isSpeciesImageRoot = speciesCode.length > 0 && imgUrl === speciesCode;
    const isRoot = isDeclaredRoot || isSpeciesImageRoot;

    const group = groupsByRootCode.get(rootCode) ?? {species: null, subspecies: [] as RaceResponse[]};
    if (!groupsByRootCode.has(rootCode)) {
      groupsByRootCode.set(rootCode, group);
    }

    if (isRoot) {
      if (!group.species) {
        group.species = race;
      } else {
        group.subspecies.push(race);
      }
    } else {
      group.subspecies.push(race);
    }
  }

  const out: RaceGroupResponse[] = Array.from(groupsByRootCode.entries()).map(([_, value]) => ({
    species: value.species,
    subspecies: value.subspecies,
  }));

  for (const g of out) {
    g.subspecies = [...(g.subspecies ?? [])].sort((a, b) =>
      (a.name ?? a.code).localeCompare(b.name ?? b.code, "ru", {sensitivity: "base"})
    );
  }

  out.sort((a, b) => {
    const aLabel = a.species?.name ?? a.subspecies?.[0]?.name ?? "";
    const bLabel = b.species?.name ?? b.subspecies?.[0]?.name ?? "";
    return aLabel.localeCompare(bLabel, "ru", {sensitivity: "base"});
  });

  return out;
}

const props = defineProps({
  characterData: Object,
  currentStep: Object,
});

onMounted(async () => {
  try {
    const roomIdParam = route.params.roomId;
    const roomId = Array.isArray(roomIdParam) ? roomIdParam[0] : roomIdParam;
    if (!roomId) return;
    if (!roomStore.room?.id || roomStore.room.id !== roomId) {
      await roomStore.getRoomInfo(roomId);
    }
    const baseRuleType = roomStore.room?.baseRuleType ?? undefined;
    const races = await getRacesForRoom(roomId, baseRuleType);
    raceGroups.value = filterVisibleRaceGroups(toRaceGroups(races as unknown as RaceResponse[]));
    selectDefaultRaceForGroup(0);
    racesLoaded.value = true;
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
});

const currentGroup = computed(() => raceGroups.value[selectedGroupIndex.value]);
const currentRaceOptions = computed(() => {
  const group = currentGroup.value;
  if (!group) {
    return [];
  }
  return [group.species, ...(group.subspecies || [])].filter(Boolean) as RaceResponse[];
});
const selectedRace = computed(() =>
    currentRaceOptions.value.find((race) => race.code === selectedRaceCode.value) || currentRaceOptions.value[0]
);
const hasSubraces = computed(() => (currentGroup.value?.subspecies?.length || 0) > 0);
const subraceActionButtons = computed(() => [
  ...currentRaceOptions.value.map((race) => ({
    text: race.name,
    handler: () => onRaceOptionSelect(race.code),
  })),
  {
    text: "Отмена",
    role: "cancel",
  },
]);

function getTraitsOrdered(race: RaceResponse | null) {
  if(!race) return [];
  return race?.stats?.traits?.sort((a, b) => {
    if (a.description?.length && b.description?.length)
      return a.description.length - b.description.length;
    else if (a.description?.length && !b.description?.length) return 1;
    else if (!a.description?.length && b.description?.length) return -1;
    else return 0;
  });
}

function getGroupPreviewRace(group: RaceGroupResponse) {
  return (group.species || group.subspecies?.[0]) as RaceResponse | undefined;
}

function selectDefaultRaceForGroup(index: number) {
  const options = getRaceOptionsForGroup(index);
  if (!options.length) {
    selectedRaceCode.value = null;
    return;
  }
  if (!selectedRaceCodesByGroup.value[index]) {
    selectedRaceCodesByGroup.value[index] = options[0].code;
  }
  selectedRaceCode.value = selectedRaceCodesByGroup.value[index];
}

function getRaceOptionsForGroup(index: number): RaceResponse[] {
  const group = raceGroups.value[index];
  if (!group) {
    return [];
  }
  return [group.species, ...(group.subspecies || [])].filter(Boolean) as RaceResponse[];
}

function getSelectedRaceForGroup(index: number): RaceResponse | undefined {
  const options = getRaceOptionsForGroup(index);
  if (!options.length) {
    return undefined;
  }
  const selectedCode = selectedRaceCodesByGroup.value[index];
  return options.find((race) => race.code === selectedCode) || options[0];
}

function onGroupClick(index: number) {
  selectedGroupIndex.value = index;
  if (smallSwiperInstance.value) {
    smallSwiperInstance.value.slideTo(index, 300, true);
  }
  if (largeSwiperInstance.value) {
    largeSwiperInstance.value.slideTo(index, 300, true);
  }
  selectDefaultRaceForGroup(index);
}

function onRaceOptionSelect(raceCode: string) {
  selectedRaceCode.value = raceCode;
  selectedRaceCodesByGroup.value[selectedGroupIndex.value] = raceCode;
  isSubraceListOpen.value = false;
}

function onSmallSlideChange(swiper: SwiperType) {
  if (swiper.activeIndex !== selectedGroupIndex.value) {
    selectedGroupIndex.value = swiper.activeIndex;
    if (largeSwiperInstance.value) {
      largeSwiperInstance.value.slideTo(swiper.activeIndex, 300, true);
    }
    selectDefaultRaceForGroup(swiper.activeIndex);
  }
}

function onLargeSlideChange(swiper: SwiperType) {
  if (swiper.activeIndex !== selectedGroupIndex.value) {
    selectedGroupIndex.value = swiper.activeIndex;
    if (smallSwiperInstance.value) {
      smallSwiperInstance.value.slideTo(swiper.activeIndex, 300, true);
    }
    selectDefaultRaceForGroup(swiper.activeIndex);
  }
}

function openSubraceList() {
  if (!currentRaceOptions.value.length) {
    return;
  }
  isSubraceListOpen.value = true;
}

function onImageError(event: Event) {
  const target = event.target as HTMLImageElement;

  target.onerror = null;
  target.src =
      "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
}

const getRaceImageUrl = (imgUrl: string | undefined) => {
  return imgUrl != null
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.races_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
};

function onChooseRace(race?: RaceResponse) {
  if (props.characterData && race) {
    // eslint-disable-next-line vue/no-mutating-props
    props.characterData.race = race;
  }
  if (props.currentStep && race) {
    // eslint-disable-next-line vue/no-mutating-props
    props.currentStep.current = props.currentStep.current + 1;
  }
}
</script>

<style scoped>
.race-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.raceSmallList {
  width: 90%;
}

.list-button {
  background: transparent;
}

.subrace-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 8px;
}

.raceLargeList {
  padding-top: 3%;
  width: 100%;
}

.race-image {
  padding: 10%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  transition: transform 0.3s ease;
}

.selected-slide .race-image {
  transform: scale(1.2);
}

.race-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.image-wrapper {
  position: relative;
  width: 100%;
}

.background-large-image {
  width: 100%;
  height: auto;
  min-width: 90vw;
  max-width: 90vw;
  object-fit: cover;
  border-radius: 7%;
}

.race-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 100%);
  color: white;
  text-align: center;
  padding: 10px;
  border-radius: 0 0 7% 7%;
}

.race-name {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
}

.race-description {
  text-align: center;
  margin-top: 10px;
}

.add-new-button {
  z-index: 10;
  position: fixed;
  bottom: 0;
  right: 20px;
  width: 100%;
  display: flex;
  justify-content: end;
  align-items: center;
  padding: 8px 0 max(8px, env(safe-area-inset-bottom, 0));
}

.race-traits {
  margin-top: 12px;
  width: 100%;
}

.traits-title {
  font-size: 0.9rem;
  color: var(--ion-color-primary);
  margin: 0 0 6px 0;
}

.traits-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trait-block {
  width: 100%;
}

.trait-description {
  margin: 6px 0 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
  text-align: left;
}

.race-text {
  font-size: 1rem;
  color: white;
  margin-top: 5px;
}

swiper-slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 10vw;
  height: auto;
}

@media (min-width: 1024px) {
  .wrapper {
    max-width: 1240px;
    margin: 0 auto;
  }

  .race-header {
    gap: 12px;
    margin-bottom: 12px;
  }

  .raceSmallList {
    width: calc(100% - 52px);
  }

  .race-image {
    padding: 6px;
  }

  .raceLargeList {
    padding-top: 0;
  }

  .race-container {
    display: grid;
    grid-template-columns: minmax(360px, 460px) minmax(440px, 1fr);
    gap: 16px 20px;
    align-items: start;
  }

  .image-wrapper {
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
    background: var(--ion-color-medium);
  }

  .background-large-image {
    min-width: 0;
    max-width: 100%;
    width: 100%;
    height: auto;
    border-radius: 0;
    display: block;
  }

  .race-overlay {
    border-radius: 0;
    padding: 12px;
  }

  .race-name {
    font-size: 1.35rem;
  }

  .race-description {
    padding: 14px;
    border-radius: 12px;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
    background: rgba(var(--ion-color-medium-rgb), 0.22);
    min-height: 220px;
    margin-top: 0;
  }

  .race-traits {
    margin-top: 10px;
  }

  .race-text {
    margin-top: 0;
    line-height: 1.45;
    text-align: left;
  }

  swiper-slide {
    width: auto;
  }
}

.add-new-button {
  z-index: 10;
  position: fixed;
  bottom: 0;
  right: 20px;
  width: 100%;
  display: flex;
  justify-content: end;
  align-items: center;
  padding: 8px 0 max(8px, env(safe-area-inset-bottom, 0));
}
</style>
