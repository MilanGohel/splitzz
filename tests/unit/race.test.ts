/**
 * Race Condition / Concurrency Tests
 * Tests for duplicate prevention and concurrent operation safety
 */

import { describe, it, expect, beforeEach } from 'bun:test';

interface Expense {
    id: string;
    paidBy: string;
    amount: number;
    shares: { userId: string; shareAmount: number }[];
    idempotencyKey?: string;
}

interface Balance {
    [userId: string]: number;
}

interface OperationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// Simulates an expense store with idempotency
class ExpenseStore {
    private expenses: Map<string, Expense> = new Map();
    private idempotencyKeys: Set<string> = new Set();

    addExpense(expense: Expense): OperationResult<Expense> {
        // Check idempotency key
        if (expense.idempotencyKey && this.idempotencyKeys.has(expense.idempotencyKey)) {
            // Return existing expense (idempotent)
            const existing = Array.from(this.expenses.values()).find(
                e => e.idempotencyKey === expense.idempotencyKey
            );
            return { success: true, data: existing };
        }

        // Check for duplicate ID
        if (this.expenses.has(expense.id)) {
            return { success: false, error: 'Expense already exists' };
        }

        this.expenses.set(expense.id, expense);
        if (expense.idempotencyKey) {
            this.idempotencyKeys.add(expense.idempotencyKey);
        }

        return { success: true, data: expense };
    }

    getExpenses(): Expense[] {
        return Array.from(this.expenses.values());
    }

    getExpenseCount(): number {
        return this.expenses.size;
    }
}

// Pure function to calculate balances
function calculateBalances(expenses: Expense[], memberIds: string[]): Balance {
    const balance: Balance = {};
    for (const id of memberIds) balance[id] = 0;

    for (const expense of expenses) {
        balance[expense.paidBy] = (balance[expense.paidBy] || 0) + expense.amount;
        for (const share of expense.shares) {
            balance[share.userId] = (balance[share.userId] || 0) - share.shareAmount;
        }
    }

    return balance;
}

function sumOfBalances(balances: Balance): number {
    return Object.values(balances).reduce((sum, val) => sum + val, 0);
}

describe('Concurrency & Idempotency Tests', () => {
    const A = 'user-a', B = 'user-b', C = 'user-c';
    const members = [A, B, C];
    let store: ExpenseStore;

    beforeEach(() => {
        store = new ExpenseStore();
    });

    describe('Duplicate Prevention', () => {
        it('prevents duplicate expense with same ID', () => {
            const expense: Expense = {
                id: 'exp-1',
                paidBy: A,
                amount: 10000,
                shares: [{ userId: A, shareAmount: 5000 }, { userId: B, shareAmount: 5000 }],
            };

            const first = store.addExpense(expense);
            const second = store.addExpense(expense);

            expect(first.success).toBe(true);
            expect(second.success).toBe(false);
            expect(store.getExpenseCount()).toBe(1);
        });

        it('allows different expenses with different IDs', () => {
            const exp1: Expense = { id: 'exp-1', paidBy: A, amount: 5000, shares: [{ userId: A, shareAmount: 5000 }] };
            const exp2: Expense = { id: 'exp-2', paidBy: B, amount: 3000, shares: [{ userId: B, shareAmount: 3000 }] };

            store.addExpense(exp1);
            store.addExpense(exp2);

            expect(store.getExpenseCount()).toBe(2);
        });
    });

    describe('Idempotency', () => {
        it('retry same request twice returns same result (idempotent)', () => {
            const expense: Expense = {
                id: 'exp-1',
                paidBy: A,
                amount: 10000,
                shares: [{ userId: A, shareAmount: 5000 }, { userId: B, shareAmount: 5000 }],
                idempotencyKey: 'idem-key-123',
            };

            const first = store.addExpense(expense);

            // Simulate retry with new ID but same idempotency key
            const retry: Expense = { ...expense, id: 'exp-2' };
            const second = store.addExpense(retry);

            expect(first.success).toBe(true);
            expect(second.success).toBe(true);
            expect(second.data?.id).toBe('exp-1'); // Returns original
            expect(store.getExpenseCount()).toBe(1);
        });

        it('different idempotency keys create separate expenses', () => {
            const exp1: Expense = {
                id: 'exp-1', paidBy: A, amount: 5000,
                shares: [{ userId: A, shareAmount: 5000 }],
                idempotencyKey: 'key-1',
            };
            const exp2: Expense = {
                id: 'exp-2', paidBy: A, amount: 5000,
                shares: [{ userId: A, shareAmount: 5000 }],
                idempotencyKey: 'key-2',
            };

            store.addExpense(exp1);
            store.addExpense(exp2);

            expect(store.getExpenseCount()).toBe(2);
        });
    });

    describe('Concurrent Operations Consistency', () => {
        it('maintains balance consistency after multiple simultaneous-like adds', () => {
            // Simulate multiple expenses added in quick succession
            const expenses: Expense[] = [
                { id: 'e1', paidBy: A, amount: 10000, shares: [{ userId: A, shareAmount: 5000 }, { userId: B, shareAmount: 5000 }] },
                { id: 'e2', paidBy: B, amount: 6000, shares: [{ userId: B, shareAmount: 3000 }, { userId: C, shareAmount: 3000 }] },
                { id: 'e3', paidBy: C, amount: 9000, shares: [{ userId: A, shareAmount: 3000 }, { userId: B, shareAmount: 3000 }, { userId: C, shareAmount: 3000 }] },
            ];

            for (const exp of expenses) {
                store.addExpense(exp);
            }

            const balances = calculateBalances(store.getExpenses(), members);
            expect(sumOfBalances(balances)).toBe(0);
        });

        it('no duplicate records after repeated requests with idempotency', () => {
            const expense: Expense = {
                id: 'exp-1',
                paidBy: A,
                amount: 10000,
                shares: [{ userId: A, shareAmount: 5000 }, { userId: B, shareAmount: 5000 }],
                idempotencyKey: 'unique-key',
            };

            // Simulate 5 retry attempts
            for (let i = 0; i < 5; i++) {
                store.addExpense({ ...expense, id: `exp-${i}` });
            }

            expect(store.getExpenseCount()).toBe(1);

            const balances = calculateBalances(store.getExpenses(), members);
            expect(balances[A]).toBe(5000);
            expect(balances[B]).toBe(-5000);
            expect(sumOfBalances(balances)).toBe(0);
        });
    });
});
