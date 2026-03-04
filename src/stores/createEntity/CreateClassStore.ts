import {defineStore} from "pinia";
import {ClazzDto} from "@/api/rulebookApi.types";

export const useCreateClassStore = defineStore('createClassStore', {
    state: () => ({
        clazz: {} as ClazzDto,
        roomId: undefined as string | undefined,
    })
})
