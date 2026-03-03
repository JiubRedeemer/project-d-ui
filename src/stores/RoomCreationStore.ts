import {defineStore} from "pinia";
import {BackgroundDto, ClazzDto, RaceDto} from "@/api/rulebookApi.types";
import {createBackground, createClass, createRace} from "@/api/rulebookApi";
import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

export const useRoomCreationStore = defineStore('createRoomCreationStore', {
    state: () => ({
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
                createRace(roomId, raceDto)
            })
        },
        async createClassesBulk(roomId: any): Promise<void> {
            this.classes.forEach(classDto => {
                createClass(roomId, classDto)
            })
        },
        async createBackgroundsBulk(roomId: any): Promise<void> {
            this.backgrounds.forEach(backgroundDto => {
                createBackground(roomId, backgroundDto)
            })
        },
        async createRoom(): Promise<void> {
            try {
                await axios.put(GATEWAY_INTEGRATION_ROUTES.baseURL +
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
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                    }
                });
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
        }

    }
})