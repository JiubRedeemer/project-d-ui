import {defineStore} from "pinia";
import {BackgroundDto, ClazzDto, RaceDto} from "@/api/rulebookApi.types";
import {
    createBackground,
    createClass,
    createRace,
    getBackgroundsForRoom,
    getClassesForRoom,
    getRacesForRoom,
    getRaceSubspeciesByCodeForRoom,
    getSubClassesByCodeForRoom
} from "@/api/rulebookApi";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

export const useRoomCreationStore = defineStore('createRoomCreationStore', {
    state: () => ({
        roomInfoCreatedId: "" as string,
        races: [] as RaceDto[],
        classes: [] as ClazzDto[],
        backgrounds: [] as BackgroundDto[],
        roomInfo: {} as {
            name: string,
            description: string,
            rules: string,
            baseRules: string,
            filePath: string,
        },
    }),
    actions: {
        async createRacesBulk(roomId: any): Promise<void> {
            this.races.forEach(raceDto => {
                raceDto.roomId = this.roomInfoCreatedId;
                createRace(this.roomInfoCreatedId, raceDto)
            })
        },
        async createClassesBulk(roomId: any): Promise<void> {
            this.classes.forEach(classDto => {
                classDto.roomId = this.roomInfoCreatedId;
                createClass(this.roomInfoCreatedId, classDto)
            })
        },
        async createBackgroundsBulk(roomId: any): Promise<void> {
            this.backgrounds.forEach(backgroundDto => {
                backgroundDto.roomId = this.roomInfoCreatedId;
                createBackground(this.roomInfoCreatedId, backgroundDto)
            })
        },
        async getAvailableRaces(forceRuleType: string | undefined): Promise<RaceDto[]> {
            const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
            return await getRacesForRoom(ZERO_UUID, forceRuleType)
        },
        async getAvailableClasses(forceRuleType: string | undefined): Promise<ClazzDto[]> {
            const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
            return await getClassesForRoom(ZERO_UUID, forceRuleType)
        },
        async getAvailableSubClasses(classCode: string, forceRuleType: string | undefined): Promise<ClazzDto[]> {
            const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
            return await getSubClassesByCodeForRoom(ZERO_UUID, classCode, forceRuleType)
        },
        async getAvailableSubClassesForRoomId(classCode: string, roomId: string, forceRuleType: string | undefined): Promise<ClazzDto[]> {
            return await getSubClassesByCodeForRoom(roomId, classCode, forceRuleType)
        },
        async getAvailableSubRaces(raceCode: string, forceRuleType: string | undefined): Promise<RaceDto[]> {
            const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
            return await getRaceSubspeciesByCodeForRoom(ZERO_UUID, raceCode, forceRuleType)
        },
        async getAvailableSubRacesForRoomId(raceCode: string, roomId: string, forceRuleType: string | undefined): Promise<RaceDto[]> {
            return await getRaceSubspeciesByCodeForRoom(roomId, raceCode, forceRuleType)
        },
        async getAvailableBackgrounds(forceRuleType: string | undefined): Promise<BackgroundDto[]> {
            const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
            return await getBackgroundsForRoom(ZERO_UUID, forceRuleType)
        },
        async createRoom(): Promise<{ id: string } | undefined> {
            try {
                const res = await axios.put(GATEWAY_INTEGRATION_ROUTES.baseURL +
                    GATEWAY_INTEGRATION_ROUTES.api +
                    GATEWAY_INTEGRATION_ROUTES.rooms, {
                    name: this.roomInfo.name,
                    description: this.roomInfo.description,
                    rules: this.roomInfo.rules,
                    baseRules: this.roomInfo.baseRules,
                    filePath: this.roomInfo.filePath,
                }, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${(localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken"))}`
                    }
                });
                this.roomInfoCreatedId = res.data.id;
                return res.data.id
            } catch (error) {
                console.error("Ошибка создания комнаты", error);
            }
        },
        clearAll(): void {
            this.races = [];
            this.classes = [];
            this.backgrounds = [];
            this.roomInfo = {} as {
                name: string,
                description: string,
                rules: string,
                baseRules: string,
                filePath: string,
            };
            this.roomInfoCreatedId = "";
        }

    }
})