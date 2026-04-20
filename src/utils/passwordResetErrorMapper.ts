import { PASSWORD_RESET_ERROR_CODES, type PasswordResetErrorCode } from "@/api/authApi.types";

const PASSWORD_RESET_ERROR_MESSAGES: Record<PasswordResetErrorCode, string> = {
    USER_NOT_FOUND_BY_EMAIL: "Пользователь с таким email не найден",
    USER_EXISTS_BY_EMAIL: "Этот email уже занят",
    VERIFICATION_CODE_COOLDOWN: "Код уже отправлен. Повторите попытку позже",
    VERIFICATION_CODE_INVALID: "Неверный код подтверждения",
    VERIFICATION_CODE_EXPIRED: "Срок действия кода истек. Запросите новый код",
    INVALID_PASSWORD: "Неверный текущий пароль",
    PASSWORD_DO_NOT_MATCH: "Пароли не совпадают",
    MISSED_REQUIRED_FIELD: "Не заполнены обязательные поля",
    OTHER: "Не удалось выполнить операцию. Попробуйте еще раз",
};

export function mapPasswordResetErrorCodeToMessage(code: string | undefined): string {
    if (!code) {
        return PASSWORD_RESET_ERROR_MESSAGES.OTHER;
    }

    const normalizedCode = code in PASSWORD_RESET_ERROR_CODES ? (code as PasswordResetErrorCode) : "OTHER";
    return PASSWORD_RESET_ERROR_MESSAGES[normalizedCode];
}
