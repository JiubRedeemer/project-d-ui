/**
 * Types for File Storage API (OpenAPI 3.0.3 — filestorage API).
 * Server: http://localhost:8079
 */

export type Uuid = string;

export type FileBucketEnum =
    | "room-images"
    | "avatar-images"
    | "item-images"
    | "skills-images"
    | "races-images"
    | "classes-images"
    | "npc-images"
    | "other";

export type UserFile = {
    id: Uuid;
    roomId: Uuid;
    filename: string;
    bucket: string; // expected to be 'other' for this feature
    userId: Uuid;
    uploadedAt: string; // date-time
    visible: boolean;
};

