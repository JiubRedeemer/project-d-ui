<script setup lang="ts">
import {
  IonAvatar,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  onIonViewWillEnter,
  useIonRouter
} from "@ionic/vue";
import {chevronForwardOutline} from "ionicons/icons";
import {computed} from "vue";
import {useRoute} from "vue-router";
import {Character} from "@/components/models/response/Character";
import {useRoomStore} from "@/stores/RoomStore";
import CharacterAvatarWithHp from "@/components/CharacterAvatarWithHp.vue";
import {TEXTS} from "@/config/localisations";

const route = useRoute();
const ionRouter = useIonRouter();
const roomStore = useRoomStore();

const isCharacterOwned = (character: Character) => {
  return (character as Character & { isOwned?: boolean }).isOwned ?? character.isOwner;
};

const sortedCharacters = computed(() => {
  return [...roomStore.characters].sort((a, b) => {
    const aOwned = isCharacterOwned(a);
    const bOwned = isCharacterOwned(b);

    if (aOwned !== bOwned) {
      return Number(bOwned) - Number(aOwned);
    }

    const nameCompare = a.name.localeCompare(b.name, "ru", { sensitivity: "base" });
    if (nameCompare !== 0) {
      return nameCompare;
    }

    return a.id.localeCompare(b.id);
  });
});

onIonViewWillEnter(() => {
  roomStore.getCharacters(route.params.roomId as string);
});

const goToCharacter = (characterId: string) => {
  ionRouter.navigate(
    `/rooms/${route.params.roomId}/characters/${characterId}`,
    "forward",
    "push"
  );
};
</script>

<template>
  <div class="master-character-list">
    <ion-list v-show="sortedCharacters.length !== 0" class="character-list">
      <ion-item
        v-for="character in sortedCharacters"
        :key="character.id"
        :button="true"
        color="dark"
        @click="goToCharacter(character.id)"
      >
        <CharacterAvatarWithHp slot="start" :character="character" />
        <ion-icon :icon="chevronForwardOutline" slot="end" />
        <ion-label>
          <h1
            class="character-name"
            :class="isCharacterOwned(character) ? 'character-owned' : 'character-not-owned'"
          >
            {{ character.name }}
          </h1>
          <h2 class="username">{{ character.ownerUsername }}</h2>
          <p class="character-description">
            {{ character.raceInfo.name }} — {{ character.clazzInfo.name }}
            <span v-if="character.health">
              • HP {{ character.health.currentHp }}/{{ character.health.maxHp }}
            </span>
          </p>
        </ion-label>
      </ion-item>
    </ion-list>

    <div v-show="sortedCharacters.length === 0" class="character-list-placeholder-wrapper">
      <div class="room-list-placeholder">{{ TEXTS.emptyCharactersList.rus }}</div>
    </div>
  </div>
</template>

<style scoped>
.master-character-list {
  width: 100%;
}

.character-list {
  background: transparent;
}

.character-not-owned {
  color: var(--ion-color-secondary);
}

.character-owned {
  color: var(--ion-color-primary);
}

.username {
  color: var(--ion-color-tertiary);
}

.character-list-placeholder-wrapper {
  width: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.room-list-placeholder {
  color: var(--ion-color-medium);
  text-align: center;
}
</style>
