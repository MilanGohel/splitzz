/**
 * Balance Calculation Tests (CRITICAL)
 * Core invariant: Sum of balances in a group = 0
 * All amounts in paise (smallest currency unit)
 */

import { describe, it, expect, beforeEach } from 'bun:test';

interface Share {
    userId: string;
    shareAmount: number;
}

interface Expense {
    id: string;
    paidBy: string;
    amount: number;
    shares: Share[];
}

interface Balance {
    [userId: string]: number; // Positive = owed money, Negative = owes money
}

// Pure function to calculate balance from single expense
function calculateExpenseEffect(expense: Expense): Balance {
    const balance: Balance = {};

    // Payer gets credit for full amount
    balance[expense.paidBy] = (balance[expense.paidBy] || 0) + expense.amount;

    // Each share participant owes their share
    for (const share of expense.shares) {
        balance[share.userId] = (balance[share.userId] || 0) - share.shareAmount;
    }

    return balance;
}

// Pure function to calculate balances from multiple expenses
function calculateGroupBalances(expenses: Expense[], memberIds: string[]): Balance {
    const balance: Balance = {};

    // Initialize all members with 0 balance
    for (const memberId of memberIds) {
        balance[memberId] = 0;
    }

    // Apply each expense
    for (const expense of expenses) {
        const effect = calculateExpenseEffect(expense);
        for (const [userId, amount] of Object.entries(effect)) {
            balance[userId] = (balance[userId] || 0) + amount;
        }
    }

    return balance;
}

// Pure function to verify balance invariant
function sumOfBalances(balances: Balance): number {
    return Object.values(balances).reduce((sum, val) => sum + val, 0);
}

describe('Balance Calculation', () => {
    const A = 'user-a', B = 'user-b', C = 'user-c', D = 'user-d';

    describe('Simple Case - Equal Split', () => {
        it('splits equally between two users', () => {
            // A pays 100, A and B split equally
            const expense: Expense = {
                id: 'exp-1',
                paidBy: A,
                amount: 10000, // ₹100 in paise
                shares: [
                    { userId: A, shareAmount: 5000 },
                    { userId: B, shareAmount: 5000 },
                ],
            };

            const balances = calculateGroupBalances([expense], [A, B]);

            expect(balances[A]).toBe(5000);  // A is owed ₹50
            expect(balances[B]).toBe(-5000); // B owes ₹50
            expect(sumOfBalances(balances)).toBe(0);
        });
    });

    describe('Unequal Split', () => {
        it('handles unequal three-way split', () => {
            // A pays 300, split A=100, B=100, C=100
            const expense: Expense = {
                id: 'exp-1',
                paidBy: A,
                amount: 30000,
                shares: [
                    { userId: A, shareAmount: 10000 },
                    { userId: B, shareAmount: 10000 },
                    { userId: C, shareAmount: 10000 },
                ],
            };

            const balances = calculateGroupBalances([expense], [A, B, C]);

            expect(balances[A]).toBe(20000);  // A is owed ₹200
            expect(balances[B]).toBe(-10000); // B owes ₹100
            expect(balances[C]).toBe(-10000); // C owes ₹100
            expect(sumOfBalances(balances)).toBe(0);
        });
    });

    describe('Partial Participation (k of n)', () => {
        it('ignores non-participants in expense', () => {
            // Group: A, B, C, D
            // Expense: 200 paid by A, shared by A and B only
            const expense: Expense = {
                id: 'exp-1',
                paidBy: A,
                amount: 20000,
                shares: [
                    { userId: A, shareAmount: 10000 },
                    { userId: B, shareAmount: 10000 },
                ],
            };

            const balances = calculateGroupBalances([expense], [A, B, C, D]);

            expect(balances[A]).toBe(10000);  // A is owed ₹100
            expect(balances[B]).toBe(-10000); // B owes ₹100
            expect(balances[C]).toBe(0);      // C not involved
            expect(balances[D]).toBe(0);      // D not involved
            expect(sumOfBalances(balances)).toBe(0);
        });
    });

    describe('Multiple Expenses Accumulation', () => {
        it('accumulates balances from multiple expenses', () => {
            // Expense 1: A pays 100 for A, B
            // Expense 2: B pays 60 for B, C
            const expenses: Expense[] = [
                {
                    id: 'exp-1',
                    paidBy: A,
                    amount: 10000,
                    shares: [
                        { userId: A, shareAmount: 5000 },
                        { userId: B, shareAmount: 5000 },
                    ],
                },
                {
                    id: 'exp-2',
                    paidBy: B,
                    amount: 6000,
                    shares: [
                        { userId: B, shareAmount: 3000 },
                        { userId: C, shareAmount: 3000 },
                    ],
                },
            ];

            const balances = calculateGroupBalances(expenses, [A, B, C]);

            expect(balances[A]).toBe(5000);   // A: +50
            expect(balances[B]).toBe(-2000);  // B: -50+60-30 = -20
            expect(balances[C]).toBe(-3000);  // C: -30
            expect(sumOfBalances(balances)).toBe(0);
        });
    });

    describe('Sum Invariant', () => {
        it('ensures sum of balances is zero', () => {
            const expenses: Expense[] = [
                { id: 'e1', paidBy: A, amount: 15000, shares: [{ userId: A, shareAmount: 5000 }, { userId: B, shareAmount: 5000 }, { userId: C, shareAmount: 5000 }] },
                { id: 'e2', paidBy: B, amount: 9000, shares: [{ userId: A, shareAmount: 3000 }, { userId: B, shareAmount: 3000 }, { userId: C, shareAmount: 3000 }] },
                { id: 'e3', paidBy: C, amount: 6000, shares: [{ userId: A, shareAmount: 2000 }, { userId: B, shareAmount: 2000 }, { userId: C, shareAmount: 2000 }] },
            ];

            const balances = calculateGroupBalances(expenses, [A, B, C]);
            expect(sumOfBalances(balances)).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        it('handles payer paying for themselves only', () => {
            const expense: Expense = {
                id: 'exp-1',
                paidBy: A,
                amount: 5000,
                shares: [{ userId: A, shareAmount: 5000 }],
            };

            const balances = calculateGroupBalances([expense], [A, B]);
            expect(balances[A]).toBe(0);
            expect(balances[B]).toBe(0);
            expect(sumOfBalances(balances)).toBe(0);
        });

        it('handles single large expense', () => {
            const expense: Expense = {
                id: 'exp-1',
                paidBy: A,
                amount: 1000000, // ₹10,000
                shares: [
                    { userId: A, shareAmount: 250000 },
                    { userId: B, shareAmount: 250000 },
                    { userId: C, shareAmount: 250000 },
                    { userId: D, shareAmount: 250000 },
                ],
            };

            const balances = calculateGroupBalances([expense], [A, B, C, D]);
            expect(balances[A]).toBe(750000);
            expect(balances[B]).toBe(-250000);
            expect(balances[C]).toBe(-250000);
            expect(balances[D]).toBe(-250000);
            expect(sumOfBalances(balances)).toBe(0);
        });
    });
});
