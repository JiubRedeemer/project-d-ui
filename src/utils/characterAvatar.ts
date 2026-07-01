import {Character} from "@/components/models/response/Character";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

export const CHARACTER_AVATAR_PLACEHOLDER =
  "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";

/**
 * Возвращает URL изображения для персонажа:
 * 1. Аватарка активной формы (если персонаж превращён)
 * 2. Аватарка персонажа (characterBio.avatar), если есть
 * 3. Изображение расы (raceInfo.imgUrl), если нет аватарки
 * 4. Заглушка по умолчанию
 */
export function getCharacterAvatarUrl(character: Character): string {
  // Check active transform — import lazily to avoid circular deps
  try {
    const { useTransformStore, getFormAvatarUrl } = require('@/stores/TransformStore')
    const transformStore = useTransformStore()
    const form = transformStore.activeForm(character.id)
    if (form) {
      const formUrl = getFormAvatarUrl(form)
      if (formUrl) return formUrl
    }
  } catch { /* store not yet initialised */ }
  const rawAvatar = character.characterBio?.avatar;
  const avatarPath =
    typeof rawAvatar === "string"
      ? rawAvatar.trim()
      : rawAvatar != null
        ? String(rawAvatar).trim()
        : "";
  if (avatarPath) {
    return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.avatar_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${avatarPath}`;
  }

  const raceImgUrl = ((character.raceInfo as { imgUrl?: string | null })?.imgUrl ?? "").trim();
  if (raceImgUrl) {
    return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.races_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${raceImgUrl}`;
  }

  return CHARACTER_AVATAR_PLACEHOLDER;
}
