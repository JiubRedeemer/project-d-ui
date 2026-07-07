import {defineStore} from "pinia";
import {ref} from "vue";
import {getCrystalsBalance, getCrystalPacks, mockBuyCrystals} from "@/api/crystalsApi";
import type {CrystalPackDto} from "@/api/crystalsApi.types";

export const useCrystalsStore = defineStore("crystals", () => {
    const balance = ref<number>(0);
    const packs = ref<CrystalPackDto[]>([]);
    const loading = ref(false);

    async function load() {
        if (loading.value) return;
        loading.value = true;
        try {
            [balance.value, packs.value] = await Promise.all([
                getCrystalsBalance().then((r) => r.balance),
                getCrystalPacks(),
            ]);
        } catch {
            // not authenticated yet
        } finally {
            loading.value = false;
        }
    }

    async function buyPack(packId: string) {
        const result = await mockBuyCrystals(packId);
        balance.value = result.balance;
    }

    return {balance, packs, loading, load, buyPack};
});
