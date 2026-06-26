import { Client } from "@stomp/stompjs";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";

function toWsUrl(httpUrl: string): string {
  return httpUrl.replace(/^http(s?):\/\//, (_, s) => `ws${s}://`) + "/ws";
}

export interface CombatUpdatedEvent {
  type: string;
  roomId: string;
  sessionId: string;
}

export function useCombatWebSocket(
  roomId: string,
  onUpdate: (event: CombatUpdatedEvent) => void
): Client {
  const client = new Client({
    brokerURL: toWsUrl(GATEWAY_INTEGRATION_ROUTES.baseURL),
    connectHeaders: {
      Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}`,
    },
    reconnectDelay: 5000,
    onConnect: () => {
      client.subscribe(`/topic/rooms/${roomId}/combat`, (message) => {
        try {
          onUpdate(JSON.parse(message.body));
        } catch {
          // ignore
        }
      });
    },
    onStompError: (frame) => {
      console.warn("[WS] STOMP combat error", frame.headers["message"]);
    },
  });
  client.activate();
  return client;
}
