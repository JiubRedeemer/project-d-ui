<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonicSlides,
  IonPage,
  IonSkeletonText,
  IonThumbnail
} from "@ionic/vue";
import {onMounted, ref} from "vue";
import 'swiper/css';
import '@ionic/vue/css/ionic-swiper.css';
import CreateCharacterHeader from "@/views/createCharacter/CreateCharacterHeader.vue";
import {Swiper, SwiperSlide} from 'swiper/vue';
import {Swiper as SwiperType} from 'swiper/types';
import {arrowForwardOutline, menuOutline} from "ionicons/icons";
import axios from 'axios';

const races = ref([]);
const racesPlaceholder = ref([1, 2, 3, 4, 5, 6, 7, 8, 9]);
var racesLoaded = false;
onMounted(async () => {
  try {
    const response = await axios.get('http://localhost:8080/api/rooms/6af594d0-8d7f-4981-9181-d69246421bb3/races/named', {
      headers: {
        'Content-Type': 'application/json',
        "Authorization": "Bearer " + localStorage.getItem("accessToken")
      }
    });
    races.value = response.data;
    racesLoaded = true;
  } catch (error) {
    console.error('Ошибка при получении данных:', error);
  }
});


// Управление шагами
const step = ref(1);
const stepsCount = 10; // Всего шагов

function nextStep() {
  if (step.value < stepsCount - 1) step.value++;
}

function previousStep() {
  if (step.value > 0) step.value--;
}

// Состояние для выбранного слайда
const selectedIndex = ref(0);

// Получение экземпляров Swiper
const smallSwiperInstance = ref<SwiperType | null>(null);
const largeSwiperInstance = ref<SwiperType | null>(null);

// Обработчик выбора слайда в большом слайдере
function onLargeSlideChange(swiper) {
  selectedIndex.value = swiper.activeIndex;
  // Прокрутка маленького слайдера
  if (smallSwiperInstance.value) {
    smallSwiperInstance.value.slideTo(selectedIndex.value, 300, true);
  }
}

// Обработчик выбора слайда в маленьком слайдере
function onSmallSlideClick(index) {
  selectedIndex.value = index;
  // Прокрутка большого слайдера
  if (largeSwiperInstance.value) {
    largeSwiperInstance.value.slideTo(index, 300, true);
  }
}
</script>

<template>
  <ion-page>
    <ion-content class="ion-padding" color="dark">
      <div v-show="step == 1">
        <div class="header-block">
          <CreateCharacterHeader header-text="Раса" :step="step" :stepsCount="stepsCount"/>
        </div>
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
                  <img :src="`src/static/images/races/image_${race.code}_M.png`" class="race-large-image"
                       alt="Изображение расы"/>
                  <div class="race-description">
                    <p class="race-name">{{ race.name }}</p>
                    <p class="race-text">{{ race.description }}</p>
                  </div>
                </div>
              </swiper-slide>
            </swiper>
          </div>
        </div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button color="primary">
          <ion-icon :icon="arrowForwardOutline" color="light"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

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

.header-block {
  padding-bottom: 3%;
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

.race-large-image {
  width: 100%;
  height: auto;
  object-fit: cover;
  border-radius: 7%;
}

.race-container {
  display: flex;
  flex-direction: column;
  align-items: center; /* Выравнивание изображения и текста по центру */
  justify-content: center;
}

.race-description {
  text-align: center;
  margin-top: 10px;
}

.race-name {
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
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
