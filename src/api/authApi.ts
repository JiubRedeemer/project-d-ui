import axios from "axios";
import { GATEWAY_INTEGRATION_ROUTES } from "@/config/integrationRoutes";
import { getAccessToken } from "@/utils/authTokens";
import type {
    ChangeEmailRequest,
    ChangePasswordRequest,
    ResetPasswordRequest,
    SendChangeEmailCodeRequest,
    SendPasswordResetCodeRequest,
    UserInfoResponse
} from "@/api/authApi.types";

function createPublicAuthHttp() {
    return axios.create({
        baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
        headers: {
            "Content-type": "application/json",
        },
    });
}

function createPrivateAuthHttp() {
    const accessToken = getAccessToken();
    return axios.create({
        baseURL: GATEWAY_INTEGRATION_ROUTES.baseURL,
        headers: {
            "Content-type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
    });
}

export async function sendPasswordResetCode(
    email: string,
    signal?: AbortSignal
): Promise<void> {
    const payload: SendPasswordResetCodeRequest = { email };
    const http = createPublicAuthHttp();
    await http.post(GATEWAY_INTEGRATION_ROUTES.passwordSendResetCode, payload, {
        signal,
    });
}

export async function resetPassword(
    payload: ResetPasswordRequest,
    signal?: AbortSignal
): Promise<void> {
    const http = createPublicAuthHttp();
    await http.post(GATEWAY_INTEGRATION_ROUTES.passwordReset, payload, {
        signal,
    });
}

export async function changePassword(
    payload: ChangePasswordRequest,
    signal?: AbortSignal
): Promise<void> {
    const http = createPrivateAuthHttp();
    await http.post(GATEWAY_INTEGRATION_ROUTES.passwordChange, payload, {
        signal,
    });
}

export async function sendChangeEmailCode(
    newEmail: string,
    signal?: AbortSignal
): Promise<void> {
    const payload: SendChangeEmailCodeRequest = { newEmail };
    const http = createPrivateAuthHttp();
    await http.post(GATEWAY_INTEGRATION_ROUTES.usersEmailSendVerificationCode, payload, {
        signal,
    });
}

export async function changeEmail(
    payload: ChangeEmailRequest,
    signal?: AbortSignal
): Promise<void> {
    const http = createPrivateAuthHttp();
    await http.post(GATEWAY_INTEGRATION_ROUTES.usersEmailChange, payload, {
        signal,
    });
}

export async function getCurrentUserInfo(signal?: AbortSignal): Promise<UserInfoResponse> {
    const http = createPrivateAuthHttp();
    const { data } = await http.get<UserInfoResponse>(GATEWAY_INTEGRATION_ROUTES.usersMe, {
        signal,
    });
    return data;
}
