import {defineStore} from "pinia";
import type {
  AttendanceResponse,
  AttendanceStatus,
  CreateGameRequest,
  GameResponse,
  InvitationResponse,
  InvitationStatus,
  UpdateGameRequest,
} from "@/api/schedulerApi.types";
import {
  acceptInvitation,
  cancelGame,
  createGame,
  declineInvitation,
  invitePlayers,
  listAttendance,
  listGames,
  listInvitations,
  rescheduleGame,
  setAttendance,
  updateGame,
} from "@/api/schedulerApi";

type PendingMap = Record<string, boolean>;

export const useSchedulerStore = defineStore("schedulerStore", {
  state: () => ({
    gamesByRoom: {} as Record<string, GameResponse[]>,
    invitationsByGame: {} as Record<string, InvitationResponse[]>,
    playerInvitations: [] as InvitationResponse[],
    attendanceByGame: {} as Record<string, AttendanceResponse[]>,
    pendingByKey: {} as PendingMap,
    lastErrorMessage: "",
    lastErrorCode: "",
  }),
  persist: {
    pick: ['gamesByRoom', 'invitationsByGame', 'playerInvitations', 'attendanceByGame'],
  },
  getters: {
    getGamesForRoom: (state) => (roomId: string): GameResponse[] => state.gamesByRoom[roomId] ?? [],
    getNearestGameForRoom: (state) => (roomId: string): GameResponse | null => {
      const now = Date.now();
      const list = (state.gamesByRoom[roomId] ?? []).filter(
        (game) => game.status !== "CANCELLED" && Date.parse(game.scheduledAt) >= now
      );
      if (!list.length) return null;
      return [...list].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0];
    },
    getAcceptedNearestGameForRoom: (state) => (roomId: string): GameResponse | null => {
      const acceptedGameIds = new Set(
        state.playerInvitations.filter((i) => i.status === "ACCEPTED").map((i) => i.gameId)
      );
      const now = Date.now();
      const list = (state.gamesByRoom[roomId] ?? []).filter(
        (game) =>
          acceptedGameIds.has(game.id) && game.status !== "CANCELLED" && Date.parse(game.scheduledAt) >= now
      );
      if (!list.length) return null;
      return [...list].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0];
    },
    isPending: (state) => (key: string): boolean => Boolean(state.pendingByKey[key]),
  },
  actions: {
    setPending(key: string, value: boolean) {
      this.pendingByKey[key] = value;
    },
    setError(error: unknown) {
      const responseData = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
      const message = responseData?.message;
      const errorCode = responseData?.error;
      this.lastErrorMessage = message ?? (error as { message?: string })?.message ?? "Unknown error";
      this.lastErrorCode = errorCode ?? "NETWORK_ERROR";
    },
    upsertGame(roomId: string, game: GameResponse) {
      const games = this.gamesByRoom[roomId] ?? [];
      const index = games.findIndex((it) => it.id === game.id);
      if (index === -1) {
        this.gamesByRoom[roomId] = [game, ...games];
        return;
      }
      games.splice(index, 1, game);
      this.gamesByRoom[roomId] = [...games];
    },
    async loadGames(roomId: string, from?: string, to?: string) {
      const key = `loadGames:${roomId}`;
      this.setPending(key, true);
      try {
        const allGames = await listGames(from, to);
        this.gamesByRoom[roomId] = allGames.filter((game) => game.campaignId === roomId);
      } catch (error) {
        this.setError(error);
      } finally {
        this.setPending(key, false);
      }
    },
    async loadIncomingInvitations(roomIds: string[]) {
      for (const roomId of roomIds) {
        if (!this.gamesByRoom[roomId]) {
          await this.loadGames(roomId);
        }
      }
      const gameIds = roomIds.flatMap((roomId) => (this.gamesByRoom[roomId] ?? []).map((game) => game.id));
      const all: InvitationResponse[] = [];
      for (const gameId of gameIds) {
        try {
          const invites = await listInvitations(gameId);
          all.push(...invites);
        } catch {
          // Keep page functional if user cannot list invitations for specific games.
        }
      }
      this.playerInvitations = all;
    },
    async createRoomGame(roomId: string, payload: CreateGameRequest) {
      const key = `createGame:${roomId}`;
      this.setPending(key, true);
      try {
        const game = await createGame({ ...payload, campaignId: roomId });
        this.upsertGame(roomId, game);
        return game;
      } catch (error) {
        this.setError(error);
        throw error;
      } finally {
        this.setPending(key, false);
      }
    },
    async editGame(roomId: string, gameId: string, payload: UpdateGameRequest) {
      const key = `editGame:${gameId}`;
      this.setPending(key, true);
      try {
        const game = await updateGame(gameId, payload);
        this.upsertGame(roomId, game);
        return game;
      } catch (error) {
        this.setError(error);
        throw error;
      } finally {
        this.setPending(key, false);
      }
    },
    async rescheduleRoomGame(roomId: string, gameId: string, scheduledAt: string, reason?: string) {
      const key = `reschedule:${gameId}`;
      this.setPending(key, true);
      try {
        const game = await rescheduleGame(gameId, { scheduledAt, reason });
        this.upsertGame(roomId, game);
        return game;
      } catch (error) {
        this.setError(error);
        throw error;
      } finally {
        this.setPending(key, false);
      }
    },
    async cancelRoomGame(roomId: string, gameId: string) {
      const key = `cancel:${gameId}`;
      this.setPending(key, true);
      try {
        const game = await cancelGame(gameId);
        this.upsertGame(roomId, game);
        return game;
      } catch (error) {
        this.setError(error);
        throw error;
      } finally {
        this.setPending(key, false);
      }
    },
    async loadGameInvitations(gameId: string) {
      const key = `loadInvites:${gameId}`;
      this.setPending(key, true);
      try {
        this.invitationsByGame[gameId] = await listInvitations(gameId);
      } catch (error) {
        this.setError(error);
      } finally {
        this.setPending(key, false);
      }
    },
    async invitePlayersToGame(gameId: string, playerIds: string[]) {
      const key = `invite:${gameId}`;
      this.setPending(key, true);
      try {
        this.invitationsByGame[gameId] = await invitePlayers(gameId, {playerIds});
      } catch (error) {
        this.setError(error);
        throw error;
      } finally {
        this.setPending(key, false);
      }
    },
    async replyInvitation(invitationId: string, status: InvitationStatus, comment?: string) {
      const key = `reply:${invitationId}`;
      if (this.isPending(key)) return;
      this.setPending(key, true);
      try {
        const updated =
          status === "ACCEPTED"
            ? await acceptInvitation(invitationId, { comment })
            : await declineInvitation(invitationId, { comment });
        this.playerInvitations = this.playerInvitations.map((item) =>
          item.id === invitationId ? updated : item
        );
      } catch (error) {
        this.setError(error);
        throw error;
      } finally {
        this.setPending(key, false);
      }
    },
    async loadAttendance(gameId: string) {
      this.attendanceByGame[gameId] = await listAttendance(gameId);
    },
    async saveAttendance(gameId: string, status: AttendanceStatus) {
      const updated = await setAttendance(gameId, { status });
      const list = this.attendanceByGame[gameId] ?? [];
      const index = list.findIndex((item) => item.playerId === updated.playerId);
      if (index === -1) {
        this.attendanceByGame[gameId] = [updated, ...list];
      } else {
        list.splice(index, 1, updated);
        this.attendanceByGame[gameId] = [...list];
      }
    },
  },
});
