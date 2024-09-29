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
          >
            <swiper-slide v-show="racesLoaded" v-for="(race, i) in races"
                          :key="i"
                          :class="{ 'selected-slide': i === selectedIndex } "
                          @click="onSmallSlideClick(i)"
            >
              <img :src="`src/static/images/races/image_${race.code}_M.png`" class="race-image"
                   alt="Изображение расы"/>
            </swiper-slide>
            <swiper-slide v-show="!racesLoaded" v-for="(i) in racesPlaceholder"
                          :key="i"
            >
              <ion-thumbnail slot="start">
                <ion-skeleton-text style="border-radius: 50%" :animated="true"></ion-skeleton-text>
              </ion-thumbnail>
            </swiper-slide>
          </swiper>
        </div>
        <ion-button size="default" class="list-button" fill="clear" color="light">
          <ion-icon slot="icon-only" :ios="menuOutline" :md="menuOutline"></ion-icon>
        </ion-button>
      </div>
      <div class="raceLargeList">
        <swiper
            :modules="[IonicSlides]"
            @slideChange="onLargeSlideChange"
            @swiper="largeSwiperInstance = $event"
        >
          <swiper-slide v-show="racesLoaded" v-for="(race, i) in races" :key="i" class="slide-content">
            <div class="race-container">
              <div class="image-wrapper">
                <img :src="`src/static/images/races/image_${race.code}_M.png`" class="background-large-image"
                     alt="Изображение расы"/>
                <div class="race-overlay">
                  <p class="race-name">{{ race.name }}</p>
                </div>
              </div>
              <div class="race-description">
                <p class="race-text">{{ race.description }}</p>
              </div>
            </div>
          </swiper-slide>
        </swiper>
      </div>
    </div>
  </div>
  <ion-fab slot="fixed" vertical="bottom" horizontal="end" @click="onChooseRace(races[selectedIndex])">
    <ion-fab-button color="primary">
      <ion-icon :icon="arrowForwardOutline" color="light"></ion-icon>
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import {IonButton, IonFab, IonFabButton, IonIcon, IonicSlides, IonSkeletonText, IonThumbnail} from "@ionic/vue";
import {onMounted, ref} from "vue";
import {Swiper, SwiperSlide} from "swiper/vue";
import {arrowForwardOutline, menuOutline} from "ionicons/icons";
import axios from "axios";
import {Swiper as SwiperType} from "swiper/types";

const races = ref([]);
const racesPlaceholder = ref([1, 2, 3, 4, 5, 6, 7, 8, 9]);
let racesLoaded = false;

const props = defineProps({
  characterData: Object,
  currentStep: Object,
});

onMounted(async () => {
  try {
    const response = await axios.get(
        "http://localhost:8080/api/rooms/6af594d0-8d7f-4981-9181-d69246421bb3/races/named",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
          },
        }
    );
    races.value = response.data;
    racesLoaded = true;
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
});

const selectedIndex = ref(0);
const smallSwiperInstance = ref<SwiperType | null>(null);
const largeSwiperInstance = ref<SwiperType | null>(null);

function onLargeSlideChange(swiper: SwiperType) {
  selectedIndex.value = swiper.activeIndex;
  if (smallSwiperInstance.value) {
    smallSwiperInstance.value.slideTo(selectedIndex.value, 300, true);
  }
}

function onSmallSlideClick(index: number) {
  selectedIndex.value = index;
  if (largeSwiperInstance.value) {
    largeSwiperInstance.value.slideTo(index, 300, true);
  }
}

function onChooseRace(race: object) {
  if (props.characterData) {
    // eslint-disable-next-line vue/no-mutating-props
    props.characterData.race = race;
  }
  if (props.currentStep) {
    // eslint-disable-next-line vue/no-mutating-props
    props.currentStep.current = props.currentStep.current + 1
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
  position: relative; /* Positioning context for the overlay */
  width: 100%; /* Ensure it takes the full width of the container */
}

.background-large-image {
  width: 100%;
  height: auto;
  object-fit: cover;
  border-radius: 7%;
}

.race-overlay {
  position: absolute; /* Position absolutely within the image wrapper */
  bottom: 0; /* Align to the bottom */
  left: 0;
  right: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 100%); /* Gradient overlay */
  color: white; /* Text color */
  text-align: center; /* Center text */
  padding: 10px; /* Padding for the text */
  border-radius: 0 0 7% 7%; /* Match border radius of the image */
}


.race-name {
  font-size: 1.5rem; /* Increase font size for visibility */
  font-weight: bold;
  margin: 0; /* Reset margin */
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
