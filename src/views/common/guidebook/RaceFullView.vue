<script setup lang="ts">

import RoomsHeader from "@/views/rooms/RoomsHeader.vue";
import {useFullRaceStore} from "@/stores/FullRaceStore";
import {useRoomCreationStore} from "@/stores/RoomCreationStore";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {arrowBackOutline, arrowUp} from "ionicons/icons";
import {IonChip, IonContent, IonFab, IonFabButton, IonIcon, IonLabel, IonPage} from "@ionic/vue";
import {onMounted, ref} from "vue";
import type {RaceDto} from "@/api/rulebookApi.types";
import {useRouter} from "vue-router";
import {useRoomStore} from "@/stores/RoomStore";

const fullRaceStore = useFullRaceStore();
const roomCreationStore = useRoomCreationStore();
const roomStore = useRoomStore();
const subspecies = ref<RaceDto[]>([]);
const ionRouter = useRouter();

onMounted(async () => {
  const race = fullRaceStore.race;
  if (race?.code) {
    if (roomStore.room.id) {
      subspecies.value = await roomCreationStore.getAvailableSubRacesForRoomId(race.code, roomStore.room.id, roomCreationStore.roomInfo.baseRules) ?? [];
    } else {
      subspecies.value = await roomCreationStore.getAvailableSubRaces(race.code, roomCreationStore.roomInfo.baseRules) ?? [];
    }
  }
});

const ABILITY_CODE_NAMES: Record<string, string> = {
  STR: "Сила",
  DEX: "Ловкость",
  CON: "Телосложение",
  INT: "Интеллект",
  WIS: "Мудрость",
  CHA: "Харизма",
}; //Говно прямо скажем, но впадлу бек пилить под это пока

const getImageUrl = (imgUrl: string | undefined | null) => {
  return imgUrl != null
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.races_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png';
};

const previousStep = () => {
  ionRouter.back();
}

function getTraitsOrdered(race: RaceDto | null) {
  if(!race) return [];
  return race?.stats?.traits?.sort((a, b) => {
    if (a.description?.length && b.description?.length)
      return a.description.length - b.description.length;
    else if (a.description?.length && !b.description?.length) return 1;
    else if (!a.description?.length && b.description?.length) return -1;
    else return 0;
  });
}
</script>

<template>
  <ion-page>
    <RoomsHeader :header-name="fullRaceStore.race.name"></RoomsHeader>
    <ion-content>
      <div class="container">
        <div class="header">
          <div class="avatar">
            <img :src="getImageUrl(fullRaceStore.race.imgUrl)"
                 class="avatar-img"
                 alt="avatar"/>
          </div>
        </div>
        <div class="body">
          <div class="description">
            {{ fullRaceStore.race.description }}
          </div>
          <div class="stat">
            <div class="stat-header">
              Базовая скорость
            </div>
            <ion-chip class="stat-chip" color="primary">
              <ion-label>
                {{ fullRaceStore.race.stats.baseSpeed }}
              </ion-label>
            </ion-chip>
          </div>
          <div class="stat" v-show="fullRaceStore.race.stats.abilityModifiers.length > 0">
            <div class="stat-header">
              Бонусы характеристик
            </div>
            <ion-chip class="stat-chip" v-for="(raceModifier, index) in fullRaceStore.race.stats.abilityModifiers"
                      :key="index" color="primary">
              <ion-icon :icon="arrowUp" :color="raceModifier.value > 0 ? 'success' : 'warning'"></ion-icon>
              <ion-label>{{
                  ABILITY_CODE_NAMES[raceModifier.code] + " " + (raceModifier.value > 0 ? '+' : '') + raceModifier.value
                }}
              </ion-label>
            </ion-chip>
          </div>
          <div
              v-if="(fullRaceStore.race?.stats?.traits?.length ?? 0) > 0"
              class="race-traits"
          >
            <p class="traits-title">Черты</p>

            <div class="traits-list">
              <div
                  v-for="trait in getTraitsOrdered(fullRaceStore.race ?? null) ?? []"
                  :key="trait.id"
                  class="trait-block"
              >
                <ion-chip size="small">
                  <ion-label>{{ trait.name }}</ion-label>
                </ion-chip>
                <p class="trait-description">{{ trait.description }}</p>
              </div>
            </div>
          </div>
          <div class="stat" v-show="subspecies.length > 0">
            <div class="stat-header">Подвиды</div>
            <div class="stat-subspecies">
              <div v-for="sub in subspecies" :key="sub.id" class="stat-subspecies-item">
                <img :src="getImageUrl(sub.imgUrl)" class="stat-subspecies-img" :alt="sub.name"/>
                <span class="stat-subspecies-name">{{ sub.name }}</span>
              </div>
            </div>
          </div>
          <div style="height: 10vh"></div>
        </div>
      </div>
    </ion-content>
    <ion-fab slot="fixed" vertical="bottom" horizontal="start">
      <ion-fab-button color="medium" @click="previousStep()">
        <ion-icon :icon="arrowBackOutline" color="light"></ion-icon>
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<style scoped>
.description {
  margin-top: 10px;
  margin-left: 10px;
  margin-right: 10px;
  padding: 10px;
  text-align: center;
  background-color: var(--ion-color-medium);
  border-radius: 10px;
}

.stat {
  margin-top: 10px;
}

.stat-header {
  font-size: 24px;
  padding-left: 10px;
}

.stat-chip {
  margin-left: 10px;
}

.stat-subspecies {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.stat-subspecies-item {
  margin-left: 10px;
  margin-right: 10px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background-color: var(--ion-color-medium);
  border-radius: 10px;
}

.stat-subspecies-img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 50%;
}

.stat-subspecies-name {
  font-size: 0.95rem;
}

.avatar-img {
  border-radius: 25px;
  align-content: center;
  justify-content: center;
  display: flex;
}

.avatar {
  margin-top: 10px;
  margin-left: 10px;
  margin-right: 10px;
  display: flex;
  justify-content: center;
}

.header {
  display: flex;
  justify-content: center;
}

.container {
  padding-bottom: 90px;
}

@media (min-width: 1024px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 18px 20px 96px;
    display: grid;
    grid-template-columns: minmax(300px, 380px) minmax(540px, 1fr);
    gap: 18px 20px;
    align-items: start;
  }

  .header {
    grid-column: 1;
    position: sticky;
    top: 14px;
  }

  .avatar {
    width: 100%;
    margin: 0;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.12);
    background: var(--ion-color-medium);
  }

  .avatar-img {
    width: 100%;
    height: min(62vh, 540px);
    object-fit: cover;
    border-radius: 0;
  }

  .body {
    grid-column: 2;
  }

  .description,
  .stat-subspecies-item {
    margin-left: 0;
    margin-right: 0;
    border: 1px solid rgba(var(--ion-color-light-rgb), 0.08);
    border-radius: 12px;
  }

  .description {
    margin-top: 0;
    padding: 14px;
    text-align: left;
    line-height: 1.45;
  }

  .stat {
    margin-top: 14px;
  }

  .stat-header {
    font-size: 20px;
    padding-left: 0;
    margin-bottom: 6px;
  }

  .stat-chip {
    margin-left: 0;
    margin-right: 8px;
    margin-bottom: 8px;
  }

  .stat-subspecies {
    gap: 10px;
  }

  .stat-subspecies-item {
    margin: 0;
    width: calc(50% - 5px);
    min-width: 260px;
  }

  ion-fab {
    left: 22px;
    bottom: 18px;
  }
}


.race-traits {
  margin-top: 12px;
  width: 100%;
}

.traits-title {
  font-size: 0.9rem;
  color: var(--ion-color-primary);
  margin: 0 0 6px 0;
}

.traits-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trait-block {
  width: 100%;
}

.trait-description {
  margin: 6px 0 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
  text-align: left;
}

</style>