import axios from "axios";
import { FILE_STORAGE_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import type { FileBucketEnum, UserFile, Uuid } from "@/api/fileStorageApi.types";

function fileStorageApiBaseUrl(): string {
    return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}`;
}

function bucketBaseUrl(bucket: FileBucketEnum): string {
    return `${fileStorageApiBaseUrl()}/${bucket}`;
}

function userFilesBaseUrl(): string {
    return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}/user-files`;
}

function authHeaders() {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    };
}

export function getUserFileDownloadUrl(id: Uuid, userId: Uuid): string {
    return `${userFilesBaseUrl()}/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`;
}

export function getBucketDownloadUrl(bucket: FileBucketEnum, filename: string): string {
    return `${bucketBaseUrl(bucket)}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${encodeURIComponent(
        filename
    )}`;
}

// ——— Bucket files ———

export async function uploadFileToBucket(
    bucket: FileBucketEnum,
    file: File,
    userFilename?: string
): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    if (userFilename != null) {
        formData.append("userFilename", userFilename);
    }

    const { data } = await axios.put<string>(
        `${bucketBaseUrl(bucket)}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
    );

    return data;
}

export async function downloadFileFromBucket(
    bucket: FileBucketEnum,
    filename: string
): Promise<Blob> {
    const res = await axios.get<Blob>(
        `${bucketBaseUrl(bucket)}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${encodeURIComponent(
            filename
        )}`,
        { responseType: "blob" }
    );
    return res.data;
}

export async function deleteFileFromBucket(
    bucket: FileBucketEnum,
    filename: string
): Promise<string> {
    const { data } = await axios.delete<string>(
        `${bucketBaseUrl(bucket)}/delete/${encodeURIComponent(filename)}`
    );
    return data;
}

// ——— User files (metadata in PostgreSQL; object stored in MinIO "other" bucket) ———

export async function uploadUserFile(
    userId: Uuid,
    roomId: Uuid,
    visible: boolean,
    file: File,
    filename?: string
): Promise<UserFile> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    formData.append("roomId", roomId);
    formData.append("visible", String(visible));
    if (filename != null) {
        formData.append("filename", filename);
    }

    const { data } = await axios.post<UserFile>(
        `${userFilesBaseUrl()}/upload`,
        formData,
        {
            headers: {
                ...authHeaders(),
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return data;
}

export async function downloadUserFileById(id: Uuid, userId: Uuid): Promise<Blob> {
    const res = await axios.get<Blob>(
        `${userFilesBaseUrl()}/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`,
        {
            responseType: "blob",
            headers: authHeaders(),
        }
    );
    return res.data;
}

export async function deleteUserFileById(id: Uuid, userId: Uuid): Promise<Uuid> {
    const { data } = await axios.delete<Uuid>(
        `${userFilesBaseUrl()}/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`,
        { headers: authHeaders() }
    );
    return data;
}

export async function readAllUserFilesByUserId(userId: Uuid): Promise<UserFile[]> {
    const { data } = await axios.get<UserFile[]>(
        `${userFilesBaseUrl()}/user/${encodeURIComponent(userId)}`,
        { headers: authHeaders() }
    );

    return data;
}

export async function readVisibleUserFilesByRoomId(roomId: Uuid, userId: Uuid): Promise<UserFile[]> {
    const { data } = await axios.get<UserFile[]>(
        `${userFilesBaseUrl()}/room/${encodeURIComponent(roomId)}?userId=${encodeURIComponent(userId)}`,
        { headers: authHeaders() }
    );

    return data;
}

export async function changeUserFileVisible(
    userId: Uuid,
    roomId: Uuid,
    visible: boolean,
    filename: string
): Promise<void> {
    await axios.post(
        `${userFilesBaseUrl()}/changeVisible?userId=${encodeURIComponent(userId)}&roomId=${encodeURIComponent(
            roomId
        )}&visible=${visible}&filename=${encodeURIComponent(filename)}`,
        undefined,
        { headers: authHeaders() }
    );
}

