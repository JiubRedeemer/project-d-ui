import { Client } from "@stomp/stompjs";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";

function toWsUrl(httpUrl: string): string {
    return httpUrl.replace(/^http(s?):\/\//, (_, s) => `ws${s}://`) + "/ws";
}

export interface CharacterUpdatedEvent {
    type: string;
    roomId: string;
    characterId: string;
}

/**
 * Subscribe to character_updated events for a specific character.
 * Calls onUpdate whenever the server pushes an update.
 * Automatically disconnects on component unmount.
 */
export function useCharacterWebSocket(
    roomId: string,
    characterId: string,
    onUpdate: (event: CharacterUpdatedEvent) => void
): Client {
    const client = new Client({
        brokerURL: toWsUrl(GATEWAY_INTEGRATION_ROUTES.baseURL),
        connectHeaders: {
            Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}`,
        },
        reconnectDelay: 5000,
        onConnect: () => {
            client.subscribe(
                `/topic/rooms/${roomId}/characters/${characterId}`,
                (message) => {
                    try {
                        onUpdate(JSON.parse(message.body));
                    } catch {
                        // ignore malformed messages
                    }
                }
            );
        },
        onStompError: (frame) => {
            console.warn("[WS] STOMP error", frame.headers["message"]);
        },
    });

    client.activate();
    return client;
}

/**
 * Subscribe to character_updated events for all characters in a room.
 * Used by the master character list to react to any character change.
 */
export function useRoomCharactersWebSocket(
    roomId: string,
    onUpdate: (event: CharacterUpdatedEvent) => void
): Client {
    const client = new Client({
        brokerURL: toWsUrl(GATEWAY_INTEGRATION_ROUTES.baseURL),
        connectHeaders: {
            Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}`,
        },
        reconnectDelay: 5000,
        onConnect: () => {
            client.subscribe(
                `/topic/rooms/${roomId}/characters`,
                (message) => {
                    try {
                        onUpdate(JSON.parse(message.body));
                    } catch {
                        // ignore malformed messages
                    }
                }
            );
        },
        onStompError: (frame) => {
            console.warn("[WS] STOMP error", frame.headers["message"]);
        },
    });

    client.activate();
    return client;
}
