import {defineStore} from "pinia";
import {BackgroundDto, ClazzDto, RaceDto} from "@/api/rulebookApi.types";
import {
    getBackgroundsForRoom,
    getClassesForRoom,
    getRacesForRoom,
    getRaceSubspeciesByCodeForRoom,
    getSubClassesByCodeForRoom
} from "@/api/rulebookApi";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

/** Расы, классы и предыстории комнаты собираются из бандлов, а не наследуют готовое издание. */
const ROOM_RULES = "HOMEBREW";

/**
 * Характеристики и навыки бандлами не покрыты: rulebook выбирает их по baseRuleType
 * (AbilityService.chooseRuleType), и только DND5E/DND2024 отдают общую таблицу 5e.
 * При HOMEBREW список характеристик оказывается пустым, поэтому база — издание 2024.
 */
const ROOM_BASE_RULES = "DND2024";

export const useRoomCreationStore = defineStore('createRoomCreationStore', {
    state: () => ({
        roomInfoCreatedId: "" as string,
        races: [] as RaceDto[],
        classes: [] as ClazzDto[],
        backgrounds: [] as BackgroundDto[],
        roomInfo: {} as {
            name: string,
            description: string,
            filePath: string,
            isPublic: boolean,
        },
    }),
    actions: {
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
        async createRoom(): Promise<string> {
            const res = await axios.put(GATEWAY_INTEGRATION_ROUTES.baseURL +
                GATEWAY_INTEGRATION_ROUTES.api +
                GATEWAY_INTEGRATION_ROUTES.rooms, {
                name: this.roomInfo.name,
                description: this.roomInfo.description,
                rules: ROOM_RULES,
                baseRules: ROOM_BASE_RULES,
                filePath: this.roomInfo.filePath,
                isPublic: this.roomInfo.isPublic ?? false,
            }, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                }
            });
            this.roomInfoCreatedId = res.data.id;
            return res.data.id
        },
        clearAll(): void {
            this.races = [];
            this.classes = [];
            this.backgrounds = [];
            this.roomInfo = {} as {
                name: string,
                description: string,
                filePath: string,
                isPublic: boolean,
            };
            this.roomInfoCreatedId = "";
        }

    }
})