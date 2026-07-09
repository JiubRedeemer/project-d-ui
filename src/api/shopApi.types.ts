import type { Item } from "@/components/models/response/InventoryResponse";

/** Магазин-справочник мастера: карточка с NPC-продавцом и витриной товаров. */
export interface ShopDto {
  id?: string;
  roomId?: string;
  /** Ссылка на NPC-продавца (может отсутствовать). */
  npcId?: string | null;
  name: string;
  description?: string | null;
  imgUrl?: string | null;
  createdBy?: string;
  createdAt?: string;
}

/** Позиция витрины магазина: предмет + цена (золото/серебро/медь). */
export interface ShopItemDto {
  id?: string;
  shopId?: string;
  itemId: string;
  priceGold?: number;
  priceSilver?: number;
  priceCopper?: number;
  sortOrder?: number;
  /** Разрешённый предмет каталога/комнаты (заполняется бэкендом при листинге). */
  item?: Item;
}
