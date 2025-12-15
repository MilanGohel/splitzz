/**
 * Expense Validation Tests
 * Core invariants: Expense amount > 0, Shares sum = total, Members only
 */

import { describe, it, expect, beforeEach } from 'bun:test';

interface Share {
    userId: string;
    shareAmount: number;
}

interface ExpenseInput {
    paidBy: string;
    amount: number;
    shares: Share[];
}

interface Group {
    id: string;
    memberIds: string[];
}

type ValidationResult = { valid: true } | { valid: false; errors: string[] };

function validateExpense(expense: ExpenseInput, group: Group): ValidationResult {
    const errors: string[] = [];

    if (expense.amount <= 0) errors.push('Expense amount must be greater than 0');
    if (!Number.isInteger(expense.amount)) errors.push('Amount must be integer');
    if (!group.memberIds.includes(expense.paidBy)) errors.push('Payer must be a member');
    if (!expense.shares?.length) errors.push('Must have at least one share');

    const invalidUsers = expense.shares.filter(s => !group.memberIds.includes(s.userId));
    if (invalidUsers.length) errors.push('Share participants must be members');

    const invalidAmounts = expense.shares.filter(s => s.shareAmount <= 0 || !Number.isInteger(s.shareAmount));
    if (invalidAmounts.length) errors.push('Share amounts must be positive integers');

    const sharesSum = expense.shares.reduce((sum, s) => sum + s.shareAmount, 0);
    if (sharesSum !== expense.amount) errors.push(`Shares sum (${sharesSum}) != amount (${expense.amount})`);

    const userIds = expense.shares.map(s => s.userId);
    if (userIds.length !== new Set(userIds).size) errors.push('Duplicate users not allowed');

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

describe('Expense Validation', () => {
    let group: Group;
    const A = 'user-a', B = 'user-b', C = 'user-c', OUTSIDER = 'non-member';

    beforeEach(() => { group = { id: 'g1', memberIds: [A, B, C] }; });

    it('accepts valid expense', () => {
        const result = validateExpense({ paidBy: A, amount: 10000, shares: [{ userId: A, shareAmount: 5000 }, { userId: B, shareAmount: 5000 }] }, group);
        expect(result.valid).toBe(true);
    });

    it('rejects zero amount', () => {
        const result = validateExpense({ paidBy: A, amount: 0, shares: [] }, group);
        expect(result.valid).toBe(false);
    });

    it('rejects negative amount', () => {
        const result = validateExpense({ paidBy: A, amount: -5000, shares: [{ userId: A, shareAmount: -5000 }] }, group);
        expect(result.valid).toBe(false);
    });

    it('rejects floating-point amount', () => {
        const result = validateExpense({ paidBy: A, amount: 100.5, shares: [{ userId: A, shareAmount: 100 }] }, group);
        expect(result.valid).toBe(false);
    });

    it("rejects when shares don't sum to total", () => {
        const result = validateExpense({ paidBy: A, amount: 10000, shares: [{ userId: A, shareAmount: 4000 }, { userId: B, shareAmount: 4000 }] }, group);
        expect(result.valid).toBe(false);
    });

    it('rejects expense with non-member payer', () => {
        const result = validateExpense({ paidBy: OUTSIDER, amount: 5000, shares: [{ userId: A, shareAmount: 5000 }] }, group);
        expect(result.valid).toBe(false);
    });

    it('rejects non-member in shares', () => {
        const result = validateExpense({ paidBy: A, amount: 6000, shares: [{ userId: A, shareAmount: 3000 }, { userId: OUTSIDER, shareAmount: 3000 }] }, group);
        expect(result.valid).toBe(false);
    });

    it('rejects duplicate users in shares', () => {
        const result = validateExpense({ paidBy: A, amount: 6000, shares: [{ userId: A, shareAmount: 3000 }, { userId: A, shareAmount: 3000 }] }, group);
        expect(result.valid).toBe(false);
    });
});
