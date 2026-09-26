import { create } from "zustand";
import axios from "axios";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";


/* =======================
   Types
======================= */

export type Group = {
  id: number;
  name: string;
  description: string | null;
  currency?: string;
  createdAt: string;
  simplifyDebts: boolean;
  totalSpent?: number;
  ownerId?: string;
};

export type Member = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export type Share = {
  userId: string;
  shareAmount: number;
};

export type Expense = {
  id: number;
  description: string;
  totalAmount: number;
  category?: string;
  paidBy: Member;
  shares: Share[];
  createdAt: string;
};

export type BalanceItem = {
  userId: string;
  name: string;
  image: string | null;
  amount: number;
  currency: string;
};
interface GroupState {
  groups: Group[];
  expenses: Record<number, {
    items: Expense[];
    hasMore: boolean;
    offset: number;
    total: number;
  }>;
  members: Record<number, Member[]>;
  balances: BalanceItem[];

  // Loading States
  isFetchingGroups: boolean;
  isFetchingGroupData: boolean;
  isTogglingSimplifyDebts: boolean;
  isCreatingGroup: boolean;
  isCreatingExpense: boolean;
  isUpdatingExpense: boolean;
  isAddingMember: boolean;
  isRemovingMember: boolean;
  isFetchingBalances: boolean;
  isFetchingMoreExpenses: boolean;

  fetchBalances: (groupId: number) => Promise<void>;
  fetchGroups: () => Promise<void>;
  fetchGroupData: (groupId: number, force?: boolean) => Promise<void>;
  prefetchGroupData: (groupId: number) => Promise<void>;
  fetchMoreExpenses: (groupId: number) => Promise<void>;
  toggleSimplifiyDebts: (groupId: number) => Promise<void>;

  setGroups: (groups: Group[]) => void;
  setExpenses: (groupId: number, expenses: Expense[], total: number) => void;
  setMembers: (groupId: number, members: Member[]) => void;

  createGroup: (data: {
    name: string;
    description?: string | null;
  }) => Promise<void>;

  createExpense: (
    groupId: number,
    data: {
      description: string;
      totalAmount: number;
      paidBy: string;
      shares: Share[];
      category?: string;
    }
  ) => Promise<void>;

  updateExpense: (
    groupId: number,
    expenseId: number,
    data: {
      description: string;
      totalAmount: number;
      paidBy: string;
      shares: Share[];
      category?: string;
    }
  ) => Promise<void>;

  deleteExpense: (groupId: number, expenseId: number) => Promise<void>;

  addMember: (groupId: number, email: string) => Promise<void>;
  removeMember: (groupId: number, memberId: string) => Promise<void>;
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

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  expenses: {},
  members: {},
  balances: [],

  isFetchingGroups: false,
  isFetchingGroupData: false,
  isTogglingSimplifyDebts: false,
  isCreatingGroup: false,
  isCreatingExpense: false,
  isUpdatingExpense: false,
  isAddingMember: false,
  isRemovingMember: false,
  isFetchingBalances: false,
  isFetchingMoreExpenses: false,
  /* ---------- groups ---------- */
  fetchBalances: async (groupId: number) => {
    set({ isFetchingBalances: true });

    try {
      const { data } = await api.get(`/api/groups/${groupId}/balances`);
      set(({
        balances: data.balances ?? [],
      }));
    } catch {
      toast.error("Failed to load balances.");
    } finally {
      set({ isFetchingBalances: false });
    }
  },
  toggleSimplifiyDebts: async (groupId: number) => {
    set({ isTogglingSimplifyDebts: true });
    try {
      const { data } = await api.patch(`/api/groups/${groupId}/simplify-debts`);
      if (data && data.updatedGroup && data.updatedGroup[0]) {
        const updatedGroup = data.updatedGroup[0];
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === updatedGroup.id ? { ...g, simplifyDebts: updatedGroup.simplifyDebts } : g
          ),
        }));
      }
    } catch (error) {
      toast.error("Error while toggling simplify debts")
    } finally {
      set({ isTogglingSimplifyDebts: false });
    }
  },
  fetchGroups: async () => {
    set({ isFetchingGroups: true });
    try {

      const { data } = await api.get("/api/groups");
      set({ groups: data.groups ?? [] });
    } finally {
      set({ isFetchingGroups: false });
    }
  },
  createGroup: async (payload) => {
    set({ isCreatingGroup: true });
    try {
      await api.post("/api/groups", payload);
      const { data } = await api.get("/api/groups");
      set({ groups: data.groups ?? [] });
    } finally {
      set({ isCreatingGroup: false });
    }
  },

  setGroups: (groups) => set({ groups }),

  /* ---------- group data ---------- */

  fetchMoreExpenses: async (groupId) => {
    const state = get();
    const currentExpenses = state.expenses[groupId];

    if (!currentExpenses || !currentExpenses.hasMore || state.isFetchingMoreExpenses) return;

    set({ isFetchingMoreExpenses: true });
    try {
      const { data } = await api.get(`/api/groups/${groupId}/expenses`, {
        params: {
          offset: currentExpenses.offset,
          limit: 20
        }
      });

      if (data.expenses) {
        set((s) => ({
          expenses: {
            ...s.expenses,
            [groupId]: {
              items: [...s.expenses[groupId].items, ...data.expenses],
              hasMore: s.expenses[groupId].items.length + data.expenses.length < data.pagination.total,
              offset: s.expenses[groupId].offset + data.expenses.length,
              total: data.pagination.total,
            },
          },
        }));
      }
    } catch (error) {
      toast.error("Failed to load more expenses");
    } finally {
      set({ isFetchingMoreExpenses: false });
    }
  },

  prefetchGroupData: async (groupId: number) => {
    const state = get();
    // If already has data, no need to prefetch aggressively
    if (state.expenses[groupId] && state.members[groupId]) return;

    try {
      const res = await api.get(`/api/groups/${groupId}?full=true`);
      if (res.data?.group) {
        set((s) => {
          const existingGroupIndex = s.groups.findIndex((g) => g.id === groupId);
          const updatedGroups = [...s.groups];
          if (existingGroupIndex >= 0) {
            updatedGroups[existingGroupIndex] = res.data.group;
          } else {
            updatedGroups.push(res.data.group);
          }

          return {
            groups: updatedGroups,
            members: {
              ...s.members,
              ...(res.data.members ? { [groupId]: res.data.members } : {}),
            },
            expenses: {
              ...s.expenses,
              ...(res.data.expenses
                ? {
                    [groupId]: {
                      items: res.data.expenses,
                      hasMore:
                        (res.data.pagination?.total || 0) >
                        res.data.expenses.length,
                      offset: res.data.expenses.length,
                      total:
                        res.data.pagination?.total ||
                        res.data.expenses.length,
                    },
                  }
                : {}),
            },
          };
        });
      }
    } catch {
      // Prefetch fails silently in background
    }
  },

  fetchGroupData: async (groupId, force = false) => {
    const state = get();
    const hasCachedData = Boolean(
      state.expenses[groupId] && state.members[groupId]
    );

    // Only set blocking loading flag if no cached data exists or if forced
    if (!hasCachedData || force) {
      set({ isFetchingGroupData: true });
    }

    try {
      // 1. Try consolidated single-trip endpoint (?full=true)
      try {
        const fullRes = await api.get(`/api/groups/${groupId}?full=true`);
        if (
          fullRes.data?.group &&
          fullRes.data?.members &&
          fullRes.data?.expenses
        ) {
          set((s) => {
            const existingGroupIndex = s.groups.findIndex(
              (g) => g.id === groupId
            );
            const updatedGroups = [...s.groups];
            if (existingGroupIndex >= 0) {
              updatedGroups[existingGroupIndex] = fullRes.data.group;
            } else {
              updatedGroups.push(fullRes.data.group);
            }

            return {
              groups: updatedGroups,
              members: {
                ...s.members,
                [groupId]: fullRes.data.members,
              },
              expenses: {
                ...s.expenses,
                [groupId]: {
                  items: fullRes.data.expenses,
                  hasMore:
                    (fullRes.data.pagination?.total || 0) >
                    fullRes.data.expenses.length,
                  offset: fullRes.data.expenses.length,
                  total:
                    fullRes.data.pagination?.total ||
                    fullRes.data.expenses.length,
                },
              },
            };
          });
          return;
        }
      } catch {
        // Fallback to separate endpoints if full=true failed or mocked
      }

      // 2. Parallel requests fallback
      const [expensesRes, membersRes, groupRes] = await Promise.all([
        api.get(`/api/groups/${groupId}/expenses`),
        api.get(`/api/groups/${groupId}/members`),
        api.get(`/api/groups/${groupId}`),
      ]);

      if (expensesRes.data.expenses) {
        set((s) => ({
          expenses: {
            ...s.expenses,
            [groupId]: {
              items: expensesRes.data.expenses,
              hasMore:
                expensesRes.data.pagination.total >
                expensesRes.data.expenses.length,
              offset: expensesRes.data.expenses.length,
              total: expensesRes.data.pagination.total,
            },
          },
        }));
      }

      if (membersRes.data.members) {
        set((s) => ({
          members: {
            ...s.members,
            [groupId]: membersRes.data.members,
          },
        }));
      }

      if (groupRes.data.group) {
        set((s) => {
          const existingGroupIndex = s.groups.findIndex(
            (g) => g.id === groupId
          );
          const updatedGroups = [...s.groups];

          if (existingGroupIndex >= 0) {
            updatedGroups[existingGroupIndex] = groupRes.data.group;
          } else {
            updatedGroups.push(groupRes.data.group);
          }

          return { groups: updatedGroups };
        });
      }
    } finally {
      set({ isFetchingGroupData: false });
    }
  },

  setExpenses: (groupId, expenses, total) =>
    set((s) => ({
      expenses: {
        ...s.expenses,
        [groupId]: {
          items: expenses,
          hasMore: expenses.length < total,
          offset: expenses.length,
          total
        }
      },
    })),

  setMembers: (groupId, members) =>
    set((s) => ({
      members: { ...s.members, [groupId]: members },
    })),


  createExpense: async (groupId, payload) => {
    set({ isCreatingExpense: true });
    try {
      const { data } = await api.post(`/api/groups/${groupId}/expenses`, payload, {
        headers: {
          "Idempotency-Key": uuidv4(),
        },
      });

      const expense: Expense = data.expense;

      set((s) => {
        const currentGroupExpenses = s.expenses[groupId] || { items: [], hasMore: false, offset: 0, total: 0 };
        return {
          expenses: {
            ...s.expenses,
            [groupId]: {
              ...currentGroupExpenses,
              items: [expense, ...currentGroupExpenses.items],
              total: currentGroupExpenses.total + 1,
              offset: currentGroupExpenses.offset + 1
            },
          },
        };
      });
      await get().fetchBalances(groupId);
    } finally {
      set({ isCreatingExpense: false });
    }
  },

  updateExpense: async (groupId, expenseId, payload) => {
    set({ isUpdatingExpense: true });
    try {
      const { data } = await api.patch(`/api/expenses/${expenseId}`, payload);

      const expense: Expense = data.expense;

      set((s) => {
        const currentGroupExpenses = s.expenses[groupId];
        if (!currentGroupExpenses) return s;

        return {
          expenses: {
            ...s.expenses,
            [groupId]: {
              ...currentGroupExpenses,
              items: currentGroupExpenses.items.map((e) =>
                e.id === expenseId ? expense : e
              ),
            },
          },
        };
      });
      await get().fetchBalances(groupId);
    } finally {
      set({ isUpdatingExpense: false });
    }
  },

  deleteExpense: async (groupId, expenseId) => {
    try {
      await api.delete(`/api/expenses/${expenseId}`);

      set((s) => {
        const currentGroupExpenses = s.expenses[groupId];
        if (!currentGroupExpenses) return s;

        return {
          expenses: {
            ...s.expenses,
            [groupId]: {
              ...currentGroupExpenses,
              items: currentGroupExpenses.items.filter((e) => e.id !== expenseId),
              total: Math.max(0, currentGroupExpenses.total - 1),
              offset: Math.max(0, currentGroupExpenses.offset - 1),
            },
          },
        };
      });
      await get().fetchBalances(groupId);
      toast.success("Expense deleted successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? "Failed to delete expense");
      throw error;
    }
  },
  addMember: async (groupId, email) => {
    set({ isAddingMember: true });
    try {
      const { data } = await api.post(`/api/groups/${groupId}/members`, {
        email,
      });

      if (!data.member) {
        throw new Error("Invalid response");
      }

      set((s) => ({
        members: {
          ...s.members,
          [groupId]: [...(s.members[groupId] ?? []), data.member],
        },
      }));

      toast.success("Member added to this group.");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to add member");
      throw err;
    } finally {
      set({ isAddingMember: false });
    }
  },
  removeMember: async (groupId, memberId) => {
    set({ isRemovingMember: true });
    try {
      const { data } = await api.delete(`/api/groups/${groupId}/members/${memberId}`);
      set((s) => ({
        members: {
          ...s.members,
          [groupId]: (s.members[groupId] ?? []).filter((m) => m.id !== memberId),
        },
      }));
      toast.success(data?.message || "Member removed successfully");
      await get().fetchBalances(groupId);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Failed to remove member";
      toast.error(msg);
      throw err;
    } finally {
      set({ isRemovingMember: false });
    }
  },
}));
