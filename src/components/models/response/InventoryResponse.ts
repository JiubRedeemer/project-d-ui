export interface Name {
    rus: string;
    eng: string;
}

export interface Price {
    value: number;
    coinType: string;
}

export interface Damage {
    value: string;
    damageType: string;
    damageTypeName: string;
}

export interface Stats {
    defaultPrice: Price[];
    weight?: number;
    armorClass?: string;
    armorClassMaxDexterityBonus?: string;
    requirement?: string;
    damage?: Damage;
    tags?: string[];
}

export interface Item {
    id: string;
    name: Name;
    type: string;
    typeName: string;
    subtype?: string;
    subtypeName?: string;
    customization: boolean;
    rarity?: string;
    description?: string;
    stats: Stats;
    createdAt: string;
    roomId?: string;
    creatorId?: string;
    imgUrl?: string;
}

export interface InventoryItem {
    id: string;
    inventoryId: string;
    itemId: string;
    item: Item;
    count: number;
    inUse: boolean;
}

export interface InventoryResponse {
    id: string;
    roomId: string;
    characterId: string;
    totalWeight: number;
    items: InventoryItem[];
}
