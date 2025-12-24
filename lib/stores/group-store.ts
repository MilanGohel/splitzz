import { create } from "zustand";
import axios from "axios";
import { toast } from "sonner";

/* =======================
   Types
======================= */

export type Group = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  simplifyDebts: boolean;
};

export type Member = {
  id: string;
  name: string;
  email: string;
};

export type Share = {
  userId: string;
  shareAmount: number;
};

export type Expense = {
  id: number;
  description: string;
  totalAmount: number;
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
  isFetchingBalances: boolean;
  isFetchingMoreExpenses: boolean;

  fetchBalances: (groupId: number) => Promise<void>;
  fetchGroups: () => Promise<void>;
  fetchGroupData: (groupId: number) => Promise<void>;
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
    }
  ) => Promise<void>;

  addMember: (groupId: number, email: string) => Promise<void>;
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

  fetchGroupData: async (groupId) => {
    set({ isFetchingGroupData: true });
    try {
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
              hasMore: expensesRes.data.pagination.total > expensesRes.data.expenses.length,
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

      // Update or add the current group to the groups array
      if (groupRes.data.group) {
        set((s) => {
          const existingGroupIndex = s.groups.findIndex((g) => g.id === groupId);
          const updatedGroups = [...s.groups];

          if (existingGroupIndex >= 0) {
            // Update existing group
            updatedGroups[existingGroupIndex] = groupRes.data.group;
          } else {
            // Add new group
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

  /* ---------- expenses ---------- */

  createExpense: async (groupId, payload) => {
    set({ isCreatingExpense: true });
    try {
      const { data } = await api.post(`/api/groups/${groupId}/expenses`, payload);

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
    } finally {
      set({ isUpdatingExpense: false });
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
}));
