import {defineStore} from "pinia";
import {MoneyDto, WalletStoreDto} from "@/components/models/response/InventoryResponse";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

export const useWalletStore = defineStore('walletStore', {
    state: () => ({
        wallet: {count: undefined, type: "golden_coin"} as WalletStoreDto,
        moneyExpanded: Boolean(false),
        userMoney: {} as MoneyDto
    }),
    persist: {
        pick: ['userMoney'],
    },
    actions: {
        async updateWallet(roomId: string, characterId: string): Promise<void> {
            try {
                const response = await axios.get(
                    `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.inventory}/${characterId}${GATEWAY_INTEGRATION_ROUTES.money}`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                        },
                    }
                );
                this.userMoney = response.data;
            } catch (error) {
                console.error("Failed to update wallet:", error);
            }
        }
    }
})
