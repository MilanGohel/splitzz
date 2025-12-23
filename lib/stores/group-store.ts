import { create } from "zustand";
import axios from "axios";
import { toast } from "sonner";

/* =======================
   Types
======================= */

export type Group = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
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
  id: string;
  description: string;
  totalAmount: number;
  paidBy: Member;
  shares: Share[];
  createdAt: string;
};

interface GroupState {
  groups: Group[];
  expenses: Record<string, Expense[]>;
  members: Record<string, Member[]>;
  isLoading: boolean;

  fetchGroups: () => Promise<void>;
  fetchGroupData: (groupId: string) => Promise<void>;

  setGroups: (groups: Group[]) => void;
  setExpenses: (groupId: string, expenses: Expense[]) => void;
  setMembers: (groupId: string, members: Member[]) => void;

  createGroup: (data: {
    name: string;
    description?: string | null;
  }) => Promise<void>;

  createExpense: (
    groupId: string,
    data: {
      description: string;
      totalAmount: number;
      paidBy: string;
      shares: Share[];
    }
  ) => Promise<void>;

  updateExpense: (
    groupId: string,
    expenseId: string,
    data: {
      description: string;
      totalAmount: number;
      paidBy: string;
      shares: Share[];
    }
  ) => Promise<void>;

  addMember: (groupId: string, email: string) => Promise<void>;
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

export const useGroupStore = create<GroupState>((set) => ({
  groups: [],
  expenses: {},
  members: {},
  isLoading: false,

  /* ---------- groups ---------- */

  fetchGroups: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get("/api/groups");
      set({ groups: data.groups ?? [] });
    } finally {
      set({ isLoading: false });
    }
  },

  createGroup: async (payload) => {
    await api.post("/api/groups", payload);
    const { data } = await api.get("/api/groups");
    set({ groups: data.groups ?? [] });
  },

  setGroups: (groups) => set({ groups }),

  /* ---------- group data ---------- */

  fetchGroupData: async (groupId) => {
    set({ isLoading: true });
    try {
      const [expensesRes, membersRes] = await Promise.all([
        api.get(`/api/groups/${groupId}/expenses`),
        api.get(`/api/groups/${groupId}/members`),
      ]);

      if (expensesRes.data.expenses) {
        set((s) => ({
          expenses: {
            ...s.expenses,
            [groupId]: expensesRes.data.expenses,
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
    } finally {
      set({ isLoading: false });
    }
  },

  setExpenses: (groupId, expenses) =>
    set((s) => ({
      expenses: { ...s.expenses, [groupId]: expenses },
    })),

  setMembers: (groupId, members) =>
    set((s) => ({
      members: { ...s.members, [groupId]: members },
    })),

  /* ---------- expenses ---------- */

  createExpense: async (groupId, payload) => {
    const { data } = await api.post(`/api/groups/${groupId}/expenses`, payload);

    const expense: Expense = data.expense;

    set((s) => ({
      expenses: {
        ...s.expenses,
        [groupId]: [expense, ...(s.expenses[groupId] ?? [])],
      },
    }));
  },

  updateExpense: async (groupId, expenseId, payload) => {
    const { data } = await api.patch(`/api/expenses/${expenseId}`, payload);

    const expense: Expense = data.expense;

    set((s) => ({
      expenses: {
        ...s.expenses,
        [groupId]: s.expenses[groupId].map((e) =>
          e.id === expenseId ? expense : e
        ),
      },
    }));
  },
  addMember: async (groupId, email) => {
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
    }
  },
}));
