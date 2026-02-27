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
              @slideChange="onSmallSlideChange"
          >
            <swiper-slide v-for="(group, i) in classGroups"
                          :key="i"
                          :class="{ 'selected-slide': i === selectedGroupIndex }"
                          @click="onGroupClick(i)"
            >
              <img :src="getClassImageUrl(getGroupPreviewClass(group)?.imgUrl)" class="class-image"
                   alt="Изображение класса" @error="onImageError"/>
            </swiper-slide>
          </swiper>
        </div>
        <ion-button
            size="default"
            class="list-button"
            fill="clear"
            :color="hasSubclasses ? 'primary' : 'light'"
            :disabled="!currentClassOptions.length"
            @click="openSubclassList"
        >
          <ion-icon slot="icon-only" :ios="menuOutline" :md="menuOutline"></ion-icon>
        </ion-button>
      </div>
      <div class="classLargeList" v-if="selectedClass">
        <swiper
            :modules="[IonicSlides]"
            @swiper="largeSwiperInstance = $event"
            @slideChange="onLargeSlideChange"
        >
          <swiper-slide v-for="(group, i) in classGroups" :key="i">
            <div class="class-container">
              <div class="image-wrapper">
                <img :src="getClassImageUrl(selectedClass.imgUrl)" class="background-large-image"
                     alt="Изображение класса"
                     @error="onImageError"/>
                <div class="class-overlay">
                  <p class="class-name">{{ selectedClass.name }}</p>
                </div>
              </div>
              <div class="abilities-container">
                <ion-chip v-for="(ability, i) in selectedClass.stats.savingThrowsAbilities" :key="i">
                  <ion-icon :icon="arrowUp" color="success"></ion-icon>
                  <ion-label>{{ ability.name }}</ion-label>
                </ion-chip>
                <ion-chip>
                  <ion-icon :icon="heart" color="danger"></ion-icon>
                  <ion-label>{{
                      selectedClass.stats.hpDice.substring(0, selectedClass.stats.hpDice.length - 4)
                    }}
                  </ion-label>
                </ion-chip>
              </div>
              <div class="class-description">
                <p class="class-text">{{ selectedClass.description }}</p>
              </div>
            </div>
          </swiper-slide>
        </swiper>
      </div>
    </div>
  </div>
  <ion-fab slot="fixed" vertical="bottom" horizontal="end" @click="onChooseClass(selectedClass)">
    <ion-fab-button color="primary">
      <ion-icon :icon="arrowForwardOutline" color="dark"></ion-icon>
    </ion-fab-button>
  </ion-fab>
  <ion-action-sheet
      :is-open="isSubclassListOpen"
      header="Выберите подкласс"
      :buttons="subclassActionButtons"
      @didDismiss="isSubclassListOpen = false"
  />
</template>

<script setup lang="ts">
import {IonActionSheet, IonButton, IonChip, IonFab, IonFabButton, IonIcon, IonicSlides, IonLabel} from "@ionic/vue";
import {computed, onMounted, ref} from "vue";
import {Swiper, SwiperSlide} from "swiper/vue";
import {arrowForwardOutline, arrowUp, heart, menuOutline} from "ionicons/icons";
import axios from "axios";
import {Swiper as SwiperType} from "swiper/types";
import {useRoute} from "vue-router";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

const route = useRoute();

const classGroups = ref<ClassGroupResponse[]>([]);
const selectedGroupIndex = ref(0);
const selectedClassCode = ref<string | null>(null);
const isSubclassListOpen = ref(false);
const smallSwiperInstance = ref<SwiperType | null>(null);
const largeSwiperInstance = ref<SwiperType | null>(null);

type ClassGroupResponse = {
  clazz?: ClassResponse | null;
  subClazzes?: ClassResponse[] | null;
};

const props = defineProps({
  characterData: Object,
  currentStep: Object,
});

const getClassImageUrl = (imgUrl: string | undefined) => {
  return imgUrl != null
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.classes_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
};

function onImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  target.onerror = null;
  target.src =
      "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";
}

onMounted(async () => {
  try {
    const response = await axios.get(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.roomClassesGrouped}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
          },
        }
    );

    classGroups.value = (response.data || []) as ClassGroupResponse[];
    selectDefaultClassForGroup(0);
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
});

const currentGroup = computed(() => classGroups.value[selectedGroupIndex.value]);
const currentClassOptions = computed(() => {
  const group = currentGroup.value;
  if (!group) {
    return [];
  }
  return [group.clazz, ...(group.subClazzes || [])].filter(Boolean) as ClassResponse[];
});
const selectedClass = computed(() =>
    currentClassOptions.value.find((clazz) => clazz.code === selectedClassCode.value) || currentClassOptions.value[0]
);
const hasSubclasses = computed(() => (currentGroup.value?.subClazzes?.length || 0) > 0);
const subclassActionButtons = computed(() => [
  ...currentClassOptions.value.map((clazz) => ({
    text: clazz.name,
    handler: () => onClassOptionSelect(clazz.code),
  })),
  {
    text: "Отмена",
    role: "cancel",
  },
]);

function getGroupPreviewClass(group: ClassGroupResponse) {
  return (group.clazz || group.subClazzes?.[0]) as ClassResponse | undefined;
}

function selectDefaultClassForGroup(index: number) {
  const group = classGroups.value[index];
  if (!group) {
    selectedClassCode.value = null;
    return;
  }
  selectedClassCode.value = group.clazz?.code || group.subClazzes?.[0]?.code || null;
}

function onGroupClick(index: number) {
  selectedGroupIndex.value = index;
  if (smallSwiperInstance.value) {
    smallSwiperInstance.value.slideTo(index, 300, true);
  }
  selectDefaultClassForGroup(index);
}

function onClassOptionSelect(classCode: string) {
  selectedClassCode.value = classCode;
  isSubclassListOpen.value = false;
}


function onSmallSlideChange(swiper: SwiperType) {
  if (swiper.activeIndex !== selectedGroupIndex.value) {
    selectedGroupIndex.value = swiper.activeIndex;
    if (largeSwiperInstance.value) {
      largeSwiperInstance.value.slideTo(swiper.activeIndex, 300, true);
    }
    selectDefaultClassForGroup(swiper.activeIndex);
  }
}

function onLargeSlideChange(swiper: SwiperType) {
  if (swiper.activeIndex !== selectedGroupIndex.value) {
    selectedGroupIndex.value = swiper.activeIndex;
    if (smallSwiperInstance.value) {
      smallSwiperInstance.value.slideTo(swiper.activeIndex, 300, true);
    }
    selectDefaultClassForGroup(swiper.activeIndex);
  }
}

function openSubclassList() {
  if (!currentClassOptions.value.length) {
    return;
  }
  isSubclassListOpen.value = true;
}

function onChooseClass(clazz?: ClassResponse) {
  if (props.characterData && clazz) {
    // eslint-disable-next-line vue/no-mutating-props
    props.characterData.clazz = clazz;
  }
  if (props.currentStep && clazz) {
    // eslint-disable-next-line vue/no-mutating-props
    props.currentStep.current = props.currentStep.current + 1;
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

.subclass-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 8px;
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
  position: relative;
  width: 100%;
}

.background-large-image {
  width: 100%;
  height: auto;
  object-fit: cover;
  border-radius: 7%;
}

.class-overlay {
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

.class-name {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
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
  gap: 8px;
}
</style>
