/**
 * API Contract Tests
 * Tests for API endpoints: Groups, Expenses, Settlements
 */

import { describe, it, expect, beforeEach } from 'bun:test';

// Types
interface ApiResponse<T> {
    status: number;
    body: T | { error: string };
}

interface Group {
    id: string;
    name: string;
    ownerId: string;
    memberIds: string[];
}

interface Expense {
    id: string;
    groupId: string;
    paidBy: string;
    amount: number;
    shares: { userId: string; shareAmount: number }[];
}

interface Settlement {
    id: string;
    groupId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
}

interface Balance {
    [userId: string]: number;
}

// Mock database
let groups: Map<string, Group>;
let expenses: Map<string, Expense>;
let settlements: Map<string, Settlement>;
let idempotencyKeys: Set<string>;

// Mock authenticated user
let currentUserId: string | null;

// Helper: Check auth
function requireAuth(): ApiResponse<never> | null {
    if (!currentUserId) {
        return { status: 401, body: { error: 'Unauthorized' } };
    }
    return null;
}

// Group API handlers
function createGroup(data: { name: string }): ApiResponse<Group> {
    const authError = requireAuth();
    if (authError) return authError;

    if (!data.name?.trim()) {
        return { status: 400, body: { error: 'Name is required' } };
    }

    const group: Group = {
        id: crypto.randomUUID(),
        name: data.name.trim(),
        ownerId: currentUserId!,
        memberIds: [currentUserId!],
    };
    groups.set(group.id, group);
    return { status: 201, body: group };
}

function addMember(groupId: string, data: { userId: string }): ApiResponse<Group> {
    const authError = requireAuth();
    if (authError) return authError;

    const group = groups.get(groupId);
    if (!group) return { status: 404, body: { error: 'Group not found' } };
    if (group.ownerId !== currentUserId) return { status: 403, body: { error: 'Forbidden' } };
    if (group.memberIds.includes(data.userId)) return { status: 400, body: { error: 'Already a member' } };

    group.memberIds.push(data.userId);
    return { status: 200, body: group };
}

function getBalances(groupId: string): ApiResponse<Balance> {
    const authError = requireAuth();
    if (authError) return authError;

    const group = groups.get(groupId);
    if (!group) return { status: 404, body: { error: 'Group not found' } };
    if (!group.memberIds.includes(currentUserId!)) return { status: 403, body: { error: 'Forbidden' } };

    const groupExpenses = Array.from(expenses.values()).filter(e => e.groupId === groupId);
    const groupSettlements = Array.from(settlements.values()).filter(s => s.groupId === groupId);

    const balance: Balance = {};
    for (const id of group.memberIds) balance[id] = 0;

    for (const exp of groupExpenses) {
        balance[exp.paidBy] += exp.amount;
        for (const share of exp.shares) {
            balance[share.userId] -= share.shareAmount;
        }
    }

    for (const s of groupSettlements) {
        balance[s.fromUserId] += s.amount;
        balance[s.toUserId] -= s.amount;
    }

    return { status: 200, body: balance };
}

// Expense API handlers
function createExpense(groupId: string, data: Omit<Expense, 'id' | 'groupId'>, idempotencyKey?: string): ApiResponse<Expense> {
    const authError = requireAuth();
    if (authError) return authError;

    if (idempotencyKey && idempotencyKeys.has(idempotencyKey)) {
        const existing = Array.from(expenses.values()).find(e => e.groupId === groupId);
        if (existing) return { status: 200, body: existing };
    }

    const group = groups.get(groupId);
    if (!group) return { status: 404, body: { error: 'Group not found' } };
    if (!group.memberIds.includes(currentUserId!)) return { status: 403, body: { error: 'Forbidden' } };

    // Validation
    if (!group.memberIds.includes(data.paidBy)) return { status: 400, body: { error: 'Payer not in group' } };
    const sharesSum = data.shares.reduce((s, sh) => s + sh.shareAmount, 0);
    if (sharesSum !== data.amount) return { status: 400, body: { error: 'Shares must sum to amount' } };

    const expense: Expense = { id: crypto.randomUUID(), groupId, ...data };
    expenses.set(expense.id, expense);
    if (idempotencyKey) idempotencyKeys.add(idempotencyKey);

    return { status: 201, body: expense };
}

function getExpenses(groupId: string): ApiResponse<Expense[]> {
    const authError = requireAuth();
    if (authError) return authError;

    const group = groups.get(groupId);
    if (!group) return { status: 404, body: { error: 'Group not found' } };
    if (!group.memberIds.includes(currentUserId!)) return { status: 403, body: { error: 'Forbidden' } };

    const result = Array.from(expenses.values()).filter(e => e.groupId === groupId);
    return { status: 200, body: result };
}

// Settlement API handler
function createSettlement(groupId: string, data: { fromUserId: string; toUserId: string; amount: number }): ApiResponse<Settlement> {
    const authError = requireAuth();
    if (authError) return authError;

    const group = groups.get(groupId);
    if (!group) return { status: 404, body: { error: 'Group not found' } };

    if (data.fromUserId === data.toUserId) return { status: 400, body: { error: 'Cannot self-settle' } };
    if (data.amount <= 0) return { status: 400, body: { error: 'Amount must be positive' } };

    const settlement: Settlement = { id: crypto.randomUUID(), groupId, ...data };
    settlements.set(settlement.id, settlement);
    return { status: 201, body: settlement };
}

describe('API Contract Tests', () => {
    beforeEach(() => {
        groups = new Map();
        expenses = new Map();
        settlements = new Map();
        idempotencyKeys = new Set();
        currentUserId = 'user-1';
    });

    describe('Group API', () => {
        it('POST /groups - creates group', () => {
            const result = createGroup({ name: 'Trip' });
            expect(result.status).toBe(201);
            expect((result.body as Group).name).toBe('Trip');
        });

        it('POST /groups - auth required', () => {
            currentUserId = null;
            const result = createGroup({ name: 'Trip' });
            expect(result.status).toBe(401);
        });

        it('POST /groups - validation', () => {
            const result = createGroup({ name: '' });
            expect(result.status).toBe(400);
        });

        it('POST /groups/:id/members - adds member', () => {
            const group = createGroup({ name: 'Trip' }).body as Group;
            const result = addMember(group.id, { userId: 'user-2' });
            expect(result.status).toBe(200);
            expect((result.body as Group).memberIds).toContain('user-2');
        });

        it('GET /groups/:id/balances - returns balances', () => {
            const group = createGroup({ name: 'Trip' }).body as Group;
            addMember(group.id, { userId: 'user-2' });
            createExpense(group.id, { paidBy: 'user-1', amount: 10000, shares: [{ userId: 'user-1', shareAmount: 5000 }, { userId: 'user-2', shareAmount: 5000 }] });

            const result = getBalances(group.id);
            expect(result.status).toBe(200);
            expect((result.body as Balance)['user-1']).toBe(5000);
            expect((result.body as Balance)['user-2']).toBe(-5000);
        });
    });

    describe('Expense API', () => {
        it('POST /groups/:id/expenses - creates expense', () => {
            const group = createGroup({ name: 'Trip' }).body as Group;
            const result = createExpense(group.id, { paidBy: 'user-1', amount: 5000, shares: [{ userId: 'user-1', shareAmount: 5000 }] });
            expect(result.status).toBe(201);
        });

        it('POST /groups/:id/expenses - idempotent', () => {
            const group = createGroup({ name: 'Trip' }).body as Group;
            const data = { paidBy: 'user-1', amount: 5000, shares: [{ userId: 'user-1', shareAmount: 5000 }] };

            createExpense(group.id, data, 'key-1');
            createExpense(group.id, data, 'key-1');

            const result = getExpenses(group.id);
            expect((result.body as Expense[]).length).toBe(1);
        });

        it('GET /groups/:id/expenses - returns expenses', () => {
            const group = createGroup({ name: 'Trip' }).body as Group;
            createExpense(group.id, { paidBy: 'user-1', amount: 5000, shares: [{ userId: 'user-1', shareAmount: 5000 }] });

            const result = getExpenses(group.id);
            expect(result.status).toBe(200);
            expect((result.body as Expense[]).length).toBe(1);
        });
    });

    describe('Settlement API', () => {
        it('POST /groups/:id/settlements - creates settlement', () => {
            const group = createGroup({ name: 'Trip' }).body as Group;
            addMember(group.id, { userId: 'user-2' });

            const result = createSettlement(group.id, { fromUserId: 'user-2', toUserId: 'user-1', amount: 5000 });
            expect(result.status).toBe(201);
        });

        it('POST /groups/:id/settlements - rejects self-settle', () => {
            const group = createGroup({ name: 'Trip' }).body as Group;
            const result = createSettlement(group.id, { fromUserId: 'user-1', toUserId: 'user-1', amount: 1000 });
            expect(result.status).toBe(400);
        });
    });
});
