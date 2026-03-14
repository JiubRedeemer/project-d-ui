import {Character} from "@/components/models/response/Character";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";

export const CHARACTER_AVATAR_PLACEHOLDER =
  "https://img.icons8.com/external-febrian-hidayat-gradient-febrian-hidayat/64/external-Dice-board-games-febrian-hidayat-gradient-febrian-hidayat-2.png";

/**
 * Возвращает URL изображения для персонажа:
 * 1. Аватарка персонажа (characterBio.avatar), если есть
 * 2. Изображение расы (raceInfo.imgUrl), если нет аватарки
 * 3. Заглушка по умолчанию
 */
export function getCharacterAvatarUrl(character: Character): string {
  const avatarPath = character.characterBio?.avatar?.trim?.();
  if (avatarPath) {
    return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.avatar_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${avatarPath}`;
  }

  const raceImgUrl = (character.raceInfo as { imgUrl?: string })?.imgUrl;
  if (raceImgUrl) {
    return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.races_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${raceImgUrl}`;
  }

  return CHARACTER_AVATAR_PLACEHOLDER;
}
