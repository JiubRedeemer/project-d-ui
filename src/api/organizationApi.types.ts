/** Organization API DTOs (room-scoped). */

export type OrganizationRelationTypeEnum = "ALLY" | "ENEMY" | "MEMBER" | "AGENT" | "LEADER";
export type RelationTargetTypeEnum = "CHARACTER" | "NPC" | "ORGANIZATION";

export const ORGANIZATION_RELATION_LABELS: Record<OrganizationRelationTypeEnum, string> = {
  ALLY: "Союзник",
  ENEMY: "Противник",
  MEMBER: "Член организации",
  AGENT: "Агент организации",
  LEADER: "Лидер",
};

export const RELATION_TARGET_LABELS: Record<RelationTargetTypeEnum, string> = {
  CHARACTER: "Игрок",
  NPC: "NPC",
  ORGANIZATION: "Организация",
};

export type OrganizationRelationDto = {
  id?: string | null;
  organizationId?: string | null;
  targetType?: RelationTargetTypeEnum | null;
  targetId?: string | null;
  relationType?: OrganizationRelationTypeEnum | null;
  note?: string | null;
  incoming?: boolean | null;
};

export type OrganizationDto = {
  id: string;
  roomId: string;
  name: string;
  description?: string | null;
  type?: string | null;
  activity?: string | null;
  location?: string | null;
  visible?: boolean | null;
  statsHidden?: boolean | null;
  imgUrl?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  relations?: OrganizationRelationDto[] | null;
};

export type OrganizationMembershipDto = {
  relationId?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  imgUrl?: string | null;
  visible?: boolean | null;
  relationType?: OrganizationRelationTypeEnum | null;
  note?: string | null;
};

export type SaveOrganizationRelationRequest = {
  id?: string | null;
  organizationId?: string | null;
  targetType?: RelationTargetTypeEnum | null;
  targetId?: string | null;
  relationType?: OrganizationRelationTypeEnum | null;
  note?: string | null;
};

export type SaveOrganizationRequest = {
  id?: string | null;
  roomId: string;
  name: string;
  description?: string | null;
  type?: string | null;
  activity?: string | null;
  location?: string | null;
  visible?: boolean | null;
  statsHidden?: boolean | null;
  imgUrl?: string | null;
  relations?: SaveOrganizationRelationRequest[] | null;
};
