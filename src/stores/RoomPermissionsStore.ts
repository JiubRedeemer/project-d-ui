import { defineStore } from "pinia";
import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import { getAccessToken } from "@/utils/authTokens";

type PermissionFlags = {
  canManageGames: boolean;
  canInvitePlayers: boolean;
  canSetAttendance: boolean;
  canViewGameInvites: boolean;
};

function normalizeRole(role: string): "MASTER" | "PLAYER" | string {
  if (role === "GM") return "MASTER";
  return role;
}

function getPermissionFlags(roles: string[]): PermissionFlags {
  const normalized = roles.map(normalizeRole);
  const isMaster = normalized.includes("MASTER");
  return {
    canManageGames: isMaster,
    canInvitePlayers: isMaster,
    canSetAttendance: normalized.includes("PLAYER") || isMaster,
    canViewGameInvites: isMaster,
  };
}

export const useRoomPermissionsStore = defineStore("roomPermissionsStore", {
  state: () => ({
    rolesByRoom: {} as Record<string, string[]>,
    loadingByRoom: {} as Record<string, boolean>,
  }),
  getters: {
    getRoles: (state) => (roomId: string): string[] => state.rolesByRoom[roomId] ?? [],
    getPermissions: (state) => (roomId: string): PermissionFlags =>
      getPermissionFlags(state.rolesByRoom[roomId] ?? []),
  },
  actions: {
    async fetchRoles(roomId: string, force = false): Promise<string[]> {
      if (!force && this.rolesByRoom[roomId]?.length) {
        return this.rolesByRoom[roomId];
      }
      this.loadingByRoom[roomId] = true;
      try {
        const { data } = await axios.get<string[]>(
          `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.roles}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
            },
          }
        );
        this.rolesByRoom[roomId] = data.map(normalizeRole);
        return this.rolesByRoom[roomId];
      } finally {
        this.loadingByRoom[roomId] = false;
      }
    },
  },
});
