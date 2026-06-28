import {defineStore} from "pinia";
import {BackgroundDto, ClazzDto, RaceDto} from "@/api/rulebookApi.types";

export const useGuidebookStore = defineStore('guidebookStore', {
    state: () => ({
        classes: [] as ClazzDto[],
        races: [] as RaceDto[],
        backgrounds: [] as BackgroundDto[],
        roomId: "" as string,
        baseRuleType: "" as string,
        lastUpdatedAt: 0 as number,
    }),
    persist: true,
})