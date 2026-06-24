import {defineStore} from 'pinia'
import axios from "axios";
import {Character} from "@/components/models/response/Character";
import {getRoomCharacters, getRoomInfo} from "@/api/masterApi"
import {RoomMasterResponse} from "@/components/models/response/RoomMasterResponse";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

export const useRoomStore = defineStore('roomStore', {
    state: () => ({
        room: {} as RoomMasterResponse,
        characters: [] as Character[]
    }),
    actions: {
        async getRoomInfo(roomId: any): Promise<RoomMasterResponse> {
            this.room = await getRoomInfo(roomId);
            return this.room;
        },
        async getCharacters(roomId: any): Promise<Character[]> {
            this.characters = await getRoomCharacters(roomId);
            return this.characters;
        },
        async updateSingleCharacter(roomId: string, characterId: string): Promise<void> {
            try {
                const { data } = await axios.get<Character>(
                    `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterId}`,
                    { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
                );
                const idx = this.characters.findIndex(c => c.id === characterId);
                if (idx !== -1) this.characters[idx] = data;
            } catch (e) {
                console.error("[RoomStore] updateSingleCharacter failed", e);
            }
        },
        async getItems(roomId: any): Promise<void> {
        },
        async getMagic(roomId: any): Promise<void> {
        },
        async getRaces(roomId: any): Promise<void> {
        },
        async getClasses(roomId: any): Promise<void> {
        },
        async getBackgrounds(roomId: any): Promise<void> {
        }

    }
})
