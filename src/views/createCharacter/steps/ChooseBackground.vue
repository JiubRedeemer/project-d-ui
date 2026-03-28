<template>
  <div>
    <div class="wrapper">
      <div class="background-header">
        <div class="backgroundSmallList">
          <swiper
              :modules="[IonicSlides]"
              :slides-per-view="6"
              space-between="5"
              @swiper="smallSwiperInstance = $event"
              @slideChange="onSmallSlideChange"
          >
            <swiper-slide
                v-for="(bg, i) in backgrounds"
                :key="slideKey(bg, i)"
                :class="{ 'selected-slide': i === selectedIndex }"
                @click="onBackgroundClick(i)"
            >
              <img :src="getBackgroundImageUrl(bg.imgUrl)" class="background-image"
                   alt="" @error="onImageError"/>
            </swiper-slide>
          </swiper>
        </div>
      </div>
      <div class="backgroundLargeList" v-if="selectedBackground">
        <swiper
            :modules="[IonicSlides]"
            @swiper="largeSwiperInstance = $event"
            @slideChange="onLargeSlideChange"
        >
          <swiper-slide v-for="(bg, i) in backgrounds" :key="slideKey(bg, i)">
            <div class="background-container">
              <div class="image-wrapper">
                <img :src="getBackgroundImageUrl(selectedBackground.imgUrl)" class="background-large-image"
                     alt="" @error="onImageError"/>
                <div class="background-overlay">
                  <p class="background-name">{{ selectedBackground.name }}</p>
                </div>
              </div>
              <div class="background-description">
                <p class="background-text">{{ selectedBackground.description }}</p>
              </div>
              <div v-if="selectedBackground.stats?.abilityModifiers?.length" class="abilities-modifiers-block">
                <p class="abilities-modifiers-title">Характеристики для модификаторов</p>
                <p class="abilities-modifiers-hint">+2 к одной и +1 к другой или +1 к трём разным</p>
                <ion-chip v-for="code in selectedBackground.stats.abilityModifiers" :key="code" size="small" color="primary">
                  <ion-label>{{ abilityCodeToName(code) }}</ion-label>
                </ion-chip>
              </div>
              <div v-if="selectedBackground.stats?.traits?.length" class="traits-block">
                <p class="traits-title">Черта</p>
                <div class="trait" v-for="(trait, ti) in selectedBackground.stats.traits" :key="trait.id ?? trait.code ?? ti">
                  <ion-chip>{{trait.name}}</ion-chip>
                  <p class="trait-description">
                    {{ trait.description}}
                  </p>
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
        @click="onChooseBackground(selectedBackground)"
    >
      <ion-icon slot="icon-only" :icon="arrowForwardOutline" />
    </ion-button>
  </div>
</template>

<script setup lang="ts">
import {IonButton, IonChip, IonIcon, IonicSlides, IonLabel} from "@ionic/vue";
import {computed, nextTick, onMounted, ref, watch} from "vue";
import {Swiper, SwiperSlide} from "swiper/vue";
import {arrowForwardOutline} from "ionicons/icons";
import {Swiper as SwiperType} from "swiper/types";
import {useRoute} from "vue-router";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import type {BackgroundDto} from "@/api/rulebookApi.types";
import {getBackgroundsForRoom} from "@/api/rulebookApi";
import {useRoomStore} from "@/stores/RoomStore";

const route = useRoute();
const roomStore = useRoomStore();

const backgrounds = ref<BackgroundDto[]>([]);
const selectedIndex = ref(0);
const smallSwiperInstance = ref<SwiperType | null>(null);
const largeSwiperInstance = ref<SwiperType | null>(null);

const BACKGROUND_PLACEHOLDER =
    "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";

const props = defineProps<{
  characterData: Record<string, unknown>;
  currentStep: { current: number };
}>();

function slideKey(bg: BackgroundDto, i: number) {
  const c = bg.code ?? "";
  const id = bg.id ?? "";
  return c + id + i;
}

/** Как в MasterGuidebookView: bucket предысторий, не other_bucket */
function getBackgroundImageUrl(imgUrl: string | undefined | null): string {
  if (!imgUrl) return BACKGROUND_PLACEHOLDER;
  if (imgUrl.startsWith("http://") || imgUrl.startsWith("https://")) return imgUrl;
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.backgrounds_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
}

function onImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  target.onerror = null;
  target.src = BACKGROUND_PLACEHOLDER;
}

function savedBackgroundCode(): string | undefined {
  const bg = props.characterData?.background as {code?: string} | null | undefined;
  return bg?.code?.trim() || undefined;
}

function applySelectionFromCharacterData() {
  const code = savedBackgroundCode();
  if (!code || !backgrounds.value.length) return;
  const idx = backgrounds.value.findIndex((b) => (b.code ?? "").trim() === code);
  if (idx < 0) return;
  selectedIndex.value = idx;
  void nextTick(() => {
    smallSwiperInstance.value?.slideTo(idx, 0, false);
    largeSwiperInstance.value?.slideTo(idx, 0, false);
  });
}

async function loadBackgrounds() {
  const roomIdParam = route.params.roomId;
  const roomId = Array.isArray(roomIdParam) ? roomIdParam[0] : roomIdParam;
  if (!roomId) {
    backgrounds.value = [];
    return;
  }
  try {
    if (!roomStore.room?.id || roomStore.room.id !== roomId) {
      await roomStore.getRoomInfo(roomId);
    }
    const baseRuleType = roomStore.room?.baseRuleType ?? undefined;
    backgrounds.value = await getBackgroundsForRoom(roomId, baseRuleType);
    if (backgrounds.value.length && selectedIndex.value >= backgrounds.value.length) {
      selectedIndex.value = 0;
    }
    applySelectionFromCharacterData();
  } catch (error) {
    console.error("Ошибка при получении предысторий:", error);
    backgrounds.value = [];
  }
}

onMounted(() => {
  void loadBackgrounds();
});

watch(
    () => props.characterData?.background,
    () => applySelectionFromCharacterData(),
    {deep: true}
);

watch(backgrounds, () => applySelectionFromCharacterData(), {flush: "post"});

const selectedBackground = computed(() => backgrounds.value[selectedIndex.value] ?? null);

const ABILITY_CODE_NAMES: Record<string, string> = {
  STR: "Сила",
  DEX: "Ловкость",
  CON: "Телосложение",
  INT: "Интеллект",
  WIS: "Мудрость",
  CHA: "Харизма",
};

function abilityCodeToName(code: string): string {
  return ABILITY_CODE_NAMES[code] ?? code;
}

function onBackgroundClick(index: number) {
  selectedIndex.value = index;
  if (smallSwiperInstance.value) {
    smallSwiperInstance.value.slideTo(index, 300, true);
  }
  if (largeSwiperInstance.value) {
    largeSwiperInstance.value.slideTo(index, 300, true);
  }
}

function onSmallSlideChange(swiper: SwiperType) {
  if (swiper.activeIndex !== selectedIndex.value) {
    selectedIndex.value = swiper.activeIndex;
    if (largeSwiperInstance.value) {
      largeSwiperInstance.value.slideTo(swiper.activeIndex, 300, true);
    }
  }
}

function onLargeSlideChange(swiper: SwiperType) {
  if (swiper.activeIndex !== selectedIndex.value) {
    selectedIndex.value = swiper.activeIndex;
    if (smallSwiperInstance.value) {
      smallSwiperInstance.value.slideTo(swiper.activeIndex, 300, true);
    }
  }
}

function onChooseBackground(bg: BackgroundDto | null) {
  if (bg && props.characterData) {
    (props.characterData as Record<string, unknown>).background = bg;
  }
  if (props.currentStep && bg) {
    props.currentStep.current = props.currentStep.current + 1;
  }
}
</script>

<style scoped>
.background-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.backgroundSmallList {
  width: 90%;
}

.backgroundLargeList {
  padding-top: 3%;
  width: 100%;
}

.background-image {
  padding: 10%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  transition: transform 0.3s ease;
}

.selected-slide .background-image {
  transform: scale(1.2);
}

.background-container {
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

.background-overlay {
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

.background-name {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
}

.background-description {
  text-align: center;
  margin-top: 10px;
}

.background-text {
  font-size: 1rem;
  color: white;
  margin-top: 5px;
}

.abilities-modifiers-block {
  margin-top: 12px;
  width: 100%;
}

.abilities-modifiers-title {
  font-size: 0.9rem;
  color: var(--ion-color-secondary);
  margin: 0 0 2px 0;
}

.abilities-modifiers-hint {
  font-size: 0.8rem;
  color: var(--ion-color-secondary);
  margin: 0 0 6px 0;
}

.abilities-modifiers-block ion-chip {
  margin: 2px 4px 2px 0;
}

.traits-block {
  margin-top: 12px;
  width: 100%;
}

.traits-title {
  font-size: 0.9rem;
  color: var(--ion-color-secondary);
  margin-bottom: 6px;
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

  .background-header {
    margin-bottom: 12px;
  }

  .backgroundSmallList {
    width: 100%;
  }

  .background-image {
    padding: 6px;
  }

  .backgroundLargeList {
    padding-top: 0;
  }

  .background-container {
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
    width: 100%;
    border-radius: 0;
    display: block;
  }

  .background-overlay {
    border-radius: 0;
    padding: 12px;
  }

  .background-description,
  .abilities-modifiers-block,
  .traits-block {
    margin-top: 0;
    padding: 14px;
    border-radius: 12px;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
    background: rgba(var(--ion-color-medium-rgb), 0.22);
    text-align: left;
  }

  .background-text {
    margin-top: 0;
    line-height: 1.45;
  }

  .abilities-modifiers-block {
    margin-top: 10px;
  }

  .traits-block {
    margin-top: 10px;
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
