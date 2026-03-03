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
              </div>
            </div>
          </swiper-slide>
        </swiper>
      </div>
    </div>
  </div>
  <ion-fab slot="fixed" vertical="bottom" horizontal="end" @click="onChooseRace(selectedRace)">
    <ion-fab-button color="primary">
      <ion-icon :icon="arrowForwardOutline" color="dark"></ion-icon>
    </ion-fab-button>
  </ion-fab>
  <ion-action-sheet
      :is-open="isSubraceListOpen"
      header="Выберите подвид"
      :buttons="subraceActionButtons"
      @didDismiss="isSubraceListOpen = false"
  />
</template>

<script setup lang="ts">
import {IonActionSheet, IonButton, IonChip, IonFab, IonFabButton, IonIcon, IonicSlides, IonLabel, IonSkeletonText, IonThumbnail} from "@ionic/vue";
import {computed, onMounted, ref} from "vue";
import {Swiper, SwiperSlide} from "swiper/vue";
import {arrowForwardOutline, menuOutline} from "ionicons/icons";
import axios from "axios";
import {Swiper as SwiperType} from "swiper/types";
import {useRoute} from "vue-router";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

const route = useRoute();

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

const props = defineProps({
  characterData: Object,
  currentStep: Object,
});

onMounted(async () => {
  try {
    const response = await axios.get(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.roomRacesGrouped}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
          },
        }
    );
    raceGroups.value = (response.data || []) as RaceGroupResponse[];
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
</style>
