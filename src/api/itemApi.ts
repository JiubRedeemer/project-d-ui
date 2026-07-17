/** Item lookup by id (room-scoped, с ролевой маскировкой на бэкенде). */
import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type { Item } from "@/components/models/response/InventoryResponse";

function authHeaders(): Record<string, string> {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    };
}

export async function getItemByIdForRoom(roomId: string, itemId: string): Promise<Item> {
    const { data } = await axios.get<Item>(
        `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.items}/by-id/${encodeURIComponent(itemId)}`,
        { headers: authHeaders() }
    );
    return data;
}
