export interface CrystalPackDto {
    id: string;
    amount: number;
    price: number;
    pricePerCrystal: number;
    tag: string | null;
}

export interface CrystalsBalanceDto {
    balance: number;
}
