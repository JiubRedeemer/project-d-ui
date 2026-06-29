import { Client } from "@stomp/stompjs";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";

function toWsUrl(httpUrl: string): string {
    return httpUrl.replace(/^http(s?):\/\//, (_, s) => `ws${s}://`) + "/ws";
}

export type CharacterEventType =
    | 'character_updated'
    | 'health_updated'
    | 'inventory_updated'
    | 'spellbook_updated'
    | 'notes_updated';

export interface CharacterUpdatedEvent {
    type: CharacterEventType;
    roomId: string;
    characterId: string;
}

/**
 * Subscribe to character_updated events for a specific character.
 * Calls onUpdate whenever the server pushes an update.
 * Calls onReconnect on every reconnect after the first successful connect.
 */
export function useCharacterWebSocket(
    roomId: string,
    characterId: string,
    onUpdate: (event: CharacterUpdatedEvent) => void,
    onReconnect?: () => void
): Client {
    let connectCount = 0;

    const client = new Client({
        brokerURL: toWsUrl(GATEWAY_INTEGRATION_ROUTES.baseURL),
        connectHeaders: {
            Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}`,
        },
        reconnectDelay: 5000,
        onConnect: () => {
            connectCount++;
            if (connectCount > 1) {
                onReconnect?.();
            }
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
 * Calls onReconnect on every reconnect after the first successful connect.
 */
export function useRoomCharactersWebSocket(
    roomId: string,
    onUpdate: (event: CharacterUpdatedEvent) => void,
    onReconnect?: () => void
): Client {
    let connectCount = 0;

    const client = new Client({
        brokerURL: toWsUrl(GATEWAY_INTEGRATION_ROUTES.baseURL),
        connectHeaders: {
            Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}`,
        },
        reconnectDelay: 5000,
        onConnect: () => {
            connectCount++;
            if (connectCount > 1) {
                onReconnect?.();
            }
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
