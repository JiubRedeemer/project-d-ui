import {defineStore} from "pinia";
import {MoneyDto, WalletStoreDto} from "@/components/models/response/InventoryResponse";

export const useWalletStore = defineStore('walletStore', {
    state: () => ({
        wallet: {count: undefined, type: "golden_coin"} as WalletStoreDto,
        moneyExpanded: Boolean(false),
        userMoney: {} as MoneyDto
    })
})
