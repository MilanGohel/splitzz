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

import { useGroupStore, Expense } from '@/lib/stores/group-store';
import { toast } from 'sonner';

describe('useGroupStore - Reactive Synchronization & Expense Deletion', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset store state
        useGroupStore.setState({
            groups: [],
            expenses: {},
            members: {},
            balances: [],
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

    it('deleteExpense calls DELETE endpoint, removes expense, decrements total, fetches balances and shows toast', async () => {
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
        mockInstance.get.mockResolvedValueOnce({ data: { balances: [{ userId: 'user-1', amount: 0, currency: 'INR', name: 'Alice', image: null }] } });

        await useGroupStore.getState().deleteExpense(groupId, mockExpense.id);

        expect(mockInstance.delete).toHaveBeenCalledWith('/api/expenses/101');
        const state = useGroupStore.getState();
        expect(state.expenses[groupId].items).toHaveLength(0);
        expect(state.expenses[groupId].total).toBe(0);
        expect(mockInstance.get).toHaveBeenCalledWith('/api/groups/1/balances');
        expect(toast.success).toHaveBeenCalledWith('Expense deleted successfully');
    });

    it('createExpense creates expense and triggers fetchBalances', async () => {
        const groupId = 1;
        mockInstance.post.mockResolvedValueOnce({ data: { expense: mockExpense } });
        mockInstance.get.mockResolvedValueOnce({ data: { balances: [] } });

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
    });

    it('updateExpense updates expense and triggers fetchBalances', async () => {
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
        mockInstance.get.mockResolvedValueOnce({ data: { balances: [] } });

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
    });
});
