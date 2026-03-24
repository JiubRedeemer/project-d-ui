<script setup lang="ts">
import {IonContent, IonPage, useIonRouter} from "@ionic/vue";
import ChooseRace from "./steps/ChooseRace.vue";
import {computed, onMounted, ref, watch} from "vue";
import CreateCharacterHeader from "@/views/createCharacter/CreateCharacterHeader.vue";
import ChooseName from "@/views/createCharacter/steps/ChooseName.vue";
import {HEADERS} from "@/config/localisations";
import ChooseAge from "@/views/createCharacter/steps/ChooseAge.vue";
import ChooseHeight from "@/views/createCharacter/steps/ChooseHeight.vue";
import ChooseWeight from "@/views/createCharacter/steps/ChooseWeight.vue";
import ChooseHistory from "@/views/createCharacter/steps/ChooseHistory.vue";
import ChoosePersonality from "@/views/createCharacter/steps/ChoosePersonality.vue";
import ChooseAttachments from "@/views/createCharacter/steps/ChooseAttachments.vue";
import ChooseWeaknesses from "@/views/createCharacter/steps/ChooseWeaknesses.vue";
import ChooseRelationships from "@/views/createCharacter/steps/ChooseRelationships.vue";
import ChooseIdeals from "@/views/createCharacter/steps/ChooseIdeals.vue";
import ChooseClass from "@/views/createCharacter/steps/ChooseClass.vue";
import ChooseAbilities from "@/views/createCharacter/steps/ChooseAbilities.vue";
import ChooseSkills from "@/views/createCharacter/steps/ChooseSkills.vue";
import ChooseBackground from "@/views/createCharacter/steps/ChooseBackground.vue";
import {useRoute} from "vue-router";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

const route = useRoute();
const ionRouter = useIonRouter();

/** D&D 2024: room has backgrounds from Rulebook API → show background selection step */
const hasDnd2024Backgrounds = ref(false);

const baseStepNames = [
  HEADERS.race.rus,
  HEADERS.name.rus,
  HEADERS.age.rus,
  HEADERS.height.rus,
  HEADERS.weight.rus,
  HEADERS.background.rus,
  HEADERS.traits.rus,
  HEADERS.ideals.rus,
  HEADERS.bonds.rus,
  HEADERS.flaws.rus,
  HEADERS.relationships.rus,
  HEADERS.class.rus,
  HEADERS.characteristics.rus,
  HEADERS.abilities.rus,
];

const stepNames = computed(() =>
  hasDnd2024Backgrounds.value
    ? [
        ...baseStepNames.slice(0, 5),
        HEADERS.background.rus,
        ...baseStepNames.slice(5),
      ]
    : baseStepNames
);

const step = ref({
  current: 0,
  names: baseStepNames,
});

// Данные персонажа
const characterData = ref({
  race: {},
  name: "",
  age: null,
  height: null,
  weight: null,
  background: null as Record<string, unknown> | null,
  history: "",
  personality: "",
  ideals: "",
  attachments: "",
  weaknesses: "",
  relationships: "",
  clazz: {},
  abilities: [{}],
  skills: [{}],
});

const FINAL_STEP = computed(() => (hasDnd2024Backgrounds.value ? 15 : 14));

const historyStep = computed(() => (hasDnd2024Backgrounds.value ? 6 : 5));
const personalityStep = computed(() => (hasDnd2024Backgrounds.value ? 7 : 6));
const idealsStep = computed(() => (hasDnd2024Backgrounds.value ? 8 : 7));
const attachmentsStep = computed(() => (hasDnd2024Backgrounds.value ? 9 : 8));
const weaknessesStep = computed(() => (hasDnd2024Backgrounds.value ? 10 : 9));
const relationshipsStep = computed(() => (hasDnd2024Backgrounds.value ? 11 : 10));
const classStep = computed(() => (hasDnd2024Backgrounds.value ? 12 : 11));
const abilitiesStep = computed(() => (hasDnd2024Backgrounds.value ? 13 : 12));
const skillsStep = computed(() => (hasDnd2024Backgrounds.value ? 14 : 13));

const backgroundsListUrl = () =>
  `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.backgrounds}`;

onMounted(async () => {
  try {
    const response = await axios.get(backgroundsListUrl(), {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("accessToken"),
      },
    });
    const list = response?.data;
    hasDnd2024Backgrounds.value = Array.isArray(list) && list.length > 0;
  } catch {
    hasDnd2024Backgrounds.value = false;
  }
});

watch(
    () => step.value.current,
    async (newStep) => {
      if (newStep === FINAL_STEP.value) {
        const convertedData = convertCharacterData();
        try {
          await axios.put(
              GATEWAY_INTEGRATION_ROUTES.baseURL +
              GATEWAY_INTEGRATION_ROUTES.api +
              GATEWAY_INTEGRATION_ROUTES.rooms +
              "/" +
              route.params.roomId +
              GATEWAY_INTEGRATION_ROUTES.characters,
              convertedData,
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + localStorage.getItem("accessToken"),
                },
              }
          );
        } catch (error) {
          console.error("Ошибка при сохранении персонажа:", error);
        }
        ionRouter.replace("/rooms/" + route.params.roomId + "/characters");
      }
    }
);

function convertCharacterData() {
  const data: Record<string, unknown> = {
    roomId: route.params.roomId,
    name: characterData.value.name,
    clazzCode: (characterData.value.clazz as { code?: string })?.code ?? "",
    raceCode: (characterData.value.race as { code?: string })?.code ?? "",
    abilities: characterData.value.abilities.map((ability: Record<string, unknown>) => ({
      code: ability.code,
      value: ability.value,
    })),
    skills: characterData.value.skills.map((skillCode: Record<string, unknown>) => ({
      code: skillCode,
    })),
    age: parseInt(String(characterData.value.age), 10),
    height: parseInt(String(characterData.value.height), 10),
    weight: parseInt(String(characterData.value.weight), 10),
    attachments: characterData.value.attachments,
    history: characterData.value.history,
    ideals: characterData.value.ideals,
    personality: characterData.value.personality,
    relationships: characterData.value.relationships,
    weaknesses: characterData.value.weaknesses,
  };
  const bg = characterData.value.background as { code?: string } | null;
  if (bg?.code) {
    data.backgroundCode = bg.code;
  }
  return data;
}
</script>

<template>
  <ion-page>
    <ion-content class="ion-padding" color="dark">
      <div class="header-block create-character-header">
        <CreateCharacterHeader :header-text="stepNames[step.current]" :step="step" :total-steps="stepNames.length"/>
      </div>
      <div class="create-character-flow" v-show="step.current === 0">
        <ChooseRace :characterData="characterData" :currentStep="step"/>
      </div>
      <div class="create-character-flow" v-show="step.current === 1">
        <ChooseName :characterData="characterData" :currentStep="step"/>
      </div>
      <div class="create-character-flow" v-show="step.current === 2">
        <ChooseAge :characterData="characterData" :currentStep="step"/>
      </div>
      <div class="create-character-flow" v-show="step.current === 3">
        <ChooseHeight :characterData="characterData" :currentStep="step"/>
      </div>
      <div class="create-character-flow" v-show="step.current === 4">
        <ChooseWeight :characterData="characterData" :currentStep="step"/>
      </div>
      <div class="create-character-flow" v-show="hasDnd2024Backgrounds && step.current === 5">
        <ChooseBackground :characterData="characterData" :currentStep="step"/>
      </div>
      <div class="create-character-flow" v-show="step.current === historyStep">
        <ChooseHistory :characterData="characterData" :currentStep="step"/>
      </div>
      <div class="create-character-flow" v-show="step.current === personalityStep">
        <ChoosePersonality :characterData="characterData" :currentStep="step"/>
      </div>
      <div class="create-character-flow" v-show="step.current === idealsStep">
        <ChooseIdeals :characterData="characterData" :currentStep="step"/>
      </div>
      <div class="create-character-flow" v-show="step.current === attachmentsStep">
        <ChooseAttachments :characterData="characterData" :currentStep="step"/>
      </div>
      <div class="create-character-flow" v-show="step.current === weaknessesStep">
        <ChooseWeaknesses :characterData="characterData" :currentStep="step"/>
      </div>
      <div class="create-character-flow" v-show="step.current === relationshipsStep">
        <ChooseRelationships :characterData="characterData" :currentStep="step"/>
      </div>
      <div class="create-character-flow" v-show="step.current === classStep">
        <ChooseClass :characterData="characterData" :currentStep="step"/>
      </div>
      <div class="create-character-flow" v-show="step.current === abilitiesStep">
        <ChooseAbilities :characterData="characterData" :currentStep="step"/>
      </div>
      <div class="create-character-flow" v-show="step.current === skillsStep">
        <ChooseSkills :characterData="characterData" :currentStep="step"/>
      </div>
    </ion-content>
  </ion-page>
</template>

<style>
.header-block {
  padding-bottom: 3%;
}

@media (min-width: 1024px) {
  .create-character-header {
    max-width: 1240px;
    margin: 0 auto;
    padding-bottom: 14px;
  }

  .create-character-flow {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 8px 92px;
  }

  .create-character-flow .race-header,
  .create-character-flow .class-header,
  .create-character-flow .background-header {
    grid-column: 1 / -1;
  }

  .create-character-flow .raceLargeList,
  .create-character-flow .classLargeList,
  .create-character-flow .backgroundLargeList,
  .create-character-flow .ability-list,
  .create-character-flow ion-list {
    width: 100%;
  }

  .create-character-flow .image-wrapper {
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
    background: var(--ion-color-medium);
  }

  .create-character-flow .background-large-image {
    border-radius: 0 !important;
    min-width: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
    height: auto;
  }

  .create-character-flow .race-description,
  .create-character-flow .class-description,
  .create-character-flow .background-description,
  .create-character-flow .support-text,
  .create-character-flow .background-modifiers-block {
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
    border-radius: 12px;
    padding: 12px;
    margin-top: 10px;
    text-align: left;
  }

  .create-character-flow .input-block {
    margin-top: 0 !important;
  }

  .create-character-flow ion-textarea.input-block,
  .create-character-flow ion-input.input-block {
    width: 100%;
  }

  .create-character-flow .ability-header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .create-character-flow .ability-header .coins {
    float: none;
    margin-left: auto;
  }

  .create-character-flow ion-fab[horizontal="end"] {
    right: 22px;
    bottom: 18px;
  }
}
</style>
