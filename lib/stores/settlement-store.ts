import { create } from "zustand";
import axios from "axios";
import { toast } from "sonner";

/* =======================
   Types
======================= */

export type SuggestedSettlement = {
    other_user_id: string;
    other_user_name: string;
    other_user_image: string | null;
    amount: number;
    type: "PAYABLE" | "RECEIVABLE";
};

interface SettlementState {
    suggestedSettlements: Record<number, SuggestedSettlement[]>;
    error: string | null;

    // Loading States
    isFetchingSettlements: boolean;
    isSettlingDebt: boolean;

    fetchSuggestedSettlements: (groupId: number) => Promise<void>;
    settleDebt: (
        groupId: number,
        settlementData: {
            fromUserId: string;
            toUserId: string;
            amount: number;
        }
    ) => Promise<void>;
}

/* =======================
   Axios instance
======================= */

const api = axios.create({
    headers: {
        "Content-Type": "application/json",
    },
});

/* =======================
   Store
======================= */

export const useSettlementStore = create<SettlementState>((set, get) => ({
    suggestedSettlements: {},
    error: null,
    isFetchingSettlements: false,
    isSettlingDebt: false,

    fetchSuggestedSettlements: async (groupId) => {
        set({ isFetchingSettlements: true, error: null });
        try {
            const { data } = await api.get(`/api/groups/${groupId}/debts`);
            set((state) => ({
                suggestedSettlements: {
                    ...state.suggestedSettlements,
                    [groupId]: data.debts,
                },
            }));
        } catch (error: any) {
            console.error("Failed to fetch suggested settlements:", error);
            set({ error: error.message || "Failed to fetch settlements" });
        } finally {
            set({ isFetchingSettlements: false });
        }
    },

    settleDebt: async (groupId, settlementData) => {
        set({ isSettlingDebt: true, error: null });
        try {
            await api.post(`/api/groups/${groupId}/settlements`, settlementData);
            toast.success("Settlement recorded successfully");
            // Refresh suggested settlements after a successful settlement
            await get().fetchSuggestedSettlements(groupId);
        } catch (error: any) {
            console.error("Failed to record settlement:", error);
            const errorMessage =
                error?.response?.data?.error || "Failed to record settlement";
            toast.error(errorMessage);
            set({ error: errorMessage });
            throw error;
        } finally {
            set({ isSettlingDebt: false });
        }
    },
}));
