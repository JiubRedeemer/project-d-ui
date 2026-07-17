export type RulebookBundleCategory = "RACE" | "CLAZZ" | "BACKGROUND" | "BLUEPRINT";

/** Элемент набора (раса/класс/предыстория/чертёж) с признаком включённости в комнате. */
export interface RulebookBundleContentDto {
  id: string;
  name: string;
  enabled: boolean;
}

/** Набор правил (издание) для рас/классов/предысторий. */
export interface RulebookBundleDto {
  id?: string;
  name: string;
  /** '2014' | '2024' | 'SRD_2024' | 'ORASCA' | пользовательское. */
  editionCode?: string;
  category?: RulebookBundleCategory;
  description?: string | null;
  imgUrl?: string | null;
  isPublic?: boolean;
  /** null = системный набор. */
  ownerUserId?: string | null;
  sortOrder?: number;
  createdAt?: string;
  /** Включён ли набор в комнате (в контексте комнаты). */
  enabled?: boolean;
}
