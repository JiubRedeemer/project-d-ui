<script setup lang="ts">

import {HEADERS, TEXTS} from "@/config/localisations";
import {computed, ref} from "vue";
import {useInventoryStore} from "@/stores/InventoryStore";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useCharacterStore} from "@/stores/CharacterStore";
import {InventoryItem, InventoryItemSkill, ItemSkill} from "@/components/models/response/InventoryResponse";
import {addOutline, handRightOutline} from "ionicons/icons";
import {IonButton, IonIcon, IonProgressBar} from "@ionic/vue";
import axios from "axios";
import {useRoute} from "vue-router";
import EditItemSkillValueModal from "@/views/character/tabs/inventory/EditItemSkillValueModal.vue";
import {useInventoryItemStore} from "@/stores/InventoryItemStore";
import {CharacterSkill} from "@/components/models/response/Character";
import {useCharacterSkillsStore} from "@/stores/CharacterSkillsStore";
import EditCharacterSkillValueModal from "@/views/character/tabs/attacksAndSkills/EditCharacterSkillValueModal.vue";
import {storeToRefs} from "pinia";
import {useAppRouter} from "@/composables/useAppRouter";

const route = useRoute();
const { navigate } = useAppRouter();

const inventoryStore = useInventoryStore();
const characterStore = useCharacterStore();
const characterSkillsStore = useCharacterSkillsStore();

const str = Math.floor((characterStore.character.abilities.filter(ability => ability.code === "STR")[0].value - 10) / 2);
const dex = Math.floor((characterStore.character.abilities.filter(ability => ability.code === "DEX")[0].value - 10) / 2);

const equippedItems = computed(() => inventoryStore.inventory?.items?.filter(item => item.inUse && (item.item.type === "WEAPON")));

const { characterSkills } = storeToRefs(characterSkillsStore)

const skills = computed(() =>
    inventoryStore.inventory?.items?.flatMap(invItem =>
        invItem.skills ?? []
    )
);


const getItemImageUrl = (imgUrl: string | undefined) => {
  return imgUrl != null
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png';
};

const getSkillImageUrl = (imgUrl: string | undefined) => {
  return imgUrl != null
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.skills_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`
      : 'https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png';
};

const useSkill = async (skill: InventoryItemSkill | CharacterSkill) => {
  if (skill.currentCharges > 0) {
    let res;
    if (skill.inventoryItemId) {
      res = await axios.post(
          `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.items}/${skill.inventoryItemId}${GATEWAY_INTEGRATION_ROUTES.skills}/${skill.id}${GATEWAY_INTEGRATION_ROUTES.use}`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            }
          }
      );
    } else {
      res = await axios.patch(
          `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.characterSkills}/${skill.id}${GATEWAY_INTEGRATION_ROUTES.use}`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            }
          }
      );
    }
    if (res.status === 200) {
      skill.currentCharges = skill.currentCharges - 1;
    }
  }
}

function getRarityClass(rarity: string | undefined) {
  switch (rarity) {
    case 'COMMON':
      return 'rarity-common';
    case 'UNCOMMON':
      return 'rarity-uncommon';
    case 'RARE':
      return 'rarity-rare';
    case 'VERY_RARE':
      return 'rarity-very-rare';
    case 'LEGENDARY':
      return 'rarity-legendary';
    default:
      return 'rarity-common';
  }
}

const getItemStats = (item: InventoryItem) => {
  const stats: string[] = [];


  if (item.item.stats?.damage) {
    stats.push(`${TEXTS.damage.rus}: ${item.item.stats.damage.damageTypeName}`);
  }


  if (item.item.subtypeName) {
    stats.push(`${TEXTS.type.rus}: ${item.item.subtypeName}`);
  }

  return stats;
};

const calculateAttack = (item: InventoryItem) => {
  if (item.item.subtype === 'EHW' || item.item.subtype === 'AHW' || item.item.subtype === 'SHW') {
    return characterStore.character.proficiencyBonus + str;
  } else if (item.item.subtype === 'ERW' || item.item.subtype === 'ARW' || item.item.subtype === 'SRW') {
    return characterStore.character.proficiencyBonus + dex;
  }
  return 1;
};

const showEditItemSkillModal = ref(false); // Управляем видимостью модалки
const isEditingItemSkill = ref(false); // Управляем видимостью модалки
const editingItemSkill = ref<ItemSkill>(); // Управляем видимостью модалки


const showEditCharacterSkillModal = ref(false); // Управляем видимостью модалки
const isEditingCharacterSkill = ref(false); // Управляем видимостью модалки
const editingCharacterSkill = ref<CharacterSkill>(); // Управляем видимостью модалки

const inventoryItemStore = useInventoryItemStore();

const closeEditItemSkillModal = () => {
  showEditItemSkillModal.value = false; // Закрываем модалку
};
const closeEditCharacterSkillModal = () => {
  showEditCharacterSkillModal.value = false; // Закрываем модалку
};

const openEditItemSkillModal = (isEditing: boolean, itemSkill: ItemSkill | undefined) => {
  isEditingItemSkill.value = isEditing;
  if (!isEditing) {
    editingItemSkill.value = itemSkill;
  } else if (isEditing && !itemSkill) {
    editingItemSkill.value = undefined;
  }
  showEditItemSkillModal.value = true;
};

const openEditCharacterSkillModal = (isEditing: boolean, characterSkill: CharacterSkill | undefined) => {
  isEditingCharacterSkill.value = isEditing;
  if (!isEditing) {
    editingCharacterSkill.value = characterSkill;
  } else if (isEditing && !characterSkill) {
    editingCharacterSkill.value = undefined;
  }
  showEditCharacterSkillModal.value = true;
};

function openInventoryItem(item: InventoryItem) {
  inventoryItemStore.inventoryItem = item;
  navigate('/rooms/' + route.params.roomId + '/characters/' + route.params.characterId + '/inventory/' + item.id, 'forward', 'push')
}

async function saveCharacterSkill(characterSkill: CharacterSkill) {
  await axios.put(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.characterSkills}`,
      characterSkill,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        }
      }
  );
  await characterSkillsStore.updateCharacterSkills(route.params.roomId, route.params.characterId)
}

async function deleteCharacterSkill(id: string) {
  await axios.delete(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.characterSkills}/${id}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        }
      }
  );
  await characterSkillsStore.updateCharacterSkills(route.params.roomId, route.params.characterId)
}

</script>

<template>
  <div class="inventory-body">
    <h1 class="sectionHeader" v-if="equippedItems?.length! > 0">{{ HEADERS.equipped.rus }}</h1>
    <div class="equipped" v-if="equippedItems?.length! > 0">
      <div class="section" v-for="item in equippedItems" :key="item.id" @click="openInventoryItem(item)">
        <div class="image-block">
          <img width="65px" height="65px" class="item-image" :class="getRarityClass(item.item.rarity)"
               :src="getItemImageUrl(item.item.imgUrl)"
               :alt="item.item.name.rus"/>
        </div>
        <div class="info-block">
          <div class="item-name">
              <span>
                {{ item.item.name.rus }}
              <span
                  v-if="characterStore.character.abilities.find(ability => ability.code === 'STR')?.value < Number(item.item.stats.requirement)"
                  style="color: red;">*</span>
            </span>
          </div>
          <div class="item-footer-block">
            <div class="stats-block">
              <div class="item-stats" v-for="(stat, index) in getItemStats(item)" :key="index">
                {{ stat }}
              </div>
            </div>
            <div class="buttons-block">
              <div class="attack">
                <div class="attack-name">Атака</div>
                <div class="attack-value">{{ calculateAttack(item) }}</div>
              </div>
              <div class="damage">
                <div class="damage-name">Урон</div>
                <div class="damage-value">{{ item.item.stats.damage.value }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <h1 class="sectionHeader" v-if="skills?.length! > 0">{{ HEADERS.item_skills.rus }}</h1>
    <div class="skills" v-if="skills?.length! > 0">
      <div class="section" v-for="skill in skills" :key="skill.id">
        <div class="image-block">
          <img width="65px" height="65px" class="item-image"
               :src="getSkillImageUrl(skill.skill.imgUrl)"
               :alt="skill.skill.name.rus"/>
        </div>
        <div class="info-block">
          <div class="item-name">
              <span>
                {{ skill.skill.name.rus }}
            </span>
          </div>
          <div class="item-footer-block">
            <div class="stats-block">
              <div class="item-stats" @click="openEditItemSkillModal(false, skill.skill)">
                <div class="description">
                  {{ skill.skill.shortDescription }}
                </div>
                <div class="charges" v-if="skill.skill.charges">
                  <div class="charges-title">Зарядов:</div>
                  <div class="charges-value">
                    <ion-progress-bar
                        :color="skill.currentCharges==1 ? 'warning' : skill.currentCharges==0 ? 'danger' : 'primary'"
                        :value="skill.currentCharges / skill.skill.charges"></ion-progress-bar>
                  </div>
                  <div class="charges-text-value">{{ skill.currentCharges }} / {{ skill.skill.charges }}</div>
                </div>
              </div>
            </div>
            <div class="buttons-block">
              <div class="use">
                <ion-button size="default" shape="round" @click="useSkill(skill)">
                  <ion-icon slot="icon-only" :icon="handRightOutline"></ion-icon>
                </ion-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <h1 class="sectionHeader" v-if="skills?.length! > 0">{{ HEADERS.character_skills.rus }}</h1>
    <div class="skills" v-if="skills?.length! > 0">
      <div class="section" v-for="skill in characterSkills" :key="skill.id">
        <div class="image-block">
          <img width="65px" height="65px" class="item-image"
               :src="getSkillImageUrl(skill.imgUrl)"
               :alt="skill.name"/>
        </div>
        <div class="info-block">
          <div class="item-name">
              <span>
                {{ skill.name }}
            </span>
          </div>
          <div class="item-footer-block">
            <div class="stats-block">
              <div class="item-stats" @click="openEditCharacterSkillModal(false, skill)">
                <div class="description">
                  {{ skill.shortDescription }}
                </div>
                <div class="charges" v-if="skill.charges">
                  <div class="charges-title">Зарядов:</div>
                  <div class="charges-value">
                    <ion-progress-bar
                        :color="skill.currentCharges==1 ? 'warning' : skill.currentCharges==0 ? 'danger' : 'primary'"
                        :value="skill.currentCharges / skill.charges"></ion-progress-bar>
                  </div>
                  <div class="charges-text-value">{{ skill.currentCharges }} / {{ skill.charges }}</div>
                </div>
              </div>
            </div>
            <div class="buttons-block">
              <div class="use">
                <ion-button size="default" shape="round" @click="useSkill(skill)">
                  <ion-icon slot="icon-only" :icon="handRightOutline"></ion-icon>
                </ion-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="add-new-button">
    <ion-button size="large" shape="round" @click="openEditCharacterSkillModal(true, undefined)">
      <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
    </ion-button>
  </div>

  <EditItemSkillValueModal :isOpen="showEditItemSkillModal"
                           :character-id="String(route.params.characterId)"
                           :is-editing="false"
                           :item-skill="editingItemSkill"
                           :is-read-only="true"
                           @closeEditItemSkillModal="closeEditItemSkillModal"/>

  <EditCharacterSkillValueModal :isOpen="showEditCharacterSkillModal"
                                :character-id="String(route.params.characterId)"
                                :is-editing="isEditingCharacterSkill"
                                :character-skill="editingCharacterSkill"
                                @closeEditCharacterSkillModal="closeEditCharacterSkillModal"
                                @saveCharacterSkill="(characterSkill : CharacterSkill) => saveCharacterSkill(characterSkill)"
                                @deleteCharacterSkill="(skillId : string) => deleteCharacterSkill(skillId)"/>


</template>

<style scoped>

.charges {
  display: flex;
  flex-direction: row;
  gap: 5px;
}

.charges-value {
  width: 120px;
}

ion-progress-bar {
  height: 12px;
  border-radius: 6px;
}

.sectionHeader {
  color: var(--ion-color-light);
  font-size: 22px;
  font-weight: normal;
  margin-top: 10px;
}

.section {
  background-color: var(--ion-color-medium);
  border-radius: 25px;
  padding: 10px;
  overflow: hidden;
  max-height: 85px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: row;
  justify-content: start;
  gap: 10px;
  width: 100%;
}

.info-block {
  display: flex;
  flex: 1;
  flex-direction: column;
  margin-right: 0;
  gap: 5px;
}

.item-footer-block {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.use {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.buttons-block {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
}

.item-name {
  font-size: 16px;
  font-weight: bold;
}

.item-stats {
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 11px;
}

.item-image {
  border-radius: 15px;
  border: 2px solid transparent;
}

.rarity-common {
  border-color: gray;
}

.rarity-uncommon {
  border-color: green;
}

.rarity-rare {
  border-color: blue;
}

.rarity-very-rare {
  border-color: purple;
}

.rarity-legendary {
  border-color: orange;
}

.damage, .attack {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  background: var(--ion-color-medium-tint);
  border-radius: 10px;
  font-size: 11px;
  height: 20px;
  padding-left: 5px;
  width: 130px;
}

.damage-value, .attack-value {
  font-size: 11px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border-radius: 15px;
  height: 20px;
  width: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.add-new-button {
  position: fixed;
  bottom: -10px; /* расстояние от нижнего края */
  width: 100%;
  background: transparent; /* или нужный фон */
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-left: -15px;
}
</style>