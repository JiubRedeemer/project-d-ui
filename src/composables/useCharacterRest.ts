import {ref} from "vue";
import {useRoute} from "vue-router";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {refillRestByCharacter} from "@/api/magicApi";
import {useCharacterStore} from "@/stores/CharacterStore";
import {useCharacterSkillsStore} from "@/stores/CharacterSkillsStore";
import {useInventoryStore} from "@/stores/InventoryStore";
import {useMagicStore} from "@/stores/MagicStore";

export function useCharacterRest() {
  const route = useRoute();
  const characterStore = useCharacterStore();
  const magicStore = useMagicStore();
  const characterSkillsStore = useCharacterSkillsStore();
  const inventoryStore = useInventoryStore();
  const isResting = ref(false);

  /**
   * Применяет заряды навыков клиентски сразу, не дожидаясь подтверждения сервера.
   * Это устраняет гонку между POST /rest и следующим GET /character-skills,
   * а также некорректный возврат старых данных из SW-кэша.
   *
   * LONG_REST пополняет все навыки, SHORT_REST — только с chargesRefill === 'SHORT_REST'.
   */
  function applyRestLocally(longRest: boolean) {
    const refillAll = longRest;

    // CharacterSkill charges
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

    // InventoryItemSkill charges
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

      // Оптимистично пополняем заряды до GET-а, чтобы избежать гонки с сервером
      applyRestLocally(longRest);

      try {
        const updatedSpellBook = await refillRestByCharacter(
            String(route.params.roomId),
            String(route.params.characterId),
            restType
        );
        magicStore.setSpellBook(updatedSpellBook);
      } catch (error) {
        console.error("Failed to refill spell cells:", error);
        await magicStore.updateSpellBookInStore(
            String(route.params.roomId),
            String(route.params.characterId)
        );
      }

      // GET-ы для подтверждения актуального состояния с сервера
      await Promise.all([
        characterStore.updateCharacterInStoreById(route.params.roomId, route.params.characterId),
        characterSkillsStore.updateCharacterSkills(route.params.roomId, route.params.characterId),
        inventoryStore.updateInventoryInStoreById(route.params.roomId, route.params.characterId),
      ]);
    } finally {
      isResting.value = false;
    }
  }

  return {performRest, isResting};
}
