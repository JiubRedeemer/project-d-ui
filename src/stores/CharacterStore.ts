import {defineStore} from 'pinia'
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {Character} from "@/components/models/response/Character";

export const useCharacterStore = defineStore('characterStore', {
    state: () => ({
        character: {} as Character
    }),
    actions: {
        async updateCharacterInStoreById(roomId: any, characterId: any): Promise<void> {
            try {
                const characterResponse = await axios.get(
                    GATEWAY_INTEGRATION_ROUTES.baseURL + GATEWAY_INTEGRATION_ROUTES.api + GATEWAY_INTEGRATION_ROUTES.rooms + '/' + roomId + GATEWAY_INTEGRATION_ROUTES.characters + '/' + characterId,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: "Bearer " + (localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken")),
                        },
                    }
                );
                this.character = characterResponse.data;
            } catch (error) {
                console.error("Ошибка при получении данных:", error);
            }
        }
    }
})
