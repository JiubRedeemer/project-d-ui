import {defineStore} from "pinia";
import {BackgroundDto, RaceDto} from "@/api/rulebookApi.types";

export const useFullBackgroundStore = defineStore('createFullBackgroundStore', {
    state: () => ({
        background: {} as BackgroundDto
    })
})