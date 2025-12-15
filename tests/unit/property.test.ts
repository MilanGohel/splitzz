/**
 * Property-Based Tests
 * Randomized testing to ensure invariants hold across many iterations
 */

import { describe, it, expect } from 'bun:test';

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

interface Settlement {
    fromUserId: string;
    toUserId: string;
    amount: number;
}

interface Balance {
    [userId: string]: number;
}

// Pure functions
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

function applySettlements(balances: Balance, settlements: Settlement[]): Balance {
    const result = { ...balances };
    for (const s of settlements) {
        result[s.fromUserId] = (result[s.fromUserId] || 0) + s.amount;
        result[s.toUserId] = (result[s.toUserId] || 0) - s.amount;
    }
    return result;
}

function sumOfBalances(balances: Balance): number {
    return Object.values(balances).reduce((sum, val) => sum + val, 0);
}

// Random generators
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUsers(count: number): string[] {
    return Array.from({ length: count }, (_, i) => `user-${i}`);
}

function generateRandomExpense(id: string, users: string[]): Expense {
    const paidBy = users[randomInt(0, users.length - 1)];
    const participantCount = randomInt(1, users.length);
    const shuffled = [...users].sort(() => Math.random() - 0.5);
    const participants = shuffled.slice(0, participantCount);

    const totalAmount = randomInt(100, 100000); // 1 to 1000 rupees

    // Distribute shares (ensuring sum = total)
    const shares: Share[] = [];
    let remaining = totalAmount;

    for (let i = 0; i < participants.length - 1; i++) {
        const shareAmount = randomInt(1, Math.max(1, Math.floor(remaining / (participants.length - i))));
        shares.push({ userId: participants[i], shareAmount });
        remaining -= shareAmount;
    }
    shares.push({ userId: participants[participants.length - 1], shareAmount: remaining });

    return { id, paidBy, amount: totalAmount, shares };
}

describe('Property-Based Tests', () => {
    describe('Balance Invariant: Sum Always Zero', () => {
        it('sum(balances) === 0 after random expenses (1000 iterations)', () => {
            const iterations = 1000;

            for (let i = 0; i < iterations; i++) {
                const userCount = randomInt(2, 10);
                const users = generateUsers(userCount);
                const expenseCount = randomInt(1, 20);

                const expenses: Expense[] = [];
                for (let j = 0; j < expenseCount; j++) {
                    expenses.push(generateRandomExpense(`exp-${i}-${j}`, users));
                }

                const balances = calculateBalances(expenses, users);
                const sum = sumOfBalances(balances);

                expect(sum).toBe(0);
            }
        });

        it('sum(balances) === 0 with settlements (500 iterations)', () => {
            const iterations = 500;

            for (let i = 0; i < iterations; i++) {
                const users = generateUsers(randomInt(2, 8));
                const expenses: Expense[] = [];

                for (let j = 0; j < randomInt(1, 10); j++) {
                    expenses.push(generateRandomExpense(`exp-${i}-${j}`, users));
                }

                let balances = calculateBalances(expenses, users);

                // Generate random valid settlements
                const settlements: Settlement[] = [];
                for (let s = 0; s < randomInt(0, 5); s++) {
                    const debtors = Object.entries(balances).filter(([_, b]) => b < 0);
                    const creditors = Object.entries(balances).filter(([_, b]) => b > 0);

                    if (debtors.length > 0 && creditors.length > 0) {
                        const [fromId, fromBal] = debtors[randomInt(0, debtors.length - 1)];
                        const [toId, toBal] = creditors[randomInt(0, creditors.length - 1)];
                        const maxAmount = Math.min(Math.abs(fromBal), toBal);

                        if (maxAmount > 0) {
                            const amount = randomInt(1, maxAmount);
                            settlements.push({ fromUserId: fromId, toUserId: toId, amount });
                            balances = applySettlements(balances, [{ fromUserId: fromId, toUserId: toId, amount }]);
                        }
                    }
                }

                expect(sumOfBalances(balances)).toBe(0);
            }
        });
    });

    describe('Expense Shares Sum', () => {
        it('shares always sum to expense amount (1000 iterations)', () => {
            const iterations = 1000;
            const users = generateUsers(5);

            for (let i = 0; i < iterations; i++) {
                const expense = generateRandomExpense(`exp-${i}`, users);
                const sharesSum = expense.shares.reduce((sum, s) => sum + s.shareAmount, 0);

                expect(sharesSum).toBe(expense.amount);
            }
        });
    });

    describe('Integer Arithmetic', () => {
        it('no floating point in balances after any operations', () => {
            const users = generateUsers(5);
            const expenses: Expense[] = [];

            for (let i = 0; i < 100; i++) {
                expenses.push(generateRandomExpense(`exp-${i}`, users));
            }

            const balances = calculateBalances(expenses, users);

            for (const [_, balance] of Object.entries(balances)) {
                expect(Number.isInteger(balance)).toBe(true);
            }
        });
    });
});
