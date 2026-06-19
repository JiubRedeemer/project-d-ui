export type GameStatus = "PLANNED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED";
export type AttendanceStatus = "GOING" | "MAYBE" | "NOT_GOING";

export interface ErrorResponse {
  timestamp?: string;
  error?: string;
  message?: string;
}

export interface CreateGameRequest {
  campaignId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
  location: string;
  playerLimit: number;
}

export interface UpdateGameRequest {
  title?: string;
  description?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  timezone?: string;
  location?: string;
  playerLimit?: number;
}

export interface RescheduleGameRequest {
  scheduledAt: string;
  reason?: string;
}

export interface GameResponse {
  id: string;
  campaignId: string;
  gmId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
  location: string;
  status: GameStatus;
  playerLimit: number;
}

export interface InvitePlayersRequest {
  playerIds: string[];
}

export interface InvitationReplyRequest {
  comment?: string;
}

export interface InvitationResponse {
  id: string;
  gameId: string;
  playerId: string;
  status: InvitationStatus;
  respondedAt?: string | null;
  comment?: string | null;
}

export interface AttendanceRequest {
  status: AttendanceStatus;
}

export interface AttendanceResponse {
  id: string;
  gameId: string;
  playerId: string;
  status: AttendanceStatus;
}
