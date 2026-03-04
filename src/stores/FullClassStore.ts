import {defineStore} from "pinia";
import {ClazzDto} from "@/api/rulebookApi.types";

export const useFullClassStore = defineStore('createFullClassStore', {
    state: () => ({
        clazz: {} as ClazzDto
    })
})