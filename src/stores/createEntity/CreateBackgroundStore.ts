import {defineStore} from "pinia";
import {BackgroundDto} from "@/api/rulebookApi.types";

export const useCreateBackgroundStore = defineStore('createBackgroundStore', {
    state: () => ({
        background: {} as BackgroundDto,
        roomId: undefined as string | undefined,
    })
})
