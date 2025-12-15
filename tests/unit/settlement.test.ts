/**
 * Settlement Validation Tests
 * Rules: Settlement from debtor → creditor, cannot exceed debt, no self-settlement
 */

import { describe, it, expect, beforeEach } from 'bun:test';

interface Balance {
    [userId: string]: number;
}

interface SettlementInput {
    fromUserId: string;
    toUserId: string;
    amount: number;
}

type Result<T, E = string> = { success: true; data: T } | { success: false; error: E };

// Pure function to validate settlement
function validateSettlement(
    settlement: SettlementInput,
    balances: Balance,
    groupMemberIds: string[]
): Result<true, string> {
    // Amount must be positive integer
    if (settlement.amount <= 0) {
        return { success: false, error: 'Settlement amount must be greater than 0' };
    }
    if (!Number.isInteger(settlement.amount)) {
        return { success: false, error: 'Settlement amount must be an integer' };
    }

    // No self-settlement
    if (settlement.fromUserId === settlement.toUserId) {
        return { success: false, error: 'Cannot settle with yourself' };
    }

    // Both users must be in group
    if (!groupMemberIds.includes(settlement.fromUserId)) {
        return { success: false, error: 'Payer is not a group member' };
    }
    if (!groupMemberIds.includes(settlement.toUserId)) {
        return { success: false, error: 'Recipient is not a group member' };
    }

    // From user must owe money (negative balance)
    const fromBalance = balances[settlement.fromUserId] || 0;
    if (fromBalance >= 0) {
        return { success: false, error: 'Payer does not owe any money' };
    }

    // To user must be owed money (positive balance)
    const toBalance = balances[settlement.toUserId] || 0;
    if (toBalance <= 0) {
        return { success: false, error: 'Recipient is not owed any money' };
    }

    // Cannot settle more than owed
    const amountOwed = Math.abs(fromBalance);
    if (settlement.amount > amountOwed) {
        return { success: false, error: `Cannot settle more than owed (${amountOwed})` };
    }

    return { success: true, data: true };
}

// Pure function to apply settlement to balances
function applySettlement(balances: Balance, settlement: SettlementInput): Balance {
    const newBalances = { ...balances };
    newBalances[settlement.fromUserId] = (newBalances[settlement.fromUserId] || 0) + settlement.amount;
    newBalances[settlement.toUserId] = (newBalances[settlement.toUserId] || 0) - settlement.amount;
    return newBalances;
}

// Pure function to sum balances
function sumOfBalances(balances: Balance): number {
    return Object.values(balances).reduce((sum, val) => sum + val, 0);
}

describe('Settlement Validation', () => {
    const A = 'user-a', B = 'user-b', C = 'user-c';
    let members: string[];

    beforeEach(() => {
        members = [A, B, C];
    });

    it('prevents settling more than owed', () => {
        const balances: Balance = { [A]: -5000, [B]: 5000 };
        const result = validateSettlement({ fromUserId: A, toUserId: B, amount: 10000 }, balances, members);

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toContain('Cannot settle more than owed');
    });

    it('prevents self-settlement', () => {
        const balances: Balance = { [A]: -5000, [B]: 5000 };
        const result = validateSettlement({ fromUserId: A, toUserId: A, amount: 1000 }, balances, members);

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toBe('Cannot settle with yourself');
    });

    it('accepts valid settlement', () => {
        const balances: Balance = { [A]: -5000, [B]: 5000 };
        const result = validateSettlement({ fromUserId: A, toUserId: B, amount: 3000 }, balances, members);

        expect(result.success).toBe(true);
    });

    it('rejects settlement from user with positive balance', () => {
        const balances: Balance = { [A]: 5000, [B]: -5000 };
        const result = validateSettlement({ fromUserId: A, toUserId: B, amount: 1000 }, balances, members);

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toBe('Payer does not owe any money');
    });

    it('rejects settlement to user with negative balance', () => {
        const balances: Balance = { [A]: -5000, [B]: -2000, [C]: 7000 };
        const result = validateSettlement({ fromUserId: A, toUserId: B, amount: 1000 }, balances, members);

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toBe('Recipient is not owed any money');
    });

    it('rejects non-member settlements', () => {
        const balances: Balance = { [A]: -5000, [B]: 5000 };
        const result = validateSettlement({ fromUserId: 'outsider', toUserId: B, amount: 1000 }, balances, members);

        expect(result.success).toBe(false);
    });
});

describe('Settlement Effect', () => {
    const A = 'user-a', B = 'user-b';

    it('reduces balances correctly after settlement', () => {
        // A owes B 100, A settles 40
        const balances: Balance = { [A]: -10000, [B]: 10000 };
        const newBalances = applySettlement(balances, { fromUserId: A, toUserId: B, amount: 4000 });

        expect(newBalances[A]).toBe(-6000); // A now owes 60
        expect(newBalances[B]).toBe(6000);  // B is owed 60
    });

    it('fully settles debt when amount equals owed', () => {
        const balances: Balance = { [A]: -5000, [B]: 5000 };
        const newBalances = applySettlement(balances, { fromUserId: A, toUserId: B, amount: 5000 });

        expect(newBalances[A]).toBe(0);
        expect(newBalances[B]).toBe(0);
    });
});

describe('Settlement Invariant', () => {
    const A = 'user-a', B = 'user-b', C = 'user-c';

    it('does not change total group balance', () => {
        const balances: Balance = { [A]: -8000, [B]: 5000, [C]: 3000 };
        const originalSum = sumOfBalances(balances);

        const newBalances = applySettlement(balances, { fromUserId: A, toUserId: B, amount: 3000 });

        expect(sumOfBalances(newBalances)).toBe(originalSum);
        expect(sumOfBalances(newBalances)).toBe(0);
    });

    it('maintains zero sum after multiple settlements', () => {
        let balances: Balance = { [A]: -10000, [B]: 6000, [C]: 4000 };

        balances = applySettlement(balances, { fromUserId: A, toUserId: B, amount: 3000 });
        balances = applySettlement(balances, { fromUserId: A, toUserId: C, amount: 2000 });

        expect(sumOfBalances(balances)).toBe(0);
        expect(balances[A]).toBe(-5000);
        expect(balances[B]).toBe(3000);
        expect(balances[C]).toBe(2000);
    });
});
