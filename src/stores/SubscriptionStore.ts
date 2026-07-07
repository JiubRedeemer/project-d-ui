import {defineStore} from "pinia";
import {ref} from "vue";
import {getMySubscription, getSubscriptionPlans, mockPurchase} from "@/api/subscriptionApi";
import type {PlanDto, SubscriptionDto, SubscriptionTier} from "@/api/subscriptionApi.types";

export const useSubscriptionStore = defineStore("subscription", () => {
    const subscription = ref<SubscriptionDto | null>(null);
    const plans = ref<PlanDto[]>([]);
    const loading = ref(false);

    async function load() {
        if (loading.value) return;
        loading.value = true;
        try {
            [subscription.value, plans.value] = await Promise.all([
                getMySubscription(),
                getSubscriptionPlans(),
            ]);
        } catch {
            // not authenticated yet — ignore
        } finally {
            loading.value = false;
        }
    }

    async function purchase(tier: SubscriptionTier) {
        subscription.value = await mockPurchase(tier);
    }

    function canCreateRoom(isPublic = false): boolean {
        const sub = subscription.value;
        if (!sub) return false;
        if (sub.maxRooms === 0) return false;
        if (isPublic && !sub.canCreatePublicRooms) return false;
        return true;
    }

    function canCreateCharacter(currentCount: number): boolean {
        const sub = subscription.value;
        if (!sub) return false;
        if (sub.maxCharactersPerRoom === -1) return true;
        return currentCount < sub.maxCharactersPerRoom;
    }

    return {subscription, plans, loading, load, purchase, canCreateRoom, canCreateCharacter};
});
