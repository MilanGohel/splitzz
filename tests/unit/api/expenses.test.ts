/**
 * Expenses API Unit Tests (Fully Mocked)
 * 
 * Tests for:
 * - GET /api/groups/[groupId]/expenses
 * - POST /api/groups/[groupId]/expenses
 * - GET /api/expenses/[expenseId]
 * - DELETE /api/expenses/[expenseId]
 */

// Mock database BEFORE imports
jest.mock('@/db/schema', () => {
    const mockDb = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn(),
        delete: jest.fn().mockReturnThis(),
        query: {
            groupMember: { findFirst: jest.fn(), findMany: jest.fn() },
            group: { findFirst: jest.fn() },
            expense: { findFirst: jest.fn() },
        },
        transaction: jest.fn(),
    };

    return {
        db: mockDb,
        expense: { id: 'id', groupId: 'group_id', paidBy: 'paid_by', totalAmount: 'total_amount' },
        expenseShare: { expenseId: 'expense_id', userId: 'user_id' },
        group: { id: 'id' },
        groupMember: { groupId: 'group_id', userId: 'user_id' },
        idempotencyKey: {},
    };
});

jest.mock('@/utils/auth', () => ({
    auth: { api: { getSession: jest.fn() } },
}));

jest.mock('next/headers', () => ({
    headers: jest.fn().mockResolvedValue(new Headers()),
}));

jest.mock('@/lib/helpers/checks', () => ({
    isGroupMember: jest.fn(),
}));

import { GET, POST } from '@/app/api/groups/[groupId]/expenses/route';
import { GET as GETExpense, DELETE as DELETEExpense } from '@/app/api/expenses/[expenseId]/route';
import { auth } from '@/utils/auth';
import { db } from '@/db/schema';
import { isGroupMember } from '@/lib/helpers/checks';

const mockGetSession = auth.api.getSession as unknown as jest.Mock;
const mockDb = db as jest.Mocked<typeof db>;
const mockIsGroupMember = isGroupMember as jest.Mock;

describe('Expenses API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/groups/[groupId]/expenses', () => {
        it('returns 401 when not authenticated', async () => {
            mockGetSession.mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/groups/1/expenses');
            const response = await GET(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(401);
        });

        it('returns 403 when user is not a group member', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            mockIsGroupMember.mockResolvedValueOnce(false);

            const request = new Request('http://localhost/api/groups/1/expenses');
            const response = await GET(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(403);
        });

        it('returns expenses when authorized', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            mockIsGroupMember.mockResolvedValueOnce(true);
            ((mockDb as any).orderBy as jest.Mock).mockResolvedValueOnce([
                { id: 1, description: 'Dinner', totalAmount: 10000 },
            ]);

            const request = new Request('http://localhost/api/groups/1/expenses');
            const response = await GET(request, { params: Promise.resolve({ groupId: 1 }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.expenses).toHaveLength(1);
        });
    });

    describe('POST /api/groups/[groupId]/expenses', () => {
        const validExpense = {
            description: 'Dinner',
            totalAmount: 100,
            paidBy: 'user-1',
            shares: [{ userId: 'user-1', amount: 50 }, { userId: 'user-2', amount: 50 }],
        };

        it('returns 400 for invalid input', async () => {
            const request = new Request('http://localhost/api/groups/1/expenses', {
                method: 'POST',
                body: JSON.stringify({ description: 'Test' }), // Missing required fields
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(400);
        });

        it('returns 400 when shares do not equal total', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            ((mockDb as any).where as jest.Mock).mockResolvedValueOnce([
                { userId: 'user-1' }, { userId: 'user-2' },
            ]);

            const request = new Request('http://localhost/api/groups/1/expenses', {
                method: 'POST',
                body: JSON.stringify({
                    ...validExpense,
                    shares: [{ userId: 'user-1', amount: 30 }, { userId: 'user-2', amount: 30 }],
                }),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(400);
        });

        it('returns 404 when group not found', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            ((mockDb as any).where as jest.Mock).mockResolvedValueOnce([
                { userId: 'user-1' }, { userId: 'user-2' },
            ]);
            ((mockDb as any).limit as jest.Mock).mockResolvedValueOnce([]); // No group found

            const request = new Request('http://localhost/api/groups/1/expenses', {
                method: 'POST',
                body: JSON.stringify(validExpense),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(404);
        });

        it('creates expense successfully', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            ((mockDb as any).where as jest.Mock).mockResolvedValueOnce([
                { userId: 'user-1' }, { userId: 'user-2' },
            ]);
            ((mockDb as any).limit as jest.Mock).mockResolvedValueOnce([{ id: 1, name: 'Test Group' }]);
            ((mockDb as any).transaction as jest.Mock).mockImplementationOnce(async (fn) => {
                const mockExpense = { id: 1, description: 'Dinner', totalAmount: 10000 };
                return fn({
                    insert: jest.fn().mockReturnThis(),
                    values: jest.fn().mockReturnThis(),
                    returning: jest.fn().mockResolvedValue([mockExpense]),
                    onConflictDoNothing: jest.fn().mockReturnThis(),
                });
            });

            const request = new Request('http://localhost/api/groups/1/expenses', {
                method: 'POST',
                body: JSON.stringify(validExpense),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(201);
        });
    });

    describe('GET /api/expenses/[expenseId]', () => {
        it('returns 401 when not authenticated', async () => {
            mockGetSession.mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/expenses/1');
            const response = await GETExpense(request, { params: Promise.resolve({ expenseId: 1 }) });

            expect(response.status).toBe(401);
        });

        it('returns 404 when expense not found', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            ((mockDb as any).limit as jest.Mock).mockResolvedValueOnce([]);

            const request = new Request('http://localhost/api/expenses/1');
            const response = await GETExpense(request, { params: Promise.resolve({ expenseId: 1 }) });

            expect(response.status).toBe(404);
        });

        it('returns 403 when user is not group member', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            ((mockDb as any).limit as jest.Mock)
                .mockResolvedValueOnce([{ id: 1, groupId: 1 }]) // Expense found
                .mockResolvedValueOnce([]); // Not a member

            const request = new Request('http://localhost/api/expenses/1');
            const response = await GETExpense(request, { params: Promise.resolve({ expenseId: 1 }) });

            expect(response.status).toBe(403);
        });

        it('returns expense details when authorized', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            ((mockDb as any).limit as jest.Mock)
                .mockResolvedValueOnce([{ id: 1, groupId: 1, description: 'Dinner' }])
                .mockResolvedValueOnce([{ userId: 'user-1' }]); // Is member
            ((mockDb as any).where as jest.Mock).mockResolvedValueOnce([
                { userId: 'user-1', shareAmount: 5000 },
            ]);

            const request = new Request('http://localhost/api/expenses/1');
            const response = await GETExpense(request, { params: Promise.resolve({ expenseId: 1 }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.expense).toBeDefined();
            expect(data.expenseShares).toBeDefined();
        });
    });

    describe('DELETE /api/expenses/[expenseId]', () => {
        it('returns 401 when not authenticated', async () => {
            mockGetSession.mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/expenses/1', { method: 'DELETE' });
            const response = await DELETEExpense(request, { params: Promise.resolve({ expenseId: 1 }) });

            expect(response.status).toBe(401);
        });

        it('returns 403 when user is not payer or owner', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-3' } }); // Different user
            ((mockDb as any).limit as jest.Mock)
                .mockResolvedValueOnce([{ id: 1, groupId: 1, paidBy: 'user-1' }]) // Expense
                .mockResolvedValueOnce([{ id: 1, ownerId: 'user-2' }]); // Group owner

            const request = new Request('http://localhost/api/expenses/1', { method: 'DELETE' });
            const response = await DELETEExpense(request, { params: Promise.resolve({ expenseId: 1 }) });

            expect(response.status).toBe(403);
        });

        it('allows payer to delete expense', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            ((mockDb as any).limit as jest.Mock)
                .mockResolvedValueOnce([{ id: 1, groupId: 1, paidBy: 'user-1' }])
                .mockResolvedValueOnce([{ id: 1, ownerId: 'user-2' }]);
            ((mockDb as any).returning as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);

            const request = new Request('http://localhost/api/expenses/1', { method: 'DELETE' });
            const response = await DELETEExpense(request, { params: Promise.resolve({ expenseId: 1 }) });

            expect(response.status).toBe(200);
        });
    });
});
