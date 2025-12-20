import { create } from 'zustand'
import { authClient } from "@/utils/auth-client"

export type Group = {
    id: string
    name: string
    description: string | null
    createdAt: string
}

export type LoggedInUser = {
    id: string
    name: string
    email: string
}

export type Expense = {
    id: string
    description: string
    totalAmount: number
    paidBy: Member
    createdAt: string
}

export type Member = {
    id: string
    name: string
    email: string
}

interface AppState {
    groups: Group[]
    expenses: Record<string, Expense[]> // groupId -> expenses
    members: Record<string, Member[]>   // groupId -> members
    isLoading: boolean
    loggedInUser: LoggedInUser
    isLoggedIn: boolean

    setLoggedInUser: (user: LoggedInUser) => void
    resetLoggedInUser: () => void
    fetchUser: () => Promise<void>

    // Actions
    setGroups: (groups: Group[]) => void
    addGroup: (group: Group) => void

    setExpenses: (groupId: string, expenses: Expense[]) => void
    addExpense: (groupId: string, expense: Expense) => void

    setMembers: (groupId: string, members: Member[]) => void

    fetchGroups: () => Promise<void>
    fetchGroupData: (groupId: string) => Promise<void>

    createGroup: (group: { name: string; description?: string | null }) => Promise<void>
    createExpense: (groupId: string, expense: { description: string; totalAmount: number; paidBy: string; shares: Array<{ userId: string; amount: number }> }) => Promise<void>

    addMember: (groupId: string, email: string) => Promise<void>
    updateExpense: (groupId: string, expenseId: string, expense: { description: string; totalAmount: number; paidBy: string; shares: Array<{ userId: string; amount: number }> }) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
    groups: [],
    expenses: {},
    members: {},
    isLoading: false,
    isLoggedIn: false,
    loggedInUser: { id: "", email: "", name: "" },

    setLoggedInUser: (user) => set({ loggedInUser: user, isLoggedIn: true }),
    resetLoggedInUser: () => set({ loggedInUser: { id: "", email: "", name: "" }, isLoggedIn: false }),

    fetchUser: async () => {
        try {
            const { data } = await authClient.getSession()
            if (data?.user) {
                set({
                    loggedInUser: {
                        id: data.user.id,
                        name: data.user.name,
                        email: data.user.email
                    },
                    isLoggedIn: true
                })
            } else {
                get().resetLoggedInUser()
            }
        } catch (error) {
            console.error("Failed to fetch user session", error)
            get().resetLoggedInUser()
        }
    },

    setGroups: (groups) => set({ groups }),
    addGroup: (group) => set((state) => ({ groups: [group, ...state.groups] })),

    setExpenses: (groupId, expenses) => set((state) => ({
        expenses: { ...state.expenses, [groupId]: expenses }
    })),
    addExpense: (groupId, expense) => set((state) => ({
        expenses: {
            ...state.expenses,
            [groupId]: [expense, ...(state.expenses[groupId] || [])]
        }
    })),

    setMembers: (groupId, members) => set((state) => ({
        members: { ...state.members, [groupId]: members }
    })),

    fetchGroups: async () => {
        set({ isLoading: true })
        try {
            const res = await fetch("/api/groups")
            if (res.ok) {
                const data = await res.json()
                set({ groups: data.groups || [] })
            }
        } catch (error) {
            console.error("Failed to fetch groups", error)
        } finally {
            set({ isLoading: false })
        }
    },

    fetchGroupData: async (groupId) => {
        // We can fetch parallel
        // Fetch Expenses
        const fetchExpenses = fetch(`/api/groups/${groupId}/expenses`).then(res => res.json())
        // Fetch Members
        const fetchMembers = fetch(`/api/groups/${groupId}/members`).then(res => res.json())

        try {
            const [expensesData, membersData] = await Promise.all([fetchExpenses, fetchMembers])

            if (expensesData.expenses) {
                get().setExpenses(groupId, expensesData.expenses)
            }
            if (membersData.members) {
                get().setMembers(groupId, membersData.members)
            }
        } catch (error) {
            console.error("Failed to fetch group data", error)
        }
    },
    createGroup: async (groupData) => {
        try {
            const res = await fetch("/api/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(groupData),
            })

            if (!res.ok) throw new Error("Failed to create group")

            const data = await res.json()
            if (data.group) {
                get().addGroup(data.group)
            }
        } catch (error) {
            console.error("Failed to create group", error)
            throw error
        }
    },

    createExpense: async (groupId, expenseData) => {
        try {
            const res = await fetch(`/api/groups/${groupId}/expenses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(expenseData),
            })

            if (!res.ok) throw new Error("Failed to create expense")

            const data = await res.json()
            if (data.expense) {
                get().addExpense(groupId, data.expense)
            }
        } catch (error) {
            console.error("Failed to create expense", error)
            throw error
        }
    },

    addMember: async (groupId, email) => {
        try {
            const res = await fetch(`/api/groups/${groupId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to add member")
            }

            // Reload members for the group to get the full member object (name, id, image)
            // Or simpler: just force a fetch of group data or members
            const fetchMembers = await fetch(`/api/groups/${groupId}/members`)
            if (fetchMembers.ok) {
                const data = await fetchMembers.json()
                if (data.members) {
                    get().setMembers(groupId, data.members)
                }
            }

        } catch (error) {
            console.error("Failed to add member", error)
            throw error;
        }
    },

    updateExpense: async (groupId, expenseId, expenseData) => {
        try {
            const res = await fetch(`/api/expenses/${expenseId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(expenseData),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to update expense")
            }

            // For now, reloading group data is safest to ensure balances/shares are all correct
            await get().fetchGroupData(groupId)

        } catch (error) {
            console.error("Failed to update expense", error)
            throw error
        }
    }
}))
