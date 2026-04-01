import {defineStore} from "pinia";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {CharacterSkill} from "@/components/models/response/Character";

export const useCharacterSkillsStore = defineStore('characterSkills', {
    state: () => ({
        characterSkills: {} as CharacterSkill[]
    }),
    actions: {
        async updateCharacterSkills(roomId: any, characterId: any): Promise<void> {
            try {
                const response = await axios.get(
                    `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterId}${GATEWAY_INTEGRATION_ROUTES.characterSkills}`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`,
                        },
                    }
                );
                this.characterSkills = response.data;
            } catch (error) {
                console.error("Ошибка при получении данных:", error);
            }
        }
    }
})
