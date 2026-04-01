<script setup lang="ts">

import {HEADERS, TEXTS} from "@/config/localisations";
import {computed, ref} from "vue";
import {useInventoryStore} from "@/stores/InventoryStore";
import {FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {useCharacterStore} from "@/stores/CharacterStore";
import {InventoryItem, InventoryItemSkill, ItemSkill} from "@/components/models/response/InventoryResponse";
import {addOutline, contractOutline, handRightOutline, skullOutline} from "ionicons/icons";
import {IonButton, IonIcon, IonProgressBar, useIonRouter} from "@ionic/vue";
import axios from "axios";
import {useRoute} from "vue-router";
import EditItemSkillValueModal from "@/views/character/tabs/inventory/EditItemSkillValueModal.vue";
import {useInventoryItemStore} from "@/stores/InventoryItemStore";
import {CharacterSkill} from "@/components/models/response/Character";
import {useCharacterSkillsStore} from "@/stores/CharacterSkillsStore";
import EditCharacterSkillValueModal from "@/views/character/tabs/attacksAndSkills/EditCharacterSkillValueModal.vue";
import {storeToRefs} from "pinia";
import EditItemCombatBonusModal from "@/views/character/tabs/attacksAndSkills/EditItemCombatBonusModal.vue";

const route = useRoute();

const inventoryStore = useInventoryStore();
const characterStore = useCharacterStore();
const characterSkillsStore = useCharacterSkillsStore();

const str = Math.floor((characterStore.character.abilities.filter(ability => ability.code === "STR")[0].value + characterStore.character.abilities.filter(ability => ability.code === "STR")[0].bonusValue - 10) / 2);
const dex = Math.floor((characterStore.character.abilities.filter(ability => ability.code === "DEX")[0].value + characterStore.character.abilities.filter(ability => ability.code === "DEX")[0].bonusValue - 10) / 2);

const equippedItems = computed(() => inventoryStore.inventory?.items?.filter(item => item.inUse && (item.item.type === "WEAPON")));

const {characterSkills} = storeToRefs(characterSkillsStore)

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
              Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`,
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
              Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`,
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

const getDamageText = (item: InventoryItem) => {
  const d = item.item.stats?.damage;
  if (!d) return '';
  const value = d.value + (calculateDamage(item) > 0 ? " + " + calculateDamage(item) : "") + (calculateDamage(item) < 0 ? " " + calculateDamage(item) : "");
  if (value) return value;
  return '';
};

const getAttackBonus = (item: InventoryItem) => {
  return item.attackBonusValue ? item.attackBonusValue : 0;
};

const getDamageBonus = (item: InventoryItem) => {
  return item.damageBonusValue ? item.damageBonusValue : 0;
};

const setAttackBonus = (item: InventoryItem, value: number) => {
  (item.item.stats as Record<string, unknown>).attackBonus = value;
};

const setDamageBonus = (item: InventoryItem, value: number) => {
  (item.item.stats as Record<string, unknown>).damageBonus = value;
};

const calculateAttack = (item: InventoryItem) => {
  if (item.item.subtype === 'EHW' || item.item.subtype === 'AHW' || item.item.subtype === 'SHW') {
    return characterStore.character.proficiencyBonus + str + getAttackBonus(item);
  } else if (item.item.subtype === 'ERW' || item.item.subtype === 'ARW' || item.item.subtype === 'SRW') {
    return characterStore.character.proficiencyBonus + dex + getAttackBonus(item);
  }
  return getAttackBonus(item);
};

const calculateDamage = (item: InventoryItem) => {
  if (item.item.subtype === 'EHW' || item.item.subtype === 'AHW' || item.item.subtype === 'SHW') {
    return str + getDamageBonus(item);
  } else if (item.item.subtype === 'ERW' || item.item.subtype === 'ARW' || item.item.subtype === 'SRW') {
    return dex + getDamageBonus(item);
  }
  return getDamageBonus(item);
};

const showEditItemSkillModal = ref(false);
const isEditingItemSkill = ref(false);
const editingItemSkill = ref<ItemSkill>();


const showEditCharacterSkillModal = ref(false);
const isEditingCharacterSkill = ref(false);
const editingCharacterSkill = ref<CharacterSkill>();

const showEditCombatBonusModal = ref(false);
const editingCombatBonusType = ref<"attack" | "damage">("attack");
const editingCombatBonusItem = ref<InventoryItem>();

const inventoryItemStore = useInventoryItemStore();
const ionRouter = useIonRouter();

const closeEditItemSkillModal = () => {
  showEditItemSkillModal.value = false;
};
const closeEditCharacterSkillModal = () => {
  showEditCharacterSkillModal.value = false;
  isEditingCharacterSkill.value = false;
  editingCharacterSkill.value = undefined;
};

const closeEditCombatBonusModal = () => {
  showEditCombatBonusModal.value = false;
  editingCombatBonusItem.value = undefined;
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

const openEditCombatBonusModal = (item: InventoryItem, type: "attack" | "damage") => {
  editingCombatBonusItem.value = item;
  editingCombatBonusType.value = type;
  showEditCombatBonusModal.value = true;
};

const currentCombatBonusValue = computed(() => {
  if (!editingCombatBonusItem.value) return 0;
  return editingCombatBonusType.value === "attack"
      ? getAttackBonus(editingCombatBonusItem.value)
      : getDamageBonus(editingCombatBonusItem.value);
});

const combatBonusTitle = computed(() => {
  return editingCombatBonusType.value === "attack" ? "Бонус к атаке" : "Бонус к урону";
});

async function saveItemCombatBonus(value: number) {
  if (!editingCombatBonusItem.value) return;

  const typePath = editingCombatBonusType.value === "attack" ? "/attack" : "/damage";
  const targetItem = editingCombatBonusItem.value;

  try {
    await axios.patch(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.items}/${targetItem.id}${typePath}${GATEWAY_INTEGRATION_ROUTES.bonus}`,
        {bonusValue: value},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`,
          },
        }
    );

    if (editingCombatBonusType.value === "attack") {
      setAttackBonus(targetItem, value);
    } else {
      setDamageBonus(targetItem, value);
    }
    await inventoryStore.updateInventoryInStoreById(route.params.roomId, route.params.characterId)
    closeEditCombatBonusModal();
  } catch (error) {
    console.error("Error while updating item combat bonus:", error);
  }
}

function openInventoryItem(item: InventoryItem) {
  inventoryItemStore.inventoryItem = item;
  ionRouter.navigate('/rooms/' + route.params.roomId + '/characters/' + route.params.characterId + '/inventory/' + item.id, 'forward', 'push')
}

async function saveCharacterSkill(characterSkill: CharacterSkill) {
  await axios.put(
      `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${route.params.characterId}${GATEWAY_INTEGRATION_ROUTES.characterSkills}`,
      characterSkill,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`,
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
          Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`,
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
      <div class="section" v-for="item in equippedItems" :key="item.id">
        <div class="image-block" @click="openInventoryItem(item)">
          <img width="75px" height="75px" class="item-image" :class="getRarityClass(item.item.rarity)"
               :src="getItemImageUrl(item.item.imgUrl)"
               :alt="item.item.name.rus"/>
        </div>
        <div class="info-block">
          <div class="header-block">
            <div class="item-name">
              <span>
                {{ item.item.name.rus }}
              <span
                  v-if="characterStore.character.abilities.find(ability => ability.code === 'STR')?.value < Number(item.item.stats.requirement)"
                  style="color: red;">*</span>
            </span>
            </div>
            <div class="attack" @click="openEditCombatBonusModal(item, 'attack')">
              <div class="attack-value">{{ calculateAttack(item) }}</div>
              <div class="attack-icon">
                <ion-icon :icon="contractOutline" color="primary" slot="icon-only"/>
              </div>
            </div>
          </div>
          <div class="item-footer-block">
            <div class="stats-block">
              <div class="item-stats" v-for="(stat, index) in getItemStats(item)" :key="index">
                {{ stat }}
              </div>
              <div class="damage" @click="openEditCombatBonusModal(item, 'damage')">
                <div class="damage-icon">
                  <ion-icon :icon="skullOutline" color="primary" slot="icon-only"/>
                </div>
                <div class="damage-value">{{ getDamageText(item) || '—' }}</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
    <h1 class="sectionHeader" v-if="skills?.length! > 0">{{ HEADERS.item_skills.rus }}</h1>
    <div class="skills" v-if="skills?.length! > 0">
      <div class="section-skill" v-for="skill in skills" :key="skill.id">
        <div class="image-block">
          <img width="75px" height="75px" class="item-image"
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
    <h1 class="sectionHeader" v-if="characterSkills?.length! > 0">{{ HEADERS.character_skills.rus }}</h1>
    <div class="skills" v-if="characterSkills?.length! > 0">
      <div class="section-skill" v-for="skill in characterSkills" :key="skill.id">
        <div class="image-block">
          <img width="75px" height="75px" class="item-image"
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
  <div class="security-block" style="height: 50px;"></div>
  </div>
  <div class="add-new-button">
    <ion-button color="secondary" size="large" shape="round" @click="openEditCharacterSkillModal(true, undefined)">
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
                                :is-read-only="false"
                                @closeEditCharacterSkillModal="closeEditCharacterSkillModal"
                                @saveCharacterSkill="(characterSkill : CharacterSkill) => saveCharacterSkill(characterSkill)"
                                @deleteCharacterSkill="(skillId : string) => deleteCharacterSkill(skillId)"/>

  <EditItemCombatBonusModal
      :isOpen="showEditCombatBonusModal"
      :title="combatBonusTitle"
      :initialValue="currentCombatBonusValue"
      @close="closeEditCombatBonusModal"
      @save="(value: number) => saveItemCombatBonus(value)"
  />
</template>

<style scoped>
.inventory-body {
  padding-bottom: max(60px, calc(52px + env(safe-area-inset-bottom, 0)));
}

.equipped,
.skills {
  margin-bottom: 8px;
}

.stats-block {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.header-block {
  display: flex;
  justify-content: space-between;
  padding-right: 5px;
  padding-bottom: 0;
}

.charges {
  display: flex;
  flex-direction: row;
  gap: 5px;
}

.charges-value {
  min-width: 100px;
  width: 120px;
}

:deep(ion-progress-bar) {
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
  padding: 5px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  width: 100%;
}

.section-skill {
  background-color: var(--ion-color-medium);
  border-radius: 25px;
  padding: 5px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
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
  min-height: 15px;
}

.image-block {
  width: 75px;
  height: 75px;
}

.item-image {
  width: 75px;
  height: 75px;
  border-radius: 20px;
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
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  border-radius: 10px;
  height: 20px;
  width: auto;
  cursor: pointer;
}

.damage-value, .attack-value {
  font-size: 11px;
  height: 15px;
  width: auto;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding-left: 5px;
}

.damage-value {
  color: var(--ion-color-primary);
}

.damage {
  margin-top: 2px;
}

.attack-value {
  font-size: 16px;
}

.add-new-button {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  background: transparent;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
  padding-bottom: max(8px, env(safe-area-inset-bottom, 0));
}

.attack-icon,
.damage-icon {
  font-size: 22px;
  display: flex;
  align-items: center;
}

.description {
  word-break: break-word;
  min-width: 0;
}
</style>
