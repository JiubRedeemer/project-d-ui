import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {getAccessToken} from "@/utils/authTokens";
import type {CrystalPackDto, CrystalsBalanceDto} from "./crystalsApi.types";

function http() {
    return axios.create({
        baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAccessToken()}`,
        },
    });
}

export async function getCrystalsBalance(): Promise<CrystalsBalanceDto> {
    const {data} = await http().get<CrystalsBalanceDto>(`${GATEWAY_INTEGRATION_ROUTES.api}/crystals/me`);
    return data;
}

export async function getCrystalPacks(): Promise<CrystalPackDto[]> {
    const {data} = await http().get<CrystalPackDto[]>(`${GATEWAY_INTEGRATION_ROUTES.api}/crystals/packs`);
    return data;
}

export async function mockBuyCrystals(packId: string): Promise<CrystalsBalanceDto> {
    const {data} = await http().post<CrystalsBalanceDto>(`${GATEWAY_INTEGRATION_ROUTES.api}/crystals/mock-buy`, {packId});
    return data;
}
