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
    suggestedSettlements: Record<string, SuggestedSettlement[]>;
    isLoading: boolean;
    error: string | null;

    fetchSuggestedSettlements: (groupId: string) => Promise<void>;
    settleDebt: (
        groupId: string,
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
    isLoading: false,
    error: null,

    fetchSuggestedSettlements: async (groupId) => {
        set({ isLoading: true, error: null });
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
            set({ isLoading: false });
        }
    },

    settleDebt: async (groupId, settlementData) => {
        set({ isLoading: true, error: null });
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
            set({ isLoading: false });
        }
    },
}));
