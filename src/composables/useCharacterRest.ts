import {ref} from "vue";
import {useRoute} from "vue-router";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

import {useCharacterStore} from "@/stores/CharacterStore";
import {useCharacterSkillsStore} from "@/stores/CharacterSkillsStore";
import {useInventoryStore} from "@/stores/InventoryStore";
import {useMagicStore} from "@/stores/MagicStore";

// Синглтон: true пока идёт отдых — WS-рефреш пропускает обновления инвентаря/навыков
export const isResting = ref(false);

export function useCharacterRest() {
  const route = useRoute();
  const characterStore = useCharacterStore();
  const magicStore = useMagicStore();
  const characterSkillsStore = useCharacterSkillsStore();
  const inventoryStore = useInventoryStore();

  // Восстанавливает заряды локально ПОСЛЕ GET-ов, чтобы перекрыть устаревший SW-кэш.
  function applyRestLocally(longRest: boolean) {
    const refillAll = longRest;

    const skills = characterSkillsStore.characterSkills;
    if (Array.isArray(skills)) {
      for (const skill of skills) {
        if (skill.charges == null || skill.currentCharges == null) continue;
        const isLongRestSkill = skill.chargesRefill === 'LONG_REST';
        const isShortRestSkill = skill.chargesRefill === 'SHORT_REST';
        if (refillAll ? (isLongRestSkill || isShortRestSkill) : isShortRestSkill) {
          skill.currentCharges = skill.charges;
        }
      }
    }

    const items = inventoryStore.inventory?.items;
    if (Array.isArray(items)) {
      for (const item of items) {
        for (const invSkill of item.skills ?? []) {
          if (!invSkill.skill?.charges) continue;
          const refill = invSkill.skill.chargesRefill;
          const isLongRestSkill = refill === 'LONG_REST';
          const isShortRestSkill = refill === 'SHORT_REST';
          if (refillAll ? (isLongRestSkill || isShortRestSkill) : isShortRestSkill) {
            invSkill.currentCharges = invSkill.skill.charges;
          }
        }
      }
    }

    const resources = magicStore.spellBook?.customResources;
    if (Array.isArray(resources)) {
      for (const r of resources) {
        if (r.maxCount == null) continue;
        const isLong = r.refillRestType === 'LONG_REST';
        const isShort = r.refillRestType === 'SHORT_REST';
        if (refillAll ? (isLong || isShort) : isShort) {
          r.currentCount = r.maxCount;
        }
      }
    }
  }

  async function performRest(longRest: boolean) {
    if (isResting.value || !characterStore.character) return;

    isResting.value = true;
    const restType = longRest ? "LONG_REST" : "SHORT_REST";

    try {
      try {
        await axios.post(
            `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${route.params.roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterStore.character.id}${GATEWAY_INTEGRATION_ROUTES.rest}/${restType}`,
            {},
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              },
            }
        );
      } catch (error) {
        console.error("Ошибка при получении данных:", error);
      }

      // GET-ы с сервера (могут вернуть устаревший SW-кэш)
      await Promise.all([
        characterStore.updateCharacterInStoreById(route.params.roomId, route.params.characterId),
        characterSkillsStore.updateCharacterSkills(route.params.roomId, route.params.characterId),
        inventoryStore.updateInventoryInStoreById(route.params.roomId, route.params.characterId),
        magicStore.updateSpellBookInStore(String(route.params.roomId), String(route.params.characterId)),
      ]);

      // Применяем после GET-ов — перекрывает любой протухший кэш
      applyRestLocally(longRest);
    } finally {
      isResting.value = false;
    }
  }

  return {performRest, isResting};
}
