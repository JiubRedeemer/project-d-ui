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
                v-for="(skill, skillIndex) in filteredSkills"
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
  <ion-fab slot="fixed" vertical="bottom" horizontal="end" @click="onChooseSkills">
    <ion-fab-button color="primary">
      <ion-icon :icon="arrowForwardOutline" color="light"></ion-icon>
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import {IonFab, IonFabButton, IonIcon, IonSelect, IonList, IonItem, IonSelectOption} from "@ionic/vue";
import {arrowForwardOutline} from "ionicons/icons";
import {onMounted, ref, computed} from "vue";
import axios from "axios";
import {INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useRoute} from "vue-router";

const route = useRoute();

const props = defineProps({
  characterData: Object,
  currentStep: Object,
});

const skills = ref<Skill[]>([]);
const selectedSkills = ref<string[]>([]);
const maxSelectable = ref<number>(0);
const availableSkillCodes = ref<string[]>([]);

const filteredSkills = computed(() =>
    skills.value.filter(skill => availableSkillCodes.value.includes(skill.code))
);

const numberOfSelectors = computed(() => maxSelectable.value === -1 ? filteredSkills.value.length : maxSelectable.value);

onMounted(async () => {
  try {
    // Загружаем навыки класса
    const response = await axios.get(
        `${INTEGRATION_ROUTES.baseURL}${INTEGRATION_ROUTES.api}${INTEGRATION_ROUTES.rooms}/${route.params.roomId}${INTEGRATION_ROUTES.roomSkillsByClassCode}/${props.characterData.clazz.code}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
    );
    skills.value = response.data;

    // Получаем доступные навыки
    const availableSkills = props.characterData.clazz.stats.availableSkills.find(
        (item: any) => item.type === "ABILITY"
    );

    if (availableSkills) {
      maxSelectable.value = availableSkills.count;
      availableSkillCodes.value = availableSkills.of;
    }
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
  }
});

function onSkillChange(event: any, index: number) {
  const chosenSkill = event.detail.value;
  selectedSkills.value[index] = chosenSkill;
}

function onChooseSkills() {
  if (props.characterData) {
    // eslint-disable-next-line vue/no-mutating-props
    props.characterData.skills = selectedSkills.value.filter(skill => skill);
    console.log(props.characterData);
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
</style>
