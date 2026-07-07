export type SubscriptionTier = 'FREE' | 'PLAYER_PLUS' | 'MASTER';

export interface SubscriptionDto {
    tier: SubscriptionTier;
    purchasedAt: string | null;
    expiresAt: string | null;
    maxRooms: number;
    maxCharactersPerRoom: number;
    canCreatePublicRooms: boolean;
}

export interface PlanDto {
    tier: SubscriptionTier;
    priceMonthly: number;
    priceYearly: number;
    maxRooms: number;
    maxCharactersPerRoom: number;
    canCreatePublicRooms: boolean;
}
