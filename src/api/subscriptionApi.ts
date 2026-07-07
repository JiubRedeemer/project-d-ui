import axios from "axios";
import {GATEWAY_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {getAccessToken} from "@/utils/authTokens";
import type {PlanDto, SubscriptionDto} from "./subscriptionApi.types";

function http() {
    return axios.create({
        baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAccessToken()}`,
        },
    });
}

export async function getMySubscription(): Promise<SubscriptionDto> {
    const {data} = await http().get<SubscriptionDto>(`${GATEWAY_INTEGRATION_ROUTES.api}/subscriptions/me`);
    return data;
}

export async function getSubscriptionPlans(): Promise<PlanDto[]> {
    const {data} = await http().get<PlanDto[]>(`${GATEWAY_INTEGRATION_ROUTES.api}/subscriptions/plans`);
    return data;
}

export async function mockPurchase(tier: string): Promise<SubscriptionDto> {
    const {data} = await http().post<SubscriptionDto>(`${GATEWAY_INTEGRATION_ROUTES.api}/subscriptions/mock-purchase`, {tier});
    return data;
}
