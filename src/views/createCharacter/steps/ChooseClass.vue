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
            :color="hasSubclasses ? 'primary' : 'medium'"
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
              <div class="class-info">
                <div class="abilities-container">
                  <ion-chip v-for="(ability, i) in selectedClass.stats.savingThrowsAbilities" :key="i">
                    <ion-icon :icon="arrowUp" color="success"></ion-icon>
                    <ion-label>{{ ability.name }}</ion-label>
                  </ion-chip>
                  <ion-chip>
                    <ion-icon :icon="heart" color="danger"></ion-icon>
                    <ion-label>{{ hpDiceChipLabel(selectedClass.stats.hpDice) }}</ion-label>
                  </ion-chip>
                </div>
                <div class="class-description">
                  <p class="class-text">{{ selectedClass.description }}</p>
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
        @click="onChooseClass(selectedClass)"
    >
      <ion-icon slot="icon-only" :icon="arrowForwardOutline" />
    </ion-button>
  </div>
  <ion-action-sheet
      :is-open="isSubclassListOpen"
      header="Выберите подкласс"
      :buttons="subclassActionButtons"
      @didDismiss="isSubclassListOpen = false"
  />
</template>

<script setup lang="ts">
import {IonActionSheet, IonButton, IonChip, IonIcon, IonicSlides, IonLabel} from "@ionic/vue";
import {computed, onMounted, ref} from "vue";
import {Swiper, SwiperSlide} from "swiper/vue";
import {arrowForwardOutline, arrowUp, heart, menuOutline} from "ionicons/icons";
import {Swiper as SwiperType} from "swiper/types";
import {useRoute} from "vue-router";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {hpDiceChipLabel} from "@/utils/classHpDice";
import {getClassesForRoom} from "@/api/rulebookApi";
import {useRoomStore} from "@/stores/RoomStore";

const route = useRoute();
const roomStore = useRoomStore();

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

function isVisibleForPlayer(clazz: ClassResponse | null | undefined): boolean {
  return clazz != null && (clazz as ClassResponse & { hidden?: boolean }).hidden !== true;
}

function filterVisibleClassGroups(groups: ClassGroupResponse[]): ClassGroupResponse[] {
  return groups
    .map((group) => {
      const clazz = isVisibleForPlayer(group.clazz) ? group.clazz : null;
      const subClazzes = (group.subClazzes ?? []).filter((item) => isVisibleForPlayer(item));
      return { clazz, subClazzes };
    })
    .filter((group) => Boolean(group.clazz) || (group.subClazzes?.length ?? 0) > 0);
}

function toClassGroups(classes: ClassResponse[]): ClassGroupResponse[] {
  const groupsByRootCode = new Map<string, { clazz: ClassResponse | null; subClazzes: ClassResponse[] }>();
  const normalize = (value: string | null | undefined) => (value ?? "").trim();

  for (const clazz of classes) {
    const code = normalize(clazz.code);
    const groupCode = normalize((clazz as ClassResponse & { groupCode?: string | null }).groupCode);
    const hasParentClass = groupCode.length > 0 && groupCode !== code;
    const rootCode = hasParentClass ? groupCode : code;
    if (!rootCode) continue;

    const group = groupsByRootCode.get(rootCode) ?? {clazz: null, subClazzes: [] as ClassResponse[]};
    if (!groupsByRootCode.has(rootCode)) {
      groupsByRootCode.set(rootCode, group);
    }
    if (hasParentClass) {
      group.subClazzes.push(clazz);
    } else if (!group.clazz) {
      group.clazz = clazz;
    } else {
      group.subClazzes.push(clazz);
    }
  }

  const out: ClassGroupResponse[] = Array.from(groupsByRootCode.entries()).map(([_, value]) => ({
    clazz: value.clazz,
    subClazzes: value.subClazzes,
  }));

  for (const g of out) {
    g.subClazzes = [...(g.subClazzes ?? [])].sort((a, b) =>
      (a.name ?? a.code).localeCompare(b.name ?? b.code, "ru", {sensitivity: "base"})
    );
  }

  out.sort((a, b) => {
    const aLabel = a.clazz?.name ?? a.subClazzes?.[0]?.name ?? "";
    const bLabel = b.clazz?.name ?? b.subClazzes?.[0]?.name ?? "";
    return aLabel.localeCompare(bLabel, "ru", {sensitivity: "base"});
  });

  return out;
}

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
    const roomIdParam = route.params.roomId;
    const roomId = Array.isArray(roomIdParam) ? roomIdParam[0] : roomIdParam;
    if (!roomId) return;
    if (!roomStore.room?.id || roomStore.room.id !== roomId) {
      await roomStore.getRoomInfo(roomId);
    }
    const baseRuleType = roomStore.room?.baseRuleType ?? undefined;
    const classes = await getClassesForRoom(roomId, baseRuleType);
    classGroups.value = filterVisibleClassGroups(toClassGroups(classes as unknown as ClassResponse[]));
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

.class-info {
  width: 100%;
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

@media (min-width: 1024px) {
  .wrapper {
    max-width: 1240px;
    margin: 0 auto;
  }

  .class-header {
    gap: 12px;
    margin-bottom: 12px;
  }

  .classSmallList {
    width: calc(100% - 52px);
  }

  .class-image {
    padding: 6px;
  }

  .classLargeList {
    padding-top: 0;
  }

  .class-container {
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

  .class-overlay {
    border-radius: 0;
    padding: 12px;
  }

  .class-description {
    margin-top: 0;
    padding: 14px;
    border-radius: 12px;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
    background: rgba(var(--ion-color-medium-rgb), 0.22);
    min-height: 220px;
  }

  .class-text {
    margin-top: 0;
    line-height: 1.45;
    text-align: left;
  }

  .abilities-container {
    margin-top: 2px;
    flex-wrap: wrap;
  }

  .class-info {
    display: flex;
    flex-direction: column;
    gap: 10px;
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
