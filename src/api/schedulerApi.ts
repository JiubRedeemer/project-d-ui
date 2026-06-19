import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import { getAccessToken } from "@/utils/authTokens";
import type {
  AttendanceRequest,
  AttendanceResponse,
  CreateGameRequest,
  GameResponse,
  InvitationReplyRequest,
  InvitationResponse,
  InvitePlayersRequest,
  RescheduleGameRequest,
  UpdateGameRequest,
} from "@/api/schedulerApi.types";

function createSchedulerHttp() {
  const accessToken = getAccessToken();
  return axios.create({
    baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
    headers: {
      "Content-type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
}

function schedulerBase() {
  return `${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.scheduler}`;
}

function gamesPath() {
  return `${schedulerBase()}${GATEWAY_INTEGRATION_ROUTES.games}`;
}

function gamePath(gameId: string) {
  return `${gamesPath()}/${gameId}`;
}

export async function createGame(payload: CreateGameRequest): Promise<GameResponse> {
  const { data } = await createSchedulerHttp().post<GameResponse>(gamesPath(), payload);
  return data;
}

export async function listGames(from?: string, to?: string): Promise<GameResponse[]> {
  const { data } = await createSchedulerHttp().get<GameResponse[]>(gamesPath(), {
    params: { from, to },
  });
  return data;
}

export async function getGame(gameId: string): Promise<GameResponse> {
  const { data } = await createSchedulerHttp().get<GameResponse>(gamePath(gameId));
  return data;
}

export async function updateGame(gameId: string, payload: UpdateGameRequest): Promise<GameResponse> {
  const { data } = await createSchedulerHttp().patch<GameResponse>(gamePath(gameId), payload);
  return data;
}

export async function rescheduleGame(gameId: string, payload: RescheduleGameRequest): Promise<GameResponse> {
  const { data } = await createSchedulerHttp().post<GameResponse>(
    `${gamePath(gameId)}${GATEWAY_INTEGRATION_ROUTES.reschedule}`,
    payload
  );
  return data;
}

export async function cancelGame(gameId: string): Promise<GameResponse> {
  const { data } = await createSchedulerHttp().post<GameResponse>(
    `${gamePath(gameId)}${GATEWAY_INTEGRATION_ROUTES.cancel}`
  );
  return data;
}

export async function invitePlayers(gameId: string, payload: InvitePlayersRequest): Promise<InvitationResponse[]> {
  const { data } = await createSchedulerHttp().post<InvitationResponse[]>(
    `${gamePath(gameId)}${GATEWAY_INTEGRATION_ROUTES.invitations}`,
    payload
  );
  return data;
}

export async function listInvitations(gameId: string): Promise<InvitationResponse[]> {
  const { data } = await createSchedulerHttp().get<InvitationResponse[]>(
    `${gamePath(gameId)}${GATEWAY_INTEGRATION_ROUTES.invitations}`
  );
  return data;
}

export async function acceptInvitation(invitationId: string, payload?: InvitationReplyRequest): Promise<InvitationResponse> {
  const { data } = await createSchedulerHttp().post<InvitationResponse>(
    `${schedulerBase()}${GATEWAY_INTEGRATION_ROUTES.invitations}/${invitationId}${GATEWAY_INTEGRATION_ROUTES.accept}`,
    payload ?? {}
  );
  return data;
}

export async function declineInvitation(invitationId: string, payload?: InvitationReplyRequest): Promise<InvitationResponse> {
  const { data } = await createSchedulerHttp().post<InvitationResponse>(
    `${schedulerBase()}${GATEWAY_INTEGRATION_ROUTES.invitations}/${invitationId}${GATEWAY_INTEGRATION_ROUTES.decline}`,
    payload ?? {}
  );
  return data;
}

export async function setAttendance(gameId: string, payload: AttendanceRequest): Promise<AttendanceResponse> {
  const { data } = await createSchedulerHttp().post<AttendanceResponse>(
    `${gamePath(gameId)}${GATEWAY_INTEGRATION_ROUTES.attendance}`,
    payload
  );
  return data;
}

export async function listAttendance(gameId: string): Promise<AttendanceResponse[]> {
  const { data } = await createSchedulerHttp().get<AttendanceResponse[]>(
    `${gamePath(gameId)}${GATEWAY_INTEGRATION_ROUTES.attendance}`
  );
  return data;
}
