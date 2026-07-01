import {defineStore} from "pinia";
import {Item} from "@/components/models/response/InventoryResponse";

export const useCreateInventoryItemStore = defineStore('createInventoryItemStore', {
    state: () => ({
        item: { name: { rus: '', eng: '' }, stats: {} } as Item,
        inventoryItemId: undefined as string | undefined,
    }),
    actions: {
        clearAll() {
            this.inventoryItemId = undefined;
            this.item = { name: { rus: '', eng: '' }, stats: {} } as Item;
        }
    }
})
