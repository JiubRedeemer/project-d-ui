import { defineStore } from "pinia";
import type { ShopDto, ShopItemDto } from "@/api/shopApi.types";
import {
  createShop,
  deleteShop,
  deleteShopItem,
  getShopItems,
  getShopsForRoom,
  saveShopItem,
  updateShop,
} from "@/api/shopApi";

export const useShopsStore = defineStore("shopsStore", {
  state: () => ({
    shops: [] as ShopDto[],
    isLoading: false,
    /** Позиции витрины по shopId. */
    itemsByShop: {} as Record<string, ShopItemDto[]>,
  }),
  actions: {
    async loadShops(roomId: string): Promise<void> {
      this.isLoading = true;
      try {
        this.shops = await getShopsForRoom(roomId);
      } catch (e) {
        console.error("Не удалось загрузить магазины", e);
      } finally {
        this.isLoading = false;
      }
    },

    async createShop(roomId: string, shop: Partial<ShopDto>): Promise<ShopDto> {
      const created = await createShop(roomId, { ...shop, roomId });
      this.shops.push(created);
      return created;
    },

    async updateShop(roomId: string, shopId: string, shop: Partial<ShopDto>): Promise<ShopDto> {
      const updated = await updateShop(roomId, shopId, shop);
      const idx = this.shops.findIndex((s) => s.id === shopId);
      if (idx !== -1) this.shops[idx] = updated;
      return updated;
    },

    async removeShop(roomId: string, shopId: string): Promise<void> {
      await deleteShop(roomId, shopId);
      this.shops = this.shops.filter((s) => s.id !== shopId);
      delete this.itemsByShop[shopId];
    },

    async loadShopItems(roomId: string, shopId: string): Promise<ShopItemDto[]> {
      const items = await getShopItems(roomId, shopId);
      this.itemsByShop[shopId] = items;
      return items;
    },

    async saveShopItem(roomId: string, shopId: string, item: ShopItemDto): Promise<ShopItemDto> {
      const saved = await saveShopItem(roomId, shopId, item);
      const list = this.itemsByShop[shopId] ?? [];
      const idx = list.findIndex((i) => i.id === saved.id);
      if (idx !== -1) list[idx] = saved;
      else list.push(saved);
      this.itemsByShop[shopId] = list;
      return saved;
    },

    async removeShopItem(roomId: string, shopId: string, shopItemId: string): Promise<void> {
      await deleteShopItem(roomId, shopItemId);
      this.itemsByShop[shopId] = (this.itemsByShop[shopId] ?? []).filter((i) => i.id !== shopItemId);
    },
  },
});
