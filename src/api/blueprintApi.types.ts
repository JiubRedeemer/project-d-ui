/** Blueprint API DTOs (room-scoped). */

export type CustomizationEnum = "YES" | "NO" | "VARIABLE";

export const CUSTOMIZATION_LABELS: Record<CustomizationEnum, string> = {
  YES: "Да",
  NO: "Нет",
  VARIABLE: "Вариативно",
};

export type BlueprintDto = {
  id: string;
  code?: string | null;
  name: string;
  description?: string | null;
  groupCode?: string | null;
  requiredLevel?: number | null;
  customization?: CustomizationEnum | null;
  itemId?: string | null;
  imgUrl?: string | null;
  bundleId?: string | null;
  hidden?: boolean | null;
  roomId?: string | null;
  creatorId?: string | null;
  /** Обогащение из itemstorage (заполняет Core) */
  itemName?: string | null;
  itemImgUrl?: string | null;
  itemType?: string | null;
  itemRarity?: string | null;
};
