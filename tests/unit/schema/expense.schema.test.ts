/**
 * Expense Schema Validation Tests
 * 
 * Tests for lib/zod/expense.ts - expenseInsertSchema
 * Validates expense creation input:
 * - description: string, max 255 chars
 * - totalAmount: positive integer
 * - paidBy: non-empty string (user ID)
 * - shares: array of { userId, amount } with positive amounts
 */

import { expenseInsertSchema } from '@/lib/zod/expense';

describe('expenseInsertSchema', () => {
    const validExpense = {
        description: 'Dinner at restaurant',
        totalAmount: 3000,
        paidBy: 'user-123',
        shares: [
            { userId: 'user-123', amount: 1500 },
            { userId: 'user-456', amount: 1500 },
        ],
    };

    describe('Valid Inputs', () => {
        it('accepts valid expense with all fields', () => {
            const result = expenseInsertSchema.safeParse(validExpense);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.description).toBe('Dinner at restaurant');
                expect(result.data.totalAmount).toBe(3000);
                expect(result.data.paidBy).toBe('user-123');
                expect(result.data.shares).toHaveLength(2);
            }
        });

        it('accepts expense with empty description', () => {
            const input = { ...validExpense, description: '' };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
        });

        it('accepts expense with single share', () => {
            const input = {
                ...validExpense,
                totalAmount: 1000,
                shares: [{ userId: 'user-123', amount: 1000 }],
            };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
        });

        it('accepts expense with many shares', () => {
            const input = {
                ...validExpense,
                totalAmount: 5000,
                shares: [
                    { userId: 'user-1', amount: 1000 },
                    { userId: 'user-2', amount: 1000 },
                    { userId: 'user-3', amount: 1000 },
                    { userId: 'user-4', amount: 1000 },
                    { userId: 'user-5', amount: 1000 },
                ],
            };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
        });

        it('accepts minimum valid amount (1)', () => {
            const input = {
                ...validExpense,
                totalAmount: 1,
                shares: [{ userId: 'user-123', amount: 1 }],
            };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
        });
    });

    describe('Invalid Inputs - Amount Validation', () => {
        it('rejects zero totalAmount', () => {
            const input = { ...validExpense, totalAmount: 0 };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });

        it('rejects negative totalAmount', () => {
            const input = { ...validExpense, totalAmount: -100 };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });

        it('rejects zero share amount', () => {
            const input = {
                ...validExpense,
                shares: [{ userId: 'user-123', amount: 0 }],
            };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });

        it('rejects negative share amount', () => {
            const input = {
                ...validExpense,
                shares: [{ userId: 'user-123', amount: -500 }],
            };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });
    });

    describe('Invalid Inputs - paidBy Validation', () => {
        it('rejects empty paidBy', () => {
            const input = { ...validExpense, paidBy: '' };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });

        it('rejects missing paidBy', () => {
            const { paidBy, ...inputWithoutPaidBy } = validExpense;
            const result = expenseInsertSchema.safeParse(inputWithoutPaidBy);

            expect(result.success).toBe(false);
        });

        it('rejects null paidBy', () => {
            const input = { ...validExpense, paidBy: null };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });
    });

    describe('Invalid Inputs - Shares Validation', () => {
        it('rejects empty userId in shares', () => {
            const input = {
                ...validExpense,
                shares: [{ userId: '', amount: 1000 }],
            };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });

        it('rejects missing userId in shares', () => {
            const input = {
                ...validExpense,
                shares: [{ amount: 1000 }],
            };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });

        it('rejects missing amount in shares', () => {
            const input = {
                ...validExpense,
                shares: [{ userId: 'user-123' }],
            };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });

        it('rejects string amount in shares', () => {
            const input = {
                ...validExpense,
                shares: [{ userId: 'user-123', amount: '1000' }],
            };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });
    });

    describe('Invalid Inputs - Description Validation', () => {
        it('rejects description too long (256 chars)', () => {
            const input = { ...validExpense, description: 'A'.repeat(256) };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        it('handles very large amounts', () => {
            const input = {
                ...validExpense,
                totalAmount: 10000000, // 100,000.00
                shares: [{ userId: 'user-123', amount: 10000000 }],
            };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
        });

        it('handles unicode in description', () => {
            const input = { ...validExpense, description: 'रात का खाना 🍽️' };
            const result = expenseInsertSchema.safeParse(input);

            expect(result.success).toBe(true);
        });
    });
});
