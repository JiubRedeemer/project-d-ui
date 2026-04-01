<template>
  <div>
    <div class="wrapper">
      <ion-list style="background: transparent">
        <ion-item color="dark" v-for="index in numberOfSelectors" :key="index">
          <ion-select
              style="width: 100%;"
              justify="start"
              aria-label="Навыки"
              interface="action-sheet"
              placeholder="Выберите навык"
              :value="selectedSkills[index - 1]"
              @ionChange="event => onSkillChange(event, index - 1)"
              :disabled="skills.length === 0"
          >
            <ion-select-option
                v-for="(skill, skillIndex) in skills"
                :key="skillIndex"
                :value="skill.code">
              {{ skill.name }}
            </ion-select-option>
          </ion-select>
          <div style="margin-left: auto;">+1</div>
        </ion-item>
      </ion-list>
    </div>
  </div>

  <div class="add-new-button">
    <ion-button
        size="large"
        shape="round"
        color="primary"
        @click="onChooseSkills"
    >
      <ion-icon slot="icon-only" :icon="arrowForwardOutline" />
    </ion-button>
  </div>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  useIonRouter
} from "@ionic/vue";
import {arrowForwardOutline, checkmarkOutline} from "ionicons/icons";
import {computed, ref, watch} from "vue";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";

const route = useRoute();
const ionRouter = useIonRouter();

const props = defineProps({
  characterData: Object,
  currentStep: Object,
});

const skills = ref<SkillResponse[]>([]);
const selectedSkills = ref<string[]>([]);
const maxSelectable = ref<number>(0);
const availableSkillCodes = ref<string[]>([]);


const numberOfSelectors = computed(() => maxSelectable.value === -1 ? skills.value.length : maxSelectable.value);

async function fetchClassSkills() {
  try {
    // Загружаем навыки класса
    const response = await axios.get(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.roomSkillsByClassCode}/${props!.characterData!.clazz.code}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`,
          },
        }
    );
    skills.value = response.data;

    // Получаем доступные навыки
    const availableSkills = props?.characterData?.clazz.stats.availableSkills.find(
        (item: any) => item.type === "ABILITY"
    );

    if (availableSkills) {
      maxSelectable.value = availableSkills.count;
      availableSkillCodes.value = availableSkills.of;
    }
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
}

watch(() => props.characterData?.clazz?.code, () => {
  if (props.characterData != undefined && props.characterData.clazz != null) {
    fetchClassSkills();
  }
}, {immediate: false});

function onSkillChange(event: any, index: number) {
  selectedSkills.value[index] = event.detail.value;
}

function onChooseSkills() {
  if (props.characterData) {
    // eslint-disable-next-line vue/no-mutating-props
    props.characterData.skills = selectedSkills.value.filter(skill => skill);
  }
  if (props.currentStep) {
    // eslint-disable-next-line vue/no-mutating-props
    props.currentStep.current = props.currentStep.current + 1;
  }
}
</script>

<style scoped>
.wrapper {
  display: flex;
  flex-direction: column;
}

ion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

ion-select {
  flex-grow: 1;
  margin-right: 10px;
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
