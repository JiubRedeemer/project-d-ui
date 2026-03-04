import {defineStore} from "pinia";
import {RaceDto} from "@/api/rulebookApi.types";

export const useFullRaceStore = defineStore('createFullRaceStore', {
    state: () => ({
        race: {} as RaceDto
    })
})