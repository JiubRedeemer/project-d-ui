import {defineStore} from "pinia";
import {Item} from "@/components/models/response/InventoryResponse";

export const useCreateInventoryItemStore = defineStore('createInventoryItemStore', {
    state: () => ({
        item: {} as Item
    })
})
