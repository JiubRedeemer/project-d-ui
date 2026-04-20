export interface SendPasswordResetCodeRequest {
    email: string;
}

export interface ResetPasswordRequest {
    email: string;
    verificationCode: string;
    password: string;
    matchingPassword: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    password: string;
    matchingPassword: string;
}

export interface ChangeEmailRequest {
    newEmail: string;
    verificationCode: string;
    currentPassword: string;
}

export interface SendChangeEmailCodeRequest {
    newEmail: string;
}

export interface UserInfoResponse {
    username: string;
    email: string;
    registrationDate: string;
    lastActivity: string;
}

export interface ApiError {
    code?: string;
    message?: string;
}

export const PASSWORD_RESET_ERROR_CODES = {
    USER_NOT_FOUND_BY_EMAIL: "USER_NOT_FOUND_BY_EMAIL",
    VERIFICATION_CODE_COOLDOWN: "VERIFICATION_CODE_COOLDOWN",
    VERIFICATION_CODE_INVALID: "VERIFICATION_CODE_INVALID",
    VERIFICATION_CODE_EXPIRED: "VERIFICATION_CODE_EXPIRED",
    PASSWORD_DO_NOT_MATCH: "PASSWORD_DO_NOT_MATCH",
    USER_EXISTS_BY_EMAIL: "USER_EXISTS_BY_EMAIL",
    INVALID_PASSWORD: "INVALID_PASSWORD",
    MISSED_REQUIRED_FIELD: "MISSED_REQUIRED_FIELD",
    OTHER: "OTHER",
} as const;

export type PasswordResetErrorCode =
    (typeof PASSWORD_RESET_ERROR_CODES)[keyof typeof PASSWORD_RESET_ERROR_CODES];
