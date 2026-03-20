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

export function getUserFileDownloadUrl(id: Uuid): string {
    return `${userFilesBaseUrl()}/${encodeURIComponent(id)}`;
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
    userId: string,
    file: File,
    filename?: string
): Promise<UserFile> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    if (filename != null) {
        formData.append("filename", filename);
    }

    const { data } = await axios.post<UserFile>(
        `${userFilesBaseUrl()}/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
    );

    return data;
}

export async function downloadUserFileById(id: Uuid): Promise<Blob> {
    const res = await axios.get<Blob>(`${userFilesBaseUrl()}/${encodeURIComponent(id)}`, {
        responseType: "blob",
    });
    return res.data;
}

export async function deleteUserFileById(id: Uuid): Promise<Uuid> {
    const { data } = await axios.delete<Uuid>(`${userFilesBaseUrl()}/${encodeURIComponent(id)}`);
    return data;
}

export async function readAllUserFilesByUserId(userId: string): Promise<UserFile[]> {
    const { data } = await axios.get<unknown>(
        `${userFilesBaseUrl()}/user/${encodeURIComponent(userId)}`
    );

    if (Array.isArray(data)) {
        return data as UserFile[];
    }

    // Some backend endpoints wrap lists into { value: T[], Count: number }
    if (data && typeof data === "object" && "value" in (data as any) && Array.isArray((data as any).value)) {
        return (data as any).value as UserFile[];
    }

    // Unexpected shape - let UI handle by throwing
    throw new Error("Unexpected response shape for readAllUserFilesByUserId");
}

