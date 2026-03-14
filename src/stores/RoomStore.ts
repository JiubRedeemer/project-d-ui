import {defineStore} from 'pinia'
import {Character} from "@/components/models/response/Character";
import {getRoomCharacters, getRoomInfo} from "@/api/masterApi"
import {RoomMasterResponse} from "@/components/models/response/RoomMasterResponse";

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
