jest.mock('uuid', () => ({
    v4: () => 'mocked-uuid-1234',
}));

const mockInstance = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
};

jest.mock('axios', () => {
    return {
        __esModule: true,
        default: {
            create: jest.fn(() => mockInstance),
        },
        create: jest.fn(() => mockInstance),
    };
});

jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

import { useGroupStore, Expense, SuggestedSettlement } from '@/lib/stores/group-store';
import { toast } from 'sonner';

describe('useGroupStore - Reactive Synchronization, Settlements & Expense Management', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockInstance.get.mockImplementation(async (url: string) => {
            if (url.includes('/balances')) {
                return { data: { balances: [] } };
            }
            if (url.includes('/debts')) {
                return { data: { debts: [] } };
            }
            return { data: {} };
        });
        // Reset store state
        useGroupStore.setState({
            groups: [],
            expenses: {},
            members: {},
            balances: [],
            suggestedSettlements: {},
            error: null,
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
            isFetchingSettlements: false,
            isSettlingDebt: false,
        });
    });

    const mockExpense: Expense = {
        id: 101,
        description: 'Team Lunch',
        totalAmount: 5000,
        category: 'food',
        paidBy: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
        shares: [
            { userId: 'user-1', shareAmount: 2500 },
            { userId: 'user-2', shareAmount: 2500 },
        ],
        createdAt: new Date().toISOString(),
    };

    const mockSettlement: SuggestedSettlement = {
        other_user_id: 'user-2',
        other_user_name: 'Bob',
        other_user_image: null,
        amount: 2500,
        type: 'RECEIVABLE',
    };

    it('deleteExpense calls DELETE endpoint, removes expense, decrements total, revalidates balances & settlements, and shows toast', async () => {
        const groupId = 1;
        useGroupStore.setState({
            expenses: {
                [groupId]: {
                    items: [mockExpense],
                    hasMore: false,
                    offset: 1,
                    total: 1,
                },
            },
        });

        mockInstance.delete.mockResolvedValueOnce({ data: { message: 'Expense deleted successfully' } });

        await useGroupStore.getState().deleteExpense(groupId, mockExpense.id);

        expect(mockInstance.delete).toHaveBeenCalledWith('/api/expenses/101');
        const state = useGroupStore.getState();
        expect(state.expenses[groupId].items).toHaveLength(0);
        expect(state.expenses[groupId].total).toBe(0);
        expect(mockInstance.get).toHaveBeenCalledWith('/api/groups/1/balances');
        expect(mockInstance.get).toHaveBeenCalledWith('/api/groups/1/debts');
        expect(toast.success).toHaveBeenCalledWith('Expense deleted successfully');
    });

    it('createExpense creates expense and triggers fetchBalances and fetchSuggestedSettlements', async () => {
        const groupId = 1;
        mockInstance.post.mockResolvedValueOnce({ data: { expense: mockExpense } });

        await useGroupStore.getState().createExpense(groupId, {
            description: mockExpense.description,
            totalAmount: mockExpense.totalAmount / 100,
            paidBy: mockExpense.paidBy.id,
            shares: mockExpense.shares,
            category: 'food',
        });

        const state = useGroupStore.getState();
        expect(state.expenses[groupId].items).toContainEqual(mockExpense);
        expect(mockInstance.get).toHaveBeenCalledWith('/api/groups/1/balances');
        expect(mockInstance.get).toHaveBeenCalledWith('/api/groups/1/debts');
    });

    it('updateExpense updates expense and triggers fetchBalances and fetchSuggestedSettlements', async () => {
        const groupId = 1;
        useGroupStore.setState({
            expenses: {
                [groupId]: {
                    items: [mockExpense],
                    hasMore: false,
                    offset: 1,
                    total: 1,
                },
            },
        });

        const updatedExpense = { ...mockExpense, description: 'Updated Lunch', category: 'food' };
        mockInstance.patch.mockResolvedValueOnce({ data: { expense: updatedExpense } });

        await useGroupStore.getState().updateExpense(groupId, mockExpense.id, {
            description: updatedExpense.description,
            totalAmount: updatedExpense.totalAmount / 100,
            paidBy: updatedExpense.paidBy.id,
            shares: updatedExpense.shares,
            category: 'food',
        });

        const state = useGroupStore.getState();
        expect(state.expenses[groupId].items[0].description).toBe('Updated Lunch');
        expect(mockInstance.get).toHaveBeenCalledWith('/api/groups/1/balances');
        expect(mockInstance.get).toHaveBeenCalledWith('/api/groups/1/debts');
    });

    it('removeMember calls DELETE endpoint, removes member, revalidates balances & settlements, and shows toast', async () => {
        const groupId = 1;
        const mockMember = { id: 'user-2', name: 'Bob', email: 'bob@example.com' };
        useGroupStore.setState({
            members: {
                [groupId]: [mockMember],
            },
        });

        mockInstance.delete.mockResolvedValueOnce({ data: { message: 'Member removed successfully' } });

        await useGroupStore.getState().removeMember(groupId, 'user-2');

        expect(mockInstance.delete).toHaveBeenCalledWith('/api/groups/1/members/user-2');
        const state = useGroupStore.getState();
        expect(state.members[groupId]).toHaveLength(0);
        expect(mockInstance.get).toHaveBeenCalledWith('/api/groups/1/balances');
        expect(mockInstance.get).toHaveBeenCalledWith('/api/groups/1/debts');
        expect(toast.success).toHaveBeenCalledWith('Member removed successfully');
    });

    it('fetchSuggestedSettlements loads settlements into per-group store state', async () => {
        const groupId = 1;
        mockInstance.get.mockImplementation(async (url: string) => {
            if (url === '/api/groups/1/debts') {
                return { data: { debts: [mockSettlement] } };
            }
            return { data: {} };
        });

        await useGroupStore.getState().fetchSuggestedSettlements(groupId);

        const state = useGroupStore.getState();
        expect(state.suggestedSettlements[groupId]).toEqual([mockSettlement]);
        expect(state.isFetchingSettlements).toBe(false);
    });

    it('settleDebt optimistically removes settlement item, calls API with Idempotency-Key, and revalidates', async () => {
        const groupId = 1;
        useGroupStore.setState({
            suggestedSettlements: {
                [groupId]: [mockSettlement],
            },
        });

        mockInstance.post.mockResolvedValueOnce({ data: { success: true } });

        const settlePromise = useGroupStore.getState().settleDebt(groupId, {
            fromUserId: 'user-1',
            toUserId: 'user-2',
            amount: 2500,
        });

        // Verify optimistic update took effect
        expect(useGroupStore.getState().suggestedSettlements[groupId]).toHaveLength(0);

        await settlePromise;

        expect(mockInstance.post).toHaveBeenCalledWith(
            '/api/groups/1/settlements',
            { fromUserId: 'user-1', toUserId: 'user-2', amount: 2500 },
            { headers: { 'Idempotency-Key': 'mocked-uuid-1234' } }
        );
        expect(toast.success).toHaveBeenCalledWith('Settlement recorded successfully');
        expect(mockInstance.get).toHaveBeenCalledWith('/api/groups/1/debts');
        expect(mockInstance.get).toHaveBeenCalledWith('/api/groups/1/balances');
    });

    it('settleDebt rolls back optimistic update when API call fails', async () => {
        const groupId = 1;
        useGroupStore.setState({
            suggestedSettlements: {
                [groupId]: [mockSettlement],
            },
        });

        const errorResponse = {
            response: { data: { error: 'Network error recording settlement' } },
        };
        mockInstance.post.mockRejectedValueOnce(errorResponse);

        await expect(
            useGroupStore.getState().settleDebt(groupId, {
                fromUserId: 'user-1',
                toUserId: 'user-2',
                amount: 2500,
            })
        ).rejects.toEqual(errorResponse);

        // State rolled back to original settlement
        const state = useGroupStore.getState();
        expect(state.suggestedSettlements[groupId]).toEqual([mockSettlement]);
        expect(toast.error).toHaveBeenCalledWith('Network error recording settlement');
        expect(state.error).toBe('Network error recording settlement');
        expect(state.isSettlingDebt).toBe(false);
    });
});
