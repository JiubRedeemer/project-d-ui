import {defineStore} from "pinia";
import {InventoryItem} from "@/components/models/response/InventoryResponse";

export const useInventoryItemStore = defineStore('inventoryItemStore', {
    state: () => ({
        inventoryItem: {} as InventoryItem
    })
})
