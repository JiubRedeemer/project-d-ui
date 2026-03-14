import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import axios from "axios";
import {RoomMasterResponse} from "@/components/models/response/RoomMasterResponse";
import {Character} from "@/components/models/response/Character";

function baseUrl() {
    return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}`;
}

function authHeaders() {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    };
}

export async function getRoomInfo(roomId: string): Promise<RoomMasterResponse> {
    const {data} = await axios.get<RoomMasterResponse>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}`,
        {headers: authHeaders()}
    );
    return data;
}

export async function getRoomCharacters(roomId: string): Promise<Character[]> {
    const {data} = await axios.get<Character[]>(
        `${baseUrl()}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}`,
        {headers: authHeaders()}
    );
    return data;
}