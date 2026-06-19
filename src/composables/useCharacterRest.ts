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
