<template>
  <div>
    <div class="wrapper">
      <div class="class-header">
        <div class="classSmallList">
          <swiper
              :modules="[IonicSlides]"
              :slides-per-view="6"
              space-between="5"
              @swiper="smallSwiperInstance = $event"
          >
            <swiper-slide v-for="(clazz, i) in classes"
                          :key="i"
                          :class="{ 'selected-slide': i === selectedIndex } "
                          @click="onSmallSlideClick(i)"
            >
              <img :src="`src/static/images/classes/image_${clazz.code}_M.png`" class="class-image"
                   alt="Изображение класса"/>
            </swiper-slide>
          </swiper>
        </div>
        <ion-button size="default" class="list-button" fill="clear" color="light">
          <ion-icon slot="icon-only" :ios="menuOutline" :md="menuOutline"></ion-icon>
        </ion-button>
      </div>
      <div class="classLargeList">
        <swiper
            :modules="[IonicSlides]"
            @slideChange="onLargeSlideChange"
            @swiper="largeSwiperInstance = $event"
        >
          <swiper-slide v-for="(clazz, i) in classes" :key="i" class="slide-content">
            <div class="class-container">
              <div class="image-wrapper">
                <img :src="`src/static/images/classes/image_${clazz.code}_M.png`" class="background-large-image"
                     alt="Изображение расы"/>
                <div class="class-overlay">
                  <p class="class-name">{{ clazz.name }}</p>
                </div>
              </div>
              <div class="abilities-container">
                <ion-chip v-for="(ability, i) in clazz.stats.savingThrowsAbilities" :key="i">
                  <ion-icon :icon="arrowUp" color="success"></ion-icon>
                  <ion-label>{{ ability.name }}</ion-label>
                </ion-chip>
                <ion-chip>
                  <ion-icon :icon="heart" color="danger"></ion-icon>
                  <ion-label>{{ clazz.stats.hpDice.substring(0, clazz.stats.hpDice.length-4) }}</ion-label>
                </ion-chip>
              </div>
              <div class="class-description">
                <p class="class-text">{{ clazz.description }}</p>
              </div>
            </div>
          </swiper-slide>
        </swiper>
      </div>
    </div>
  </div>
  <ion-fab slot="fixed" vertical="bottom" horizontal="end" @click="onChooseClass(classes[selectedIndex])">
    <ion-fab-button color="primary">
      <ion-icon :icon="arrowForwardOutline" color="light"></ion-icon>
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import {IonButton, IonChip, IonFab, IonFabButton, IonIcon, IonicSlides, IonLabel} from "@ionic/vue";
import {onMounted, ref} from "vue";
import {Swiper, SwiperSlide} from "swiper/vue";
import {arrowForwardOutline, arrowUp, heart, menuOutline} from "ionicons/icons";
import axios from "axios";
import {Swiper as SwiperType} from "swiper/types";
import {useRoute} from "vue-router";
import {INTEGRATION_ROUTES} from "@/config/integrationRoutes";

const route = useRoute()

const classes = ref<ClassResponse[]>([]);

const props = defineProps({
  characterData: Object,
  currentStep: Object,
});

onMounted(async () => {
  try {
    const response = await axios.get(
        INTEGRATION_ROUTES.baseURL + INTEGRATION_ROUTES.api + INTEGRATION_ROUTES.rooms + '/' + route.params.roomId + INTEGRATION_ROUTES.roomClasses,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
          },
        }
    );
    classes.value = response.data;
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

function onChooseClass(clazz: object) {
  if (props.characterData) {
    // eslint-disable-next-line vue/no-mutating-props
    props.characterData.clazz = clazz;
  }
  if (props.currentStep) {
    // eslint-disable-next-line vue/no-mutating-props
    props.currentStep.current = props.currentStep.current + 1
  }
}
</script>

<style scoped>
.class-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.classSmallList {
  width: 90%;
}

.list-button {
  background: transparent;
}

.classLargeList {
  padding-top: 3%;
  width: 100%;
}

.class-image {
  padding: 10%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  transition: transform 0.3s ease;
}

.selected-slide .class-image {
  transform: scale(1.2);
}

.class-container {
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

.class-overlay {
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


.class-name {
  font-size: 1.5rem; /* Increase font size for visibility */
  font-weight: bold;
  margin: 0; /* Reset margin */
}

.class-description {
  text-align: center;
  margin-top: 10px;
}

.class-text {
  font-size: 1rem;
  color: white;
  margin-top: 5px;
}

.class-text {
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

.abilities-container {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px; /* Между элементами можно добавить отступ */
}
</style>
