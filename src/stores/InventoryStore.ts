import {defineStore} from "pinia";
import {InventoryResponse} from "@/components/models/response/InventoryResponse";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

export const useInventoryStore = defineStore('inventoryStore', {
    state: () => ({
        inventory: {} as InventoryResponse
    }),
    actions: {
        async updateInventoryInStoreById(roomId: any, characterId: any): Promise<void> {
            try {
                const response = await axios.get(
                    `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${characterId}`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                        },
                    }
                );
                this.inventory = response.data;
            } catch (error) {
                console.error("Ошибка при получении данных:", error);
            }
        }
    }
})
