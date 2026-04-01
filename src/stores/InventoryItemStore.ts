import {defineStore} from "pinia";
import {InventoryItem} from "@/components/models/response/InventoryResponse";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

export const useInventoryItemStore = defineStore('inventoryItemStore', {
    state: () => ({
        inventoryItem: {} as InventoryItem
    }),
    actions: {
        async updateInventoryItemInStoreById(roomId: any, characterId: any, itemId: any): Promise<void> {
            try {
                const response = await axios.get(
                    `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${characterId}${GATEWAY_INTEGRATION_ROUTES.items}/${itemId}`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`,
                        },
                    }
                );
                this.inventoryItem  = response.data;
            } catch (error) {
                console.error("Ошибка при получении данных:", error);
            }
        }
    }
})
