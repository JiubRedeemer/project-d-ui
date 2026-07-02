import {defineStore} from "pinia";
import {Item} from "@/components/models/response/InventoryResponse";

export const useCreateInventoryItemStore = defineStore('createInventoryItemStore', {
    state: () => ({
        item: { name: { rus: '', eng: '' }, stats: {} } as Item,
        inventoryItemId: undefined as string | undefined,
        keepExistingId: false,
    }),
    actions: {
        clearAll() {
            this.inventoryItemId = undefined;
            this.keepExistingId = false;
            this.item = { name: { rus: '', eng: '' }, stats: {} } as Item;
        }
    }
})
