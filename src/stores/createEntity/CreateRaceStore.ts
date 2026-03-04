import {defineStore} from "pinia";
import {RaceDto} from "@/api/rulebookApi.types";

export const useCreateRaceStore = defineStore('createRaceStore', {
    state: () => ({
        race: {} as RaceDto,
        roomId: undefined as string | undefined,
    })
})