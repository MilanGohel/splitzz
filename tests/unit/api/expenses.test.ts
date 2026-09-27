/**
 * Expenses API Unit Tests (Fully Mocked)
 * 
 * Tests for:
 * - GET /api/groups/[groupId]/expenses
 * - POST /api/groups/[groupId]/expenses
 * - GET /api/expenses/[expenseId]
 * - DELETE /api/expenses/[expenseId]
 */

import { NextResponse } from 'next/server';

// Mock database BEFORE imports
jest.mock('@/db/schema', () => {
    const mockDb = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn(),
        delete: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        query: {
            groupMember: { findFirst: jest.fn(), findMany: jest.fn() },
            group: { findFirst: jest.fn() },
            expense: { findFirst: jest.fn(), findMany: jest.fn() },
            user: { findFirst: jest.fn() },
            idempotencyKey: { findFirst: jest.fn() },
        },
        transaction: jest.fn(),
    };

    return {
        db: mockDb,
        expense: { id: 'id', groupId: 'group_id', paidBy: 'paid_by', totalAmount: 'total_amount', createdAt: 'created_at', category: 'category', updatedAt: 'updated_at' },
        expenseShare: { expenseId: 'expense_id', userId: 'user_id' },
        group: { id: 'id', ownerId: 'owner_id', currency: 'currency' },
        groupMember: { groupId: 'group_id', userId: 'user_id' },
        idempotencyKey: { key: 'key' },
        activity: {},
        user: { id: 'id' },
    };
});

jest.mock('@/utils/auth', () => ({
    auth: { api: { getSession: jest.fn() } },
}));

jest.mock('next/headers', () => ({
    headers: jest.fn().mockResolvedValue(new Headers()),
}));

jest.mock('@/lib/auth/scope', () => ({
    resolveGroupScope: jest.fn(),
    isGroupMember: jest.fn(),
}));

import { GET, POST } from '@/app/api/groups/[groupId]/expenses/route';
import { GET as GETExpense, DELETE as DELETEExpense, PATCH as PATCHExpense } from '@/app/api/expenses/[expenseId]/route';
import { auth } from '@/utils/auth';
import { db } from '@/db/schema';
import { resolveGroupScope, isGroupMember } from '@/lib/auth/scope';

const mockGetSession = auth.api.getSession as unknown as jest.Mock;
const mockDb = db as jest.Mocked<typeof db>;
const mockResolveGroupScope = resolveGroupScope as jest.Mock;
const mockIsGroupMember = isGroupMember as jest.Mock;

describe('Expenses API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolveGroupScope.mockResolvedValue({
            ok: true,
            user: { id: 'user-1', name: 'User 1', email: 'user1@example.com' },
            group: { id: 1, name: 'Group 1', ownerId: 'user-1', simplifyDebts: false },
            role: 'owner',
        });
        mockIsGroupMember.mockResolvedValue(true);

        (mockDb.select as jest.Mock).mockReturnThis();
        (mockDb.from as jest.Mock).mockReturnThis();
        (mockDb.where as jest.Mock).mockReturnThis();
        (mockDb.limit as jest.Mock).mockResolvedValue([{ userId: 'user-1', groupId: 1 }]);
        (mockDb.orderBy as jest.Mock).mockReturnThis();
        (mockDb.offset as jest.Mock).mockReturnThis();
        (mockDb.insert as jest.Mock).mockReturnThis();
        (mockDb.values as jest.Mock).mockReturnThis();
        (mockDb.delete as jest.Mock).mockReturnThis();
        (mockDb.update as jest.Mock).mockReturnThis();
        (mockDb.set as jest.Mock).mockReturnThis();
    });

    describe('GET /api/groups/[groupId]/expenses', () => {
        it('returns 401 when not authenticated', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
            });

            const request = new Request('http://localhost/api/groups/1/expenses');
            const response = await GET(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(401);
        });

        it('returns 403 when user is not a group member', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 }),
            });

            const request = new Request('http://localhost/api/groups/1/expenses');
            const response = await GET(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(403);
        });

        it('returns expenses when authorized', async () => {
            (mockDb.query.expense.findMany as jest.Mock).mockResolvedValueOnce([
                { id: 1, description: 'Dinner', totalAmount: 10000 },
            ]);
            ((mockDb as any).where as jest.Mock).mockResolvedValueOnce([{ count: 1 }]);

            const request = new Request('http://localhost/api/groups/1/expenses');
            const response = await GET(request, { params: Promise.resolve({ groupId: '1' }) });
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
            shares: [{ userId: 'user-1', shareAmount: 50 }, { userId: 'user-2', shareAmount: 50 }],
        };

        it('returns 400 for invalid input', async () => {
            const request = new Request('http://localhost/api/groups/1/expenses', {
                method: 'POST',
                body: JSON.stringify({ description: 'Test' }), // Missing required fields
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(400);
        });

        it('returns 400 when shares do not equal total', async () => {
            ((mockDb as any).where as jest.Mock).mockResolvedValueOnce([
                { userId: 'user-1' }, { userId: 'user-2' },
            ]);

            const request = new Request('http://localhost/api/groups/1/expenses', {
                method: 'POST',
                body: JSON.stringify({
                    ...validExpense,
                    shares: [{ userId: 'user-1', shareAmount: 30 }, { userId: 'user-2', shareAmount: 30 }],
                }),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(400);
        });

        it('returns 404 when group not found', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'Group not found' }, { status: 404 }),
            });

            const request = new Request('http://localhost/api/groups/1/expenses', {
                method: 'POST',
                body: JSON.stringify(validExpense),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(404);
        });

        it('creates expense successfully', async () => {
            const insertedExpense = { id: 1, groupId: 1, ...validExpense, totalAmount: 10000 };
            const insertedShares = [
                { id: 1, expenseId: 1, userId: 'user-1', shareAmount: 5000 },
                { id: 2, expenseId: 1, userId: 'user-2', shareAmount: 5000 },
            ];

            ((mockDb as any).where as jest.Mock).mockResolvedValueOnce([
                { userId: 'user-1' }, { userId: 'user-2' },
            ]);

            (mockDb.transaction as jest.Mock).mockImplementationOnce(async (callback) => {
                const tx = {
                    insert: jest.fn().mockReturnValue({
                        values: jest.fn().mockReturnValue({
                            returning: jest.fn()
                                .mockResolvedValueOnce([insertedExpense])
                                .mockResolvedValueOnce(insertedShares),
                        }),
                    }),
                    update: jest.fn().mockReturnValue({
                        set: jest.fn().mockReturnValue({
                            where: jest.fn().mockResolvedValueOnce([]),
                        }),
                    }),
                    query: {
                        expense: {
                            findFirst: jest.fn().mockResolvedValueOnce({
                                ...insertedExpense,
                                paidBy: { id: 'user-1', name: 'User 1' },
                                shares: insertedShares,
                            }),
                        },
                    },
                };
                return callback(tx);
            });

            const request = new Request('http://localhost/api/groups/1/expenses', {
                method: 'POST',
                body: JSON.stringify(validExpense),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(201);
        });

        it('creates expense with category successfully', async () => {
            const expenseWithCategory = { ...validExpense, category: 'food' };
            const insertedExpense = { id: 1, groupId: 1, ...expenseWithCategory, totalAmount: 10000 };
            const insertedShares = [
                { id: 1, expenseId: 1, userId: 'user-1', shareAmount: 5000 },
                { id: 2, expenseId: 1, userId: 'user-2', shareAmount: 5000 },
            ];

            ((mockDb as any).where as jest.Mock).mockResolvedValueOnce([
                { userId: 'user-1' }, { userId: 'user-2' },
            ]);

            (mockDb.transaction as jest.Mock).mockImplementationOnce(async (callback) => {
                const tx = {
                    insert: jest.fn().mockReturnValue({
                        values: jest.fn().mockReturnValue({
                            returning: jest.fn()
                                .mockResolvedValueOnce([insertedExpense])
                                .mockResolvedValueOnce(insertedShares),
                        }),
                    }),
                    update: jest.fn().mockReturnValue({
                        set: jest.fn().mockReturnValue({
                            where: jest.fn().mockResolvedValueOnce([]),
                        }),
                    }),
                    query: {
                        expense: {
                            findFirst: jest.fn().mockResolvedValueOnce({
                                ...insertedExpense,
                                paidBy: { id: 'user-1', name: 'User 1' },
                                shares: insertedShares,
                            }),
                        },
                    },
                };
                return callback(tx);
            });

            const request = new Request('http://localhost/api/groups/1/expenses', {
                method: 'POST',
                body: JSON.stringify(expenseWithCategory),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: '1' }) });
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.expense.category).toBe('food');
        });
    });

    describe('GET /api/expenses/[expenseId]', () => {
        it('returns 401 when not authenticated', async () => {
            mockGetSession.mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/expenses/1');
            const response = await GETExpense(request, { params: Promise.resolve({ expenseId: '1' }) });

            expect(response.status).toBe(401);
        });

        it('returns 404 when expense not found', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            (mockDb.query.expense.findFirst as jest.Mock).mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/expenses/1');
            const response = await GETExpense(request, { params: Promise.resolve({ expenseId: '1' }) });

            expect(response.status).toBe(404);
        });

        it('returns 403 when user is not group member', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            (mockDb.query.expense.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1, groupId: 1 });
            ((mockDb as any).limit as jest.Mock).mockResolvedValueOnce([]); // Not a member

            const request = new Request('http://localhost/api/expenses/1');
            const response = await GETExpense(request, { params: Promise.resolve({ expenseId: '1' }) });

            expect(response.status).toBe(403);
        });

        it('returns expense details when authorized', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            (mockDb.query.expense.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1, groupId: 1, totalAmount: 10000 });
            ((mockDb as any).limit as jest.Mock).mockResolvedValueOnce([{ userId: 'user-1' }]); // Is member
            ((mockDb as any).where as jest.Mock)
                .mockReturnValueOnce(mockDb)
                .mockResolvedValueOnce([
                    { userId: 'user-1', shareAmount: 5000 },
                ]);

            const request = new Request('http://localhost/api/expenses/1');
            const response = await GETExpense(request, { params: Promise.resolve({ expenseId: '1' }) });
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
            const response = await DELETEExpense(request, { params: Promise.resolve({ expenseId: '1' }) });

            expect(response.status).toBe(401);
        });

        it('returns 403 when user is not payer or owner', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-3' } }); // Different user
            ((mockDb as any).limit as jest.Mock)
                .mockResolvedValueOnce([{ id: 1, groupId: 1, paidBy: 'user-1' }]) // Expense
                .mockResolvedValueOnce([{ id: 1, ownerId: 'user-2' }]); // Group owner

            const request = new Request('http://localhost/api/expenses/1', { method: 'DELETE' });
            const response = await DELETEExpense(request, { params: Promise.resolve({ expenseId: '1' }) });

            expect(response.status).toBe(403);
        });

        it('allows payer to delete expense', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            ((mockDb as any).limit as jest.Mock)
                .mockResolvedValueOnce([{ id: 1, groupId: 1, paidBy: 'user-1', description: 'Dinner', totalAmount: 10000 }])
                .mockResolvedValueOnce([{ id: 1, ownerId: 'user-2' }]);
            ((mockDb as any).returning as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);

            const request = new Request('http://localhost/api/expenses/1', { method: 'DELETE' });
            const response = await DELETEExpense(request, { params: Promise.resolve({ expenseId: '1' }) });

            expect(response.status).toBe(200);
        });
    });

    describe('PATCH /api/expenses/[expenseId]', () => {
        const updatePayload = {
            description: 'Updated Dinner',
            totalAmount: 100,
            paidBy: 'user-1',
            category: 'food',
            shares: [{ userId: 'user-1', shareAmount: 50 }, { userId: 'user-2', shareAmount: 50 }],
        };

        it('returns 401 when not authenticated', async () => {
            mockGetSession.mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/expenses/1', {
                method: 'PATCH',
                body: JSON.stringify(updatePayload),
            });
            const response = await PATCHExpense(request, { params: Promise.resolve({ expenseId: '1' }) });

            expect(response.status).toBe(401);
        });

        it('updates expense and category successfully', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            ((mockDb as any).limit as jest.Mock)
                .mockResolvedValueOnce([{ id: 1, groupId: 1, paidBy: 'user-1', createdAt: new Date() }])
                .mockResolvedValueOnce([{ id: 1, ownerId: 'user-1' }]);

            const updatedExpense = { id: 1, description: 'Updated Dinner', totalAmount: 10000, category: 'food' };
            const txUpdate = {
                set: jest.fn(),
                where: jest.fn(),
                returning: jest.fn().mockResolvedValue([updatedExpense]),
            };
            txUpdate.set.mockReturnValue(txUpdate);
            txUpdate.where.mockReturnValue(txUpdate);

            ((mockDb as any).transaction as jest.Mock).mockImplementationOnce(async (fn: any) => {
                return fn({
                    update: jest.fn().mockReturnValue(txUpdate),
                    delete: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
                    insert: jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue([]) }),
                    query: {
                        expense: { findFirst: jest.fn().mockResolvedValue(updatedExpense) },
                    },
                });
            });

            const request = new Request('http://localhost/api/expenses/1', {
                method: 'PATCH',
                body: JSON.stringify(updatePayload),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await PATCHExpense(request, { params: Promise.resolve({ expenseId: '1' }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.expense.category).toBe('food');
        });
    });
});
